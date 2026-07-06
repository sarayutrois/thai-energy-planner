import type { LoadIntervalInput } from "@thai-energy-planner/shared-types";

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
};

export function saveLocalLoadProfileSnapshot(input: {
  sourceName: string;
  totalKwh: number;
  peakKw: number;
  detectedIntervalMinutes: number | null;
  rows: LoadIntervalInput[];
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
      ...(row.meterId === undefined ? {} : { meterId: row.meterId })
    }))
  };

  window.localStorage.setItem(localLoadProfileStorageKey, JSON.stringify(snapshot));
  return snapshot;
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
    candidate.rows.every(isLoadInterval)
  );
}

function isLoadInterval(value: unknown): value is LoadIntervalInput {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<LoadIntervalInput>;
  return typeof row.timestamp === "string" && typeof row.energyKwh === "number" && row.energyKwh >= 0;
}
