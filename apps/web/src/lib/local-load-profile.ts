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
import { authenticatedFetch } from "./auth-fetch";

export const localLoadProfileStorageKey = "thai-energy-planner.load-profile.v1";
export const localLoadProfilesStorageKey =
  "thai-energy-planner.load-profiles.v1";
export const activeLocalLoadProfileIdStorageKey =
  "thai-energy-planner.active-load-profile.v1";

export type LocalLoadProfileSnapshot = {
  id: string;
  createdAt: string;
  updatedAt: string;
  sourceName: string;
  rowCount: number;
  totalKwh: number;
  peakKw: number;
  detectedIntervalMinutes: number | null;
  rows: LoadIntervalInput[];
  canonicalProfile?: CanonicalLoadProfile;
  serverLoadProfileId?: string;
};

export type LoadProfilePersistenceResult =
  | { status: "saved"; loadProfileId: string }
  | { status: "local_only"; reason: "not_signed_in" | "network_or_server" };

export function saveLocalLoadProfileSnapshot(input: {
  sourceName: string;
  totalKwh: number;
  peakKw: number;
  detectedIntervalMinutes: number | null;
  rows: LoadIntervalInput[];
  sourceKind?: LoadProfileSourceKind;
  warnings?: string[];
  persist?: boolean;
}): LocalLoadProfileSnapshot {
  const existing = readLocalLoadProfileSnapshot();
  const now = new Date().toISOString();
  const snapshot: LocalLoadProfileSnapshot = {
    id: crypto.randomUUID(),
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

  window.localStorage.setItem(
    localLoadProfileStorageKey,
    JSON.stringify(snapshot),
  );
  const profiles = listLocalLoadProfileSnapshots().filter(
    (profile) => profile.id !== snapshot.id,
  );
  window.localStorage.setItem(
    localLoadProfilesStorageKey,
    JSON.stringify([snapshot, ...profiles].slice(0, 20)),
  );
  window.localStorage.setItem(activeLocalLoadProfileIdStorageKey, snapshot.id);
  if (input.persist !== false) void persistLocalLoadProfile(snapshot);
  return snapshot;
}

export async function persistLocalLoadProfile(
  snapshot: LocalLoadProfileSnapshot,
): Promise<LoadProfilePersistenceResult> {
  if (!snapshot.canonicalProfile) {
    return { status: "local_only", reason: "network_or_server" };
  }
  const response = await authenticatedFetch("/api/load-profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile: snapshot.canonicalProfile }),
  }).catch(() => null);
  if (!response?.ok) {
    return {
      status: "local_only",
      reason: response?.status === 401 ? "not_signed_in" : "network_or_server",
    };
  }
  const payload = (await response.json()) as { loadProfileId?: string };
  if (!payload.loadProfileId) {
    return { status: "local_only", reason: "network_or_server" };
  }
  const current = readLocalLoadProfileSnapshot();
  if (current?.id === snapshot.id && current.updatedAt === snapshot.updatedAt) {
    replaceLocalSnapshot({
      ...current,
      serverLoadProfileId: payload.loadProfileId,
    });
  }
  return { status: "saved", loadProfileId: payload.loadProfileId };
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

  const activeId = window.localStorage.getItem(
    activeLocalLoadProfileIdStorageKey,
  );
  const active = listLocalLoadProfileSnapshots().find(
    (profile) => profile.id === activeId,
  );
  if (active) return active;

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
  const current = readLocalLoadProfileSnapshot();
  if (!current) return;
  const profiles = listLocalLoadProfileSnapshots().filter(
    (profile) => profile.id !== current.id,
  );
  window.localStorage.setItem(
    localLoadProfilesStorageKey,
    JSON.stringify(profiles),
  );
  window.localStorage.setItem(
    activeLocalLoadProfileIdStorageKey,
    profiles[0]?.id ?? "",
  );
  window.localStorage.removeItem(localLoadProfileStorageKey);
}

export function listLocalLoadProfileSnapshots(): LocalLoadProfileSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(localLoadProfilesStorageKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter(isLocalLoadProfileSnapshot)
      : [];
  } catch {
    return [];
  }
}

export function selectLocalLoadProfileSnapshot(id: string) {
  const profile = listLocalLoadProfileSnapshots().find(
    (item) => item.id === id,
  );
  if (!profile) return null;
  window.localStorage.setItem(activeLocalLoadProfileIdStorageKey, id);
  window.localStorage.setItem(
    localLoadProfileStorageKey,
    JSON.stringify(profile),
  );
  return profile;
}

function replaceLocalSnapshot(snapshot: LocalLoadProfileSnapshot) {
  const profiles = listLocalLoadProfileSnapshots().map((profile) =>
    profile.id === snapshot.id ? snapshot : profile,
  );
  window.localStorage.setItem(
    localLoadProfilesStorageKey,
    JSON.stringify(profiles),
  );
  if (
    window.localStorage.getItem(activeLocalLoadProfileIdStorageKey) ===
    snapshot.id
  ) {
    window.localStorage.setItem(
      localLoadProfileStorageKey,
      JSON.stringify(snapshot),
    );
  }
}

function isLocalLoadProfileSnapshot(
  value: unknown,
): value is LocalLoadProfileSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LocalLoadProfileSnapshot>;
  return (
    typeof candidate.id === "string" &&
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
  return (
    typeof row.timestamp === "string" &&
    typeof row.energyKwh === "number" &&
    row.energyKwh >= 0
  );
}
