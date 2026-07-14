import { analysisGoalStorageKey } from "./analysis-preferences";
import { applianceWorkspaceStorageKey } from "./local-appliance-workspace";
import {
  billReportStorageKey,
  billWorkspaceStorageKey,
  localAnalysisReportsStorageKey,
} from "./local-analysis-snapshot";
import {
  activeLocalLoadProfileIdStorageKey,
  localLoadProfileStorageKey,
  localLoadProfilesStorageKey,
} from "./local-load-profile";
import {
  solarAnalysisStorageKey,
  solarAssumptionsStorageKey,
} from "./local-solar-analysis";

export const analysisStorageKeys = [
  analysisGoalStorageKey,
  billWorkspaceStorageKey,
  billReportStorageKey,
  applianceWorkspaceStorageKey,
  localLoadProfileStorageKey,
  localLoadProfilesStorageKey,
  activeLocalLoadProfileIdStorageKey,
  localAnalysisReportsStorageKey,
  solarAssumptionsStorageKey,
  solarAnalysisStorageKey,
] as const;

export const analysisResumeSessionStorageKey =
  "thai-energy-planner.analysis-resume-choice.v1";
export const analysisStorageChangedEvent =
  "thai-energy-planner:analysis-storage-changed";

export type AnalysisResumeChoice = "continue" | "new";

type ReadableStorage = Pick<Storage, "getItem">;
type MutableStorage = Pick<Storage, "getItem" | "removeItem">;

export function hasPersistedAnalysisData(storage: ReadableStorage) {
  return analysisStorageKeys.some((key) => {
    const value = storage.getItem(key);
    return value !== null && value.trim() !== "" && value !== "[]";
  });
}

export function clearPersistedAnalysisData(storage: MutableStorage) {
  const removedKeys: string[] = [];
  for (const key of analysisStorageKeys) {
    if (storage.getItem(key) !== null) removedKeys.push(key);
    storage.removeItem(key);
  }
  return removedKeys;
}

export function readLatestAnalysisTimestamp(storage: ReadableStorage) {
  const timestamps: number[] = [];
  for (const key of analysisStorageKeys) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    try {
      collectTimestamps(JSON.parse(raw) as unknown, timestamps, 0);
    } catch {
      // Plain string preferences and malformed legacy values have no timestamp.
    }
  }
  if (!timestamps.length) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

export function readAnalysisResumeChoice(
  storage: ReadableStorage,
): AnalysisResumeChoice | null {
  const value = storage.getItem(analysisResumeSessionStorageKey);
  return value === "continue" || value === "new" ? value : null;
}

export function announceAnalysisStorageChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(analysisStorageChangedEvent));
}

function collectTimestamps(
  value: unknown,
  timestamps: number[],
  depth: number,
) {
  if (depth > 4 || !value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectTimestamps(item, timestamps, depth + 1));
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (
      (key === "updatedAt" ||
        key === "createdAt" ||
        key === "calculatedAt" ||
        key === "savedAt") &&
      typeof item === "string"
    ) {
      const timestamp = Date.parse(item);
      if (Number.isFinite(timestamp)) timestamps.push(timestamp);
    } else {
      collectTimestamps(item, timestamps, depth + 1);
    }
  }
}
