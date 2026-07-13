import { NextResponse } from "next/server";
import { CanonicalLoadProfileSchema } from "@thai-energy-planner/shared-types";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/supabase-server";
import { guardApiRequest } from "@/lib/api-security";

const idPattern = /^[a-z0-9_-]{8,160}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!idPattern.test(id)) return notFound();

  const profile = await prisma.loadProfile.findFirst({
    where: { id, userId: auth.user.id },
    select: {
      id: true,
      name: true,
      source: true,
      intervalMinutes: true,
      timezone: true,
      validationSummary: true,
      createdAt: true,
      updatedAt: true,
      intervals: {
        orderBy: { timestamp: "asc" },
        select: {
          timestamp: true,
          energyKwh: true,
          powerKw: true,
          metadata: true,
        },
      },
    },
  });
  if (!profile) return notFound();
  const canonicalProfile = toCanonicalProfile(profile);
  if (!canonicalProfile) {
    return NextResponse.json(
      { ok: false, error: "Stored load profile is invalid." },
      { status: 422 },
    );
  }
  return NextResponse.json({
    ok: true,
    profile: { id: profile.id, canonicalProfile },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = guardApiRequest(request, {
    bucket: "load-profile-delete",
    limit: 10,
    windowMs: 60_000,
  });
  if (blocked) return blocked;
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!idPattern.test(id)) return notFound();

  const deleted = await prisma.loadProfile.deleteMany({
    where: { id, userId: auth.user.id },
  });
  if (deleted.count === 0) return notFound();
  return NextResponse.json({ ok: true });
}

function notFound() {
  return NextResponse.json(
    { ok: false, error: "Load profile not found." },
    { status: 404 },
  );
}

function toCanonicalProfile(profile: {
  id: string;
  name: string;
  source: "BILL" | "CSV" | "XLSX" | "APPLIANCE" | "DEMO";
  intervalMinutes: number;
  timezone: string;
  validationSummary: unknown;
  updatedAt: Date;
  intervals: Array<{
    timestamp: Date;
    energyKwh: { toString(): string };
    powerKw: { toString(): string } | null;
    metadata: unknown;
  }>;
}) {
  const summary = asRecord(profile.validationSummary);
  const storedSource = asRecord(summary?.source);
  const storedQuality = asRecord(summary?.quality);
  const intervalMinutes = profile.intervalMinutes;
  if (
    ![15, 30, 60].includes(intervalMinutes) ||
    profile.timezone !== "Asia/Bangkok" ||
    profile.intervals.length === 0
  )
    return null;

  const intervals = profile.intervals.map((interval) => {
    const metadata = asRecord(interval.metadata);
    return {
      timestamp: interval.timestamp.toISOString(),
      energyKwh: Number(interval.energyKwh),
      averagePowerKw:
        interval.powerKw === null
          ? Number(interval.energyKwh) / (intervalMinutes / 60)
          : Number(interval.powerKw),
      ...(typeof metadata?.measuredDemandKw === "number"
        ? { measuredDemandKw: metadata.measuredDemandKw }
        : {}),
      qualityFlags: Array.isArray(metadata?.qualityFlags)
        ? metadata.qualityFlags.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
    };
  });
  const endExclusive = new Date(
    profile.intervals[profile.intervals.length - 1]!.timestamp.getTime() +
      intervalMinutes * 60_000,
  ).toISOString();
  const sourceKind =
    typeof storedSource?.kind === "string"
      ? storedSource.kind
      : sourceKindForStored(profile.source);
  const candidate = {
    schemaVersion: "1" as const,
    id: profile.id,
    name: profile.name,
    source: {
      kind: sourceKind,
      ...(typeof storedSource?.reference === "string"
        ? { reference: storedSource.reference }
        : {}),
      generatedAt:
        typeof storedSource?.generatedAt === "string"
          ? storedSource.generatedAt
          : profile.updatedAt.toISOString(),
    },
    timezone: "Asia/Bangkok" as const,
    intervalMinutes,
    period: {
      startInclusive: profile.intervals[0]!.timestamp.toISOString(),
      endExclusive,
    },
    intervals,
    quality: {
      level: storedQuality?.level,
      completeness: storedQuality?.completeness,
      missingIntervalCount: storedQuality?.missingIntervalCount,
      duplicateIntervalCount: storedQuality?.duplicateIntervalCount,
      warnings: storedQuality?.warnings,
    },
    assumptions: asRecord(summary?.assumptions) ?? {},
    calculationVersion:
      typeof summary?.calculationVersion === "string"
        ? summary.calculationVersion
        : "stored-load-profile",
  };
  const parsed = CanonicalLoadProfileSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sourceKindForStored(source: string) {
  return (
    (
      {
        BILL: "bill_estimate",
        CSV: "csv",
        XLSX: "xlsx",
        APPLIANCE: "appliance",
        DEMO: "demo",
      } as const
    )[source] ?? "csv"
  );
}
