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

export const analysisStorageKeys = [
  analysisGoalStorageKey,
  billWorkspaceStorageKey,
  billReportStorageKey,
  applianceWorkspaceStorageKey,
  localLoadProfileStorageKey,
  localLoadProfilesStorageKey,
  activeLocalLoadProfileIdStorageKey,
  localAnalysisReportsStorageKey,
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
