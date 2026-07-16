import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApiRequest } from "@/lib/api-security";
import { logAudit } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/supabase-server";

const idPattern = /^[a-z0-9_-]{8,160}$/i;
const monthPattern = /^\d{4}-(?:0[1-9]|1[0-2])$/;
const rowSchema = z.object({
  id: z.string().min(1).max(128),
  month: z.string().regex(monthPattern),
  energyKwh: z.coerce.number().finite().positive().max(100_000_000),
  totalCostThb: z.coerce.number().finite().nonnegative().max(1_000_000_000),
  authority: z.enum(["PEA", "MEA"]),
  meterMode: z.enum(["normal", "tou"]),
});
const workspaceSchema = z
  .object({
    audience: z.enum(["home", "shop", "business"]),
    mode: z.literal("user"),
    rows: z.array(rowSchema).min(1).max(120),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((workspace, context) => {
    const seen = new Set<string>();
    workspace.rows.forEach((row, index) => {
      const key = `${row.authority}-${row.meterMode}-${row.month}`;
      if (seen.has(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate bill month for the same meter.",
          path: ["rows", index, "month"],
        });
      }
      seen.add(key);
    });
  });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!idPattern.test(id)) return notFound();

  try {
    const project = await prisma.site.findFirst({
      where: { id, organization: { is: { ownerId: auth.user.id } } },
      select: {
        customerSegment: true,
        meters: {
          select: {
            authority: true,
            mode: true,
            bills: { orderBy: { billMonth: "asc" } },
          },
        },
      },
    });
    if (!project) return notFound();

    const bills = project.meters.flatMap((meter) =>
      meter.bills.map((bill) => {
        const metadata =
          bill.rawBillData && typeof bill.rawBillData === "object"
            ? (bill.rawBillData as Record<string, unknown>)
            : {};
        return {
          id:
            typeof metadata.rowId === "string"
              ? metadata.rowId
              : `server-${bill.id}`,
          month: bill.billMonth.toISOString().slice(0, 7),
          energyKwh: bill.energyKwh.toString(),
          totalCostThb: bill.totalCostThb.toString(),
          authority: meter.authority,
          meterMode: meter.mode === "TOU" ? ("tou" as const) : ("normal" as const),
          updatedAt: bill.updatedAt,
        };
      }),
    );
    if (bills.length === 0) {
      return NextResponse.json({ ok: true, workspace: null });
    }
    const latest = bills.reduce(
      (value, bill) => (bill.updatedAt > value ? bill.updatedAt : value),
      bills[0]!.updatedAt,
    );
    const audience =
      project.customerSegment === "RESIDENTIAL"
        ? "home"
        : project.customerSegment === "SMALL_BUSINESS"
          ? "shop"
          : "business";
    return NextResponse.json({
      ok: true,
      workspace: {
        audience,
        mode: "user",
        rows: bills
          .sort((a, b) => a.month.localeCompare(b.month))
          .map((bill) => ({
            id: bill.id,
            month: bill.month,
            energyKwh: bill.energyKwh,
            totalCostThb: bill.totalCostThb,
            authority: bill.authority,
            meterMode: bill.meterMode,
          })),
        updatedAt: latest.toISOString(),
      },
    });
  } catch {
    return databaseUnavailable();
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = guardApiRequest(request, {
    bucket: "project-bills-write",
    limit: 10,
    windowMs: 60_000,
  });
  if (blocked) return blocked;
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;
  if (!isTrustedOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: "Untrusted request origin." },
      { status: 403 },
    );
  }
  const { id } = await params;
  if (!idPattern.test(id)) return notFound();
  const parsed = workspaceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid bill workspace payload." },
      { status: 400 },
    );
  }

  try {
    const project = await prisma.site.findFirst({
      where: { id, organization: { is: { ownerId: auth.user.id } } },
      select: { id: true },
    });
    if (!project) return notFound();

    await prisma.$transaction(async (tx) => {
      await tx.electricityBill.deleteMany({
        where: { meter: { is: { siteId: id } } },
      });
      const groups = new Map<string, typeof parsed.data.rows>();
      for (const row of parsed.data.rows) {
        const key = `${row.authority}-${row.meterMode}`;
        groups.set(key, [...(groups.get(key) ?? []), row]);
      }
      for (const rows of groups.values()) {
        const first = rows[0]!;
        const meter = await tx.meter.upsert({
          where: {
            siteId_name: {
              siteId: id,
              name: `บิล ${first.authority} ${first.meterMode === "tou" ? "TOU" : "ปกติ"}`,
            },
          },
          create: {
            siteId: id,
            name: `บิล ${first.authority} ${first.meterMode === "tou" ? "TOU" : "ปกติ"}`,
            authority: first.authority,
            mode: first.meterMode === "tou" ? "TOU" : "NORMAL",
          },
          update: {
            authority: first.authority,
            mode: first.meterMode === "tou" ? "TOU" : "NORMAL",
          },
          select: { id: true },
        });
        await tx.electricityBill.createMany({
          data: rows.map((row) => ({
            meterId: meter.id,
            billMonth: new Date(`${row.month}-01T00:00:00.000Z`),
            energyKwh: row.energyKwh,
            totalCostThb: row.totalCostThb,
            rawBillData: {
              rowId: row.id,
              audience: parsed.data.audience,
              workspaceMode: parsed.data.mode,
              syncedAt: new Date().toISOString(),
            },
          })),
        });
      }
    });
    await logAudit(prisma, {
      action: "project_bills_synced",
      entityType: "Site",
      entityId: id,
      after: { billCount: parsed.data.rows.length },
      userId: auth.user.id,
    });
    return NextResponse.json({ ok: true, billCount: parsed.data.rows.length });
  } catch {
    return databaseUnavailable();
  }
}

function notFound() {
  return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
}

function databaseUnavailable() {
  return NextResponse.json(
    { ok: false, error: "Database is not available." },
    { status: 503 },
  );
}

function isTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
