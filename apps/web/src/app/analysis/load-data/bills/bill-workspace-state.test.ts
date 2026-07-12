import { describe, expect, it } from "vitest";
import { getStoredWorkspaceMode, isUserWorkspace } from "./bill-workspace-state";

describe("bill workspace source state", () => {
  const row = { id: "1", month: "2026-01", energyKwh: "465", totalCostThb: "2038", authority: "PEA" as const, meterMode: "normal" as const };

  it("uses empty mode when no workspace exists", () => {
    expect(getStoredWorkspaceMode(null, "home")).toBe("empty");
  });

  it("does not restore legacy unlabelled rows as real data", () => {
    expect(getStoredWorkspaceMode({ audience: "home", rows: [row] }, "home")).toBe("empty");
  });

  it("keeps sample and user data distinct", () => {
    expect(getStoredWorkspaceMode({ audience: "home", mode: "sample", rows: [row] }, "home")).toBe("sample");
    expect(isUserWorkspace({ audience: "home", mode: "sample", rows: [row] })).toBe(false);
    expect(isUserWorkspace({ audience: "home", mode: "user", rows: [row], updatedAt: "2026-01-01" })).toBe(true);
  });
});
