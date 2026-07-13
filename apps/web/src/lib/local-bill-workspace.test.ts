import { describe, expect, it } from "vitest";
import { maxBillRows, parseStoredBillWorkspace } from "./local-bill-workspace";

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
  });
});
