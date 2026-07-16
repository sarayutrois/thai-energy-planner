import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { CanonicalLoadProfileSchema } from "@thai-energy-planner/shared-types";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardApiRequest } from "@/lib/api-security";
import { requireAuthenticatedUser } from "@/lib/supabase-server";

const requestSchema = z.object({
  profile: CanonicalLoadProfileSchema,
  projectId: z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]{8,160}$/i)
    .optional(),
});

const sourceByKind = {
  smart_meter: "CSV",
  csv: "CSV",
  xlsx: "XLSX",
  appliance: "APPLIANCE",
  bill_estimate: "BILL",
  demo: "DEMO",
} as const;

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;

  try {
    const projectId = new URL(request.url).searchParams.get("projectId");
    const profiles = await prisma.loadProfile.findMany({
      where: {
        userId: auth.user.id,
        ...(projectId ? { meter: { is: { siteId: projectId } } } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        source: true,
        intervalMinutes: true,
        qualityScore: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { intervals: true } },
      },
    });
    return NextResponse.json({
      ok: true,
      profiles: profiles.map((profile) => ({
        ...profile,
        intervalCount: profile._count.intervals,
        _count: undefined,
      })),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Database is not available." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const blocked = guardApiRequest(request, {
    bucket: "load-profile-write",
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
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid load profile payload." },
      { status: 400 },
    );
  }
  const { profile } = parsed.data;
  if (profile.intervals.length > 50_000) {
    return NextResponse.json(
      { ok: false, error: "Load profile is too large to persist." },
      { status: 413 },
    );
  }
  try {
    let meterId: string | undefined;
    if (parsed.data.projectId) {
      const project = await prisma.site.findFirst({
        where: {
          id: parsed.data.projectId,
          organization: { is: { ownerId: auth.user.id } },
        },
        select: { id: true, authority: true },
      });
      if (!project) {
        return NextResponse.json(
          { ok: false, error: "Project not found." },
          { status: 404 },
        );
      }
      const meter = await prisma.meter.upsert({
        where: {
          siteId_name: { siteId: project.id, name: "มิเตอร์หลัก" },
        },
        create: {
          siteId: project.id,
          name: "มิเตอร์หลัก",
          authority: project.authority ?? "PEA",
          mode: "NORMAL",
        },
        update: {},
        select: { id: true },
      });
      meterId = meter.id;
    }
    const validationSummary = JSON.parse(
      JSON.stringify({
        schemaVersion: profile.schemaVersion,
        source: profile.source,
        quality: profile.quality,
        assumptions: profile.assumptions,
        calculationVersion: profile.calculationVersion,
      }),
    ) as Prisma.InputJsonObject;
    const saved = await prisma.loadProfile.create({
      data: {
        userId: auth.user.id,
        ...(meterId ? { meterId } : {}),
        name: profile.name,
        source: sourceByKind[profile.source.kind],
        intervalMinutes: profile.intervalMinutes,
        timezone: profile.timezone,
        qualityScore: Math.round(profile.quality.completeness * 100),
        validationSummary,
        intervals: {
          create: profile.intervals.map((interval) => ({
            timestamp: new Date(interval.timestamp),
            energyKwh: interval.energyKwh,
            powerKw: interval.averagePowerKw,
            metadata: {
              measuredDemandKw: interval.measuredDemandKw ?? null,
              qualityFlags: interval.qualityFlags,
            },
          })),
        },
      },
      select: { id: true, createdAt: true },
    });
    return NextResponse.json({
      ok: true,
      loadProfileId: saved.id,
      createdAt: saved.createdAt.toISOString(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Database is not available." },
      { status: 503 },
    );
  }
}

function isTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
