import { describe, expect, it } from "vitest";
import {
  analysisStorageKeys,
  clearPersistedAnalysisData,
  hasPersistedAnalysisData,
  readLatestAnalysisTimestamp,
} from "./analysis-storage";

function createMemoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    values,
  };
}

describe("analysis storage lifecycle", () => {
  it("detects persisted analysis without counting empty collections", () => {
    const empty = createMemoryStorage({
      [analysisStorageKeys[5]]: "[]",
      [analysisStorageKeys[6]]: "",
    });
    expect(hasPersistedAnalysisData(empty)).toBe(false);

    empty.values.set(analysisStorageKeys[0], "solar");
    expect(hasPersistedAnalysisData(empty)).toBe(true);
  });

  it("clears only registered analysis keys and preserves UI and auth data", () => {
    const initial = Object.fromEntries(
      analysisStorageKeys.map((key) => [key, `value:${key}`]),
    );
    const storage = createMemoryStorage({
      ...initial,
      theme: "dark",
      "sb-project-auth-token": "signed-in",
      "thai-energy-planner.ui-density.v1": "compact",
    });

    const removed = clearPersistedAnalysisData(storage);

    expect(removed).toEqual([...analysisStorageKeys]);
    for (const key of analysisStorageKeys)
      expect(storage.getItem(key)).toBeNull();
    expect(storage.getItem("theme")).toBe("dark");
    expect(storage.getItem("sb-project-auth-token")).toBe("signed-in");
    expect(storage.getItem("thai-energy-planner.ui-density.v1")).toBe(
      "compact",
    );
  });

  it("finds the latest timestamp across registered analysis snapshots", () => {
    const storage = createMemoryStorage({
      [analysisStorageKeys[1]]: JSON.stringify({
        updatedAt: "2026-07-13T10:00:00.000Z",
      }),
      [analysisStorageKeys[7]]: JSON.stringify([
        { createdAt: "2026-07-14T12:30:00.000Z" },
      ]),
    });

    expect(readLatestAnalysisTimestamp(storage)).toBe(
      "2026-07-14T12:30:00.000Z",
    );
  });
});
