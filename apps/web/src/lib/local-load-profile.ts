import {
  calculationEngineVersion,
  createCanonicalLoadProfileFromLoadIntervals,
} from "@thai-energy-planner/calculation-engine";
import {
  CanonicalLoadProfileSchema,
  type CanonicalLoadProfile,
  type LoadIntervalInput,
  type LoadProfileSourceKind,
} from "@thai-energy-planner/shared-types";

export const localLoadProfileStorageKey = "thai-energy-planner.load-profile.v1";

export type LocalLoadProfileSnapshot = {
  id: "local-load-profile";
  createdAt: string;
  updatedAt: string;
  sourceName: string;
  rowCount: number;
  totalKwh: number;
  peakKw: number;
  detectedIntervalMinutes: number | null;
  rows: LoadIntervalInput[];
  canonicalProfile?: CanonicalLoadProfile;
};

export function saveLocalLoadProfileSnapshot(input: {
  sourceName: string;
  totalKwh: number;
  peakKw: number;
  detectedIntervalMinutes: number | null;
  rows: LoadIntervalInput[];
  sourceKind?: LoadProfileSourceKind;
  warnings?: string[];
}): LocalLoadProfileSnapshot {
  const existing = readLocalLoadProfileSnapshot();
  const now = new Date().toISOString();
  const snapshot: LocalLoadProfileSnapshot = {
    id: "local-load-profile",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    sourceName: input.sourceName,
    rowCount: input.rows.length,
    totalKwh: input.totalKwh,
    peakKw: input.peakKw,
    detectedIntervalMinutes: input.detectedIntervalMinutes,
    rows: input.rows.map((row) => ({
      timestamp: row.timestamp,
      energyKwh: row.energyKwh,
      ...(row.powerKw === undefined ? {} : { powerKw: row.powerKw }),
      ...(row.meterId === undefined ? {} : { meterId: row.meterId }),
    })),
    canonicalProfile: createCanonicalProfileForSnapshot({
      ...input,
      generatedAt: now,
    }),
  };

  window.localStorage.setItem(localLoadProfileStorageKey, JSON.stringify(snapshot));
  return snapshot;
}

export function createCanonicalProfileForSnapshot(input: {
  sourceName: string;
  detectedIntervalMinutes: number | null;
  rows: LoadIntervalInput[];
  sourceKind?: LoadProfileSourceKind;
  warnings?: string[];
  generatedAt?: string;
}): CanonicalLoadProfile {
  const intervalMinutes = isSupportedIntervalMinutes(
    input.detectedIntervalMinutes,
  )
    ? input.detectedIntervalMinutes
    : 60;

  return createCanonicalLoadProfileFromLoadIntervals(input.rows, {
    id: "local-load-profile",
    name: input.sourceName,
    sourceKind: input.sourceKind ?? "csv",
    intervalMinutes,
    calculationVersion: calculationEngineVersion,
    ...(input.generatedAt === undefined
      ? {}
      : { generatedAt: input.generatedAt }),
    sourceReference: input.sourceName,
    assumptions: {
      storage: "browser_local_snapshot",
    },
    quality: {
      warnings: input.warnings ?? [],
    },
  });
}

function isSupportedIntervalMinutes(
  value: number | null,
): value is 15 | 30 | 60 {
  return value === 15 || value === 30 || value === 60;
}

export function readLocalLoadProfileSnapshot(): LocalLoadProfileSnapshot | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(localLoadProfileStorageKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isLocalLoadProfileSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function deleteLocalLoadProfileSnapshot() {
  window.localStorage.removeItem(localLoadProfileStorageKey);
}

function isLocalLoadProfileSnapshot(value: unknown): value is LocalLoadProfileSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LocalLoadProfileSnapshot>;
  return (
    candidate.id === "local-load-profile" &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.sourceName === "string" &&
    typeof candidate.rowCount === "number" &&
    typeof candidate.totalKwh === "number" &&
    Array.isArray(candidate.rows) &&
    candidate.rows.every(isLoadInterval) &&
    (candidate.canonicalProfile === undefined ||
      CanonicalLoadProfileSchema.safeParse(candidate.canonicalProfile).success)
  );
}

function isLoadInterval(value: unknown): value is LoadIntervalInput {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<LoadIntervalInput>;
  return typeof row.timestamp === "string" && typeof row.energyKwh === "number" && row.energyKwh >= 0;
}
