import { describe, expect, it } from "vitest";
import type { LocalLoadProfileSnapshot } from "./local-load-profile";
import { assessAnalysisDataTrust } from "./analysis-data-trust";

describe("analysis data trust", () => {
  it("rates consecutive calibrated real data as high confidence", () => {
    const profile = createProfile({ calibrated: true });
    const bills = Array.from({ length: 6 }, (_, index) => ({
      month: `2026-${String(index + 1).padStart(2, "0")}`,
      energyKwh: 304.4,
      totalCostThb: 1_500,
      authority: "PEA" as const,
      meterMode: "normal" as const,
    }));

    const trust = assessAnalysisDataTrust({
      profileSnapshot: profile,
      bills,
      asOf: new Date("2026-07-18T00:00:00.000Z"),
    });

    expect(trust.level).toBe("high");
    expect(trust.score).toBeGreaterThanOrEqual(75);
    expect(trust.billMonthCount).toBe(6);
    expect(trust.consecutiveBillMonthCount).toBe(6);
    expect(trust.missingBillMonthCount).toBe(0);
    expect(trust.reconciliation.isCalibrated).toBe(true);
    expect(trust.issues.map((issue) => issue.code)).not.toContain(
      "uncalibrated",
    );
  });

  it("keeps sample data without bills at low confidence", () => {
    const trust = assessAnalysisDataTrust({
      profileSnapshot: createProfile({ isSample: true }),
      bills: [],
      asOf: new Date("2026-07-18T00:00:00.000Z"),
    });

    expect(trust.level).toBe("low");
    expect(trust.score).toBeLessThanOrEqual(35);
    expect(trust.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["sample_data", "no_bills"]),
    );
  });

  it("detects missing months, outliers, and mixed bill metadata", () => {
    const trust = assessAnalysisDataTrust({
      profileSnapshot: createProfile({}),
      bills: [
        {
          month: "2026-01",
          energyKwh: 100,
          totalCostThb: 500,
          authority: "PEA",
          meterMode: "normal",
        },
        {
          month: "2026-03",
          energyKwh: 100,
          totalCostThb: 500,
          authority: "PEA",
          meterMode: "normal",
        },
        {
          month: "2026-04",
          energyKwh: 100,
          totalCostThb: 500,
          authority: "MEA",
          meterMode: "tou",
        },
        {
          month: "2026-05",
          energyKwh: 500,
          totalCostThb: 50_000,
          authority: "MEA",
          meterMode: "tou",
        },
      ],
      asOf: new Date("2026-07-18T00:00:00.000Z"),
    });

    expect(trust.missingBillMonthCount).toBe(1);
    expect(trust.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "missing_bill_months",
        "usage_outlier",
        "cost_outlier",
        "mixed_authority",
        "mixed_meter_mode",
        "uncalibrated",
      ]),
    );
  });

  it("shows both the pre-calibration variance and the remaining residual", () => {
    const profile = createProfile({ calibrated: true });
    profile.calibration = {
      appliedAt: "2026-07-01T00:00:00.000Z",
      factor: 2,
      billMonthlyKwh: 304.4,
      profileMonthlyKwhBefore: 152.2,
    };

    const trust = assessAnalysisDataTrust({
      profileSnapshot: profile,
      bills: [{ month: "2026-06", energyKwh: 304.4, totalCostThb: 1_500 }],
      asOf: new Date("2026-07-18T00:00:00.000Z"),
    });

    expect(trust.reconciliation.varianceBeforePercent).toBeCloseTo(-50);
    expect(trust.reconciliation.residualPercent).toBeCloseTo(0);
  });
});

function createProfile(input: {
  calibrated?: boolean;
  isSample?: boolean;
}): LocalLoadProfileSnapshot {
  const rows = Array.from({ length: 30 }, (_, index) => ({
    timestamp: `2026-06-${String(index + 1).padStart(2, "0")}T00:00:00.000+07:00`,
    energyKwh: 10,
    powerKw: 1,
  }));
  return {
    id: "profile-trust-test",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    sourceName: "Load Profile ทดสอบ",
    rowCount: rows.length,
    totalKwh: 300,
    peakKw: 1,
    detectedIntervalMinutes: 60,
    rows,
    ...(input.isSample ? { isSample: true } : {}),
    ...(input.calibrated
      ? {
          calibration: {
            appliedAt: "2026-07-01T00:00:00.000Z",
            factor: 1,
            billMonthlyKwh: 304.4,
            profileMonthlyKwhBefore: 304.4,
          },
        }
      : {}),
  };
}
