import { describe, expect, it } from "vitest";
import {
  maxBillRows,
  parseStoredBillWorkspace,
  storedBillWorkspaceMatchesProject,
} from "./local-bill-workspace";

const validWorkspace = {
  audience: "home",
  mode: "user",
  updatedAt: "2026-01-01T00:00:00.000Z",
  rows: [
    {
      id: "bill-1",
      month: "2026-01",
      energyKwh: "500",
      totalCostThb: "2200",
      authority: "PEA",
      meterMode: "normal",
    },
  ],
};

describe("stored bill workspace validation", () => {
  it("accepts a bounded, labelled workspace", () => {
    expect(parseStoredBillWorkspace(validWorkspace)).toEqual(validWorkspace);
    expect(
      parseStoredBillWorkspace({
        ...validWorkspace,
        projectId: "project-alpha",
      })?.projectId,
    ).toBe("project-alpha");
  });

  it("rejects malformed, oversized and source-ambiguous data", () => {
    expect(
      parseStoredBillWorkspace({ ...validWorkspace, mode: "sample", rows: [] }),
    ).toBeNull();
    expect(
      parseStoredBillWorkspace({
        ...validWorkspace,
        rows: Array.from(
          { length: maxBillRows + 1 },
          () => validWorkspace.rows[0],
        ),
      }),
    ).toBeNull();
    expect(
      parseStoredBillWorkspace({
        ...validWorkspace,
        rows: [{ ...validWorkspace.rows[0], authority: "unknown" }],
      }),
    ).toBeNull();
    expect(
      parseStoredBillWorkspace({
        ...validWorkspace,
        projectId: "bad id",
      }),
    ).toBeNull();
  });

  it("does not treat bills from another project as current input", () => {
    const projectWorkspace = parseStoredBillWorkspace({
      ...validWorkspace,
      projectId: "project-alpha",
    });
    const personalWorkspace = parseStoredBillWorkspace(validWorkspace);

    expect(
      storedBillWorkspaceMatchesProject(projectWorkspace, "project-alpha"),
    ).toBe(true);
    expect(
      storedBillWorkspaceMatchesProject(projectWorkspace, "project-bravo"),
    ).toBe(false);
    expect(storedBillWorkspaceMatchesProject(projectWorkspace)).toBe(false);
    expect(storedBillWorkspaceMatchesProject(personalWorkspace)).toBe(true);
    expect(
      storedBillWorkspaceMatchesProject(personalWorkspace, "project-alpha"),
    ).toBe(false);
  });
});
