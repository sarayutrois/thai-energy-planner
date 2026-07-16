import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApiRequest } from "@/lib/api-security";
import { logAudit } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/supabase-server";

const idPattern = /^[a-z0-9_-]{8,160}$/i;
const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    province: z.string().trim().max(120).nullable().optional(),
    customerSegment: z
      .enum([
        "RESIDENTIAL",
        "SMALL_BUSINESS",
        "MEDIUM_BUSINESS",
        "LARGE_BUSINESS",
      ])
      .optional(),
    authority: z.enum(["PEA", "MEA"]).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = guardApiRequest(request, {
    bucket: "project-update",
    limit: 20,
    windowMs: 60_000,
  });
  if (blocked) return blocked;
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!idPattern.test(id)) return notFound();
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid project payload." },
      { status: 400 },
    );
  }

  try {
    const existing = await findOwnedProject(id, auth.user.id);
    if (!existing) return notFound();
    const project = await prisma.site.update({
      where: { id },
      data: {
        ...(parsed.data.name === undefined ? {} : { name: parsed.data.name }),
        ...(parsed.data.province === undefined
          ? {}
          : { province: parsed.data.province }),
        ...(parsed.data.customerSegment === undefined
          ? {}
          : { customerSegment: parsed.data.customerSegment }),
        ...(parsed.data.authority === undefined
          ? {}
          : { authority: parsed.data.authority }),
      },
      select: {
        id: true,
        name: true,
        province: true,
        customerSegment: true,
        authority: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    await logAudit(prisma, {
      action: "project_updated",
      entityType: "Site",
      entityId: id,
      before: existing,
      after: project,
      userId: auth.user.id,
    });
    return NextResponse.json({ ok: true, project });
  } catch {
    return databaseUnavailable();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = guardApiRequest(request, {
    bucket: "project-delete",
    limit: 10,
    windowMs: 60_000,
  });
  if (blocked) return blocked;
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!idPattern.test(id)) return notFound();

  try {
    const existing = await findOwnedProject(id, auth.user.id);
    if (!existing) return notFound();
    await prisma.site.delete({ where: { id } });
    await logAudit(prisma, {
      action: "project_deleted",
      entityType: "Site",
      entityId: id,
      before: existing,
      userId: auth.user.id,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return databaseUnavailable();
  }
}

function findOwnedProject(id: string, userId: string) {
  return prisma.site.findFirst({
    where: { id, organization: { is: { ownerId: userId } } },
    select: { id: true, name: true, province: true, updatedAt: true },
  });
}

function notFound() {
  return NextResponse.json(
    { ok: false, error: "Project not found." },
    { status: 404 },
  );
}

function databaseUnavailable() {
  return NextResponse.json(
    { ok: false, error: "Database is not available." },
    { status: 503 },
  );
}
