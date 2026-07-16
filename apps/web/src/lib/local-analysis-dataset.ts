import type { LocalLoadProfileSnapshot } from "@/lib/local-load-profile";
import type { LocalBillReportSnapshot } from "@/lib/local-analysis-snapshot";

export type AnalysisDatasetFingerprint = {
  fingerprint: string;
  billFingerprint: string;
  profileFingerprint: string | null;
};

export function createAnalysisDatasetFingerprint({
  billSnapshot,
  profileSnapshot,
}: {
  billSnapshot: LocalBillReportSnapshot;
  profileSnapshot: LocalLoadProfileSnapshot | null;
}): AnalysisDatasetFingerprint {
  const billFingerprint = fingerprint({
    audience: billSnapshot.audience,
    rows: [...billSnapshot.rows]
      .sort((left, right) => left.month.localeCompare(right.month))
      .map((row) => ({
        authority: row.authority,
        energyKwh: row.energyKwh,
        meterMode: row.meterMode,
        month: row.month,
        totalCostThb: row.totalCostThb,
      })),
  });
  const profileFingerprint = profileSnapshot
    ? createProfileFingerprint(profileSnapshot)
    : null;

  return {
    billFingerprint,
    profileFingerprint,
    fingerprint: fingerprint({ billFingerprint, profileFingerprint }),
  };
}

function createProfileFingerprint(snapshot: LocalLoadProfileSnapshot) {
  const canonical = snapshot.canonicalProfile;
  return fingerprint({
    intervalMinutes:
      canonical?.intervalMinutes ?? snapshot.detectedIntervalMinutes,
    rows: canonical
      ? canonical.intervals.map((row) => ({
          energyKwh: normalizeStoredNumber(row.energyKwh),
          powerKw: normalizeStoredNumber(row.averagePowerKw),
          timestamp: row.timestamp,
        }))
      : snapshot.rows.map((row) => ({
          energyKwh: normalizeStoredNumber(row.energyKwh),
          powerKw:
            row.powerKw === undefined
              ? null
              : normalizeStoredNumber(row.powerKw),
          timestamp: row.timestamp,
        })),
    sourceName: canonical?.name ?? snapshot.sourceName,
  });
}

function normalizeStoredNumber(value: number) {
  return Number(value.toFixed(6));
}

export function isCurrentAnalysisDataset(
  saved: AnalysisDatasetFingerprint | undefined,
  current: AnalysisDatasetFingerprint | null,
) {
  return Boolean(saved && current && saved.fingerprint === current.fingerprint);
}

function fingerprint(value: unknown) {
  const input = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `v1-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(",")}}`;
}
