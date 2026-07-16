import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApiRequest } from "@/lib/api-security";
import { logAudit } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/supabase-server";

const projectInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    province: z.string().trim().max(120).optional(),
    customerSegment: z
      .enum([
        "RESIDENTIAL",
        "SMALL_BUSINESS",
        "MEDIUM_BUSINESS",
        "LARGE_BUSINESS",
      ])
      .default("RESIDENTIAL"),
    authority: z.enum(["PEA", "MEA"]).optional(),
  })
  .strict();

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;

  try {
    const projects = await prisma.site.findMany({
      where: { organization: { is: { ownerId: auth.user.id } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        province: true,
        customerSegment: true,
        authority: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { meters: true, appliances: true, analysisRuns: true },
        },
      },
    });
    return NextResponse.json({ ok: true, projects });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Database is not available." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const blocked = guardApiRequest(request, {
    bucket: "project-write",
    limit: 10,
    windowMs: 60_000,
  });
  if (blocked) return blocked;
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;
  const parsed = projectInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid project payload." },
      { status: 400 },
    );
  }

  try {
    const project = await prisma.$transaction(async (tx) => {
      const existingOrganization = await tx.organization.findFirst({
        where: { ownerId: auth.user.id },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      const organization =
        existingOrganization ??
        (await tx.organization.create({
          data: {
            ownerId: auth.user.id,
            name: `${auth.user.name || auth.user.email || "ผู้ใช้"} · โปรเจกต์พลังงาน`,
          },
          select: { id: true },
        }));
      return tx.site.create({
        data: {
          organizationId: organization.id,
          name: parsed.data.name,
          province: parsed.data.province || null,
          customerSegment: parsed.data.customerSegment,
          authority: parsed.data.authority ?? null,
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
    });
    await logAudit(prisma, {
      action: "project_created",
      entityType: "Site",
      entityId: project.id,
      after: project,
      userId: auth.user.id,
    });
    return NextResponse.json({ ok: true, project }, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Database is not available." },
      { status: 503 },
    );
  }
}
