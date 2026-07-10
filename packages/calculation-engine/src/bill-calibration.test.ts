import { describe, expect, it } from "vitest";
import { calibrateLoadProfileAgainstBills } from "./bill-calibration";

const profile = {
  schemaVersion: "1" as const,
  id: "profile_1",
  name: "July profile",
  source: {
    kind: "appliance" as const,
    generatedAt: "2026-07-01T00:00:00.000Z",
  },
  timezone: "Asia/Bangkok" as const,
  intervalMinutes: 60 as const,
  period: {
    startInclusive: "2026-07-01T00:00:00.000Z",
    endExclusive: "2026-08-01T00:00:00.000Z",
  },
  intervals: [
    {
      timestamp: "2026-07-01T00:00:00.000Z",
      energyKwh: 40,
      averagePowerKw: 40,
      qualityFlags: [],
    },
    {
      timestamp: "2026-07-15T00:00:00.000Z",
      energyKwh: 60,
      averagePowerKw: 60,
      qualityFlags: [],
    },
  ],
  quality: {
    level: "modeled" as const,
    completeness: 1,
    missingIntervalCount: 0,
    duplicateIntervalCount: 0,
    warnings: [],
  },
  assumptions: {},
  calculationVersion: "0.1.0",
};

describe("bill calibration", () => {
  it("compares overlapping Bangkok calendar months", () => {
    const result = calibrateLoadProfileAgainstBills({
      profile,
      bills: [{ month: "2026-07", energyKwh: 125, totalCostThb: 500 }],
    });

    expect(result.comparedMonths).toEqual([
      expect.objectContaining({
        month: "2026-07",
        profileKwh: 100,
        billKwh: 125,
        varianceKwh: -25,
        variancePercent: -20,
      }),
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("warns instead of comparing non-overlapping bill months", () => {
    const result = calibrateLoadProfileAgainstBills({
      profile,
      bills: [{ month: "2026-08", energyKwh: 125, totalCostThb: 500 }],
    });

    expect(result.comparedMonths).toEqual([]);
    expect(result.warnings).toHaveLength(3);
  });
});
