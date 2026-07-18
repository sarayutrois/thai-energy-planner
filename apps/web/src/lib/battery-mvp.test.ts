import { describe, expect, it } from "vitest";
import type { CanonicalLoadProfile } from "@thai-energy-planner/shared-types";
import {
  defaultBatteryMvpSettings,
  evaluateBatteryMvp,
  selectBatteryCapacity,
} from "./battery-mvp";

describe("Battery MVP decision", () => {
  it("selects the next standard size for backup energy", () => {
    expect(selectBatteryCapacity(4)).toBe(5);
    expect(selectBatteryCapacity(5.1)).toBe(10);
    expect(selectBatteryCapacity(23)).toBe(25);
  });

  it("treats backup as a continuity decision instead of claiming payback", () => {
    const settings = {
      ...defaultBatteryMvpSettings(),
      goal: "backup" as const,
      criticalLoadKw: 1,
      backupHours: 4,
    };
    const decision = evaluateBatteryMvp({
      profile: buildProfile(),
      settings,
      hasBills: true,
      hasCalibratedBills: false,
      isSample: false,
    });
    expect(decision.verdict).toBe("consider");
    expect(decision.capacityKwh).toBe(5);
    expect(decision.estimatedBackupHours).toBe(4);
    expect(decision.limitations.join(" ")).toContain("ไฟดับ");
    expect(decision.optimization.evaluatedCandidateCount).toBe(1);
    expect(decision.optimization.candidates[0]?.selected).toBe(true);
  });

  it("does not recommend an expensive battery only for bill savings", () => {
    const decision = evaluateBatteryMvp({
      profile: buildProfile(),
      settings: {
        ...defaultBatteryMvpSettings(),
        goal: "bill_savings",
        meterMode: "tou",
        batteryCostPerKwhThb: 100_000,
      },
      hasBills: false,
      hasCalibratedBills: false,
      isSample: false,
    });
    expect(decision.verdict).toBe("not_recommended");
    expect(decision.headline).toContain("ยังไม่ควรติด");
    expect(decision.strategy).toBe("TOU_ARBITRAGE");
    expect(decision.limitations.join(" ")).toContain("เปลี่ยนมิเตอร์");
    expect(decision.optimization.evaluatedCandidateCount).toBe(10);
    expect(decision.optimization.evaluatedStrategies).toEqual([
      "TOU_ARBITRAGE",
      "PEAK_SHAVING",
    ]);
    expect(
      decision.optimization.candidates.filter(
        (candidate) => candidate.selected,
      ),
    ).toHaveLength(1);
    expect(decision.optimization.candidates[0]?.rank).toBe(1);
  });

  it("compares Solar self-consumption and hybrid strategies across standard sizes", () => {
    const decision = evaluateBatteryMvp({
      profile: buildProfile(),
      settings: {
        ...defaultBatteryMvpSettings(),
        goal: "solar_storage",
        solarSystemSizeKwp: 8,
      },
      hasBills: true,
      hasCalibratedBills: true,
      isSample: false,
    });

    expect(decision.optimization.evaluatedCapacitiesKwh).toEqual([
      2.5, 5, 10, 15, 20,
    ]);
    expect(decision.optimization.evaluatedStrategies).toEqual([
      "SOLAR_SELF_CONSUMPTION",
      "HYBRID",
    ]);
    expect(decision.optimization.evaluatedCandidateCount).toBe(10);
    expect(decision.optimization.candidates[0]).toMatchObject({
      rank: 1,
      selected: true,
    });
  });

  it("projects degradation, replacement, and cash flow across the project life", () => {
    const decision = evaluateBatteryMvp({
      profile: buildProfile(),
      settings: defaultBatteryMvpSettings(),
      hasBills: true,
      hasCalibratedBills: true,
      isSample: false,
    });

    expect(decision.lifecycle.projectLifeYears).toBe(15);
    expect(decision.lifecycle.years).toHaveLength(16);
    expect(decision.lifecycle.years[9]?.remainingCapacityPercent).toBeLessThan(
      100,
    );
    expect(decision.lifecycle.years[10]).toMatchObject({
      replacement: true,
      remainingCapacityPercent: 100,
    });
    expect(decision.lifecycle.endOfProjectCapacityPercent).toBeCloseTo(
      90.39,
      1,
    );
    expect(decision.lifecycle.years[10]?.replacementCostThb).toBeGreaterThan(0);
  });

  it("builds downside, base, and upside sensitivity from the same financial engine", () => {
    const decision = evaluateBatteryMvp({
      profile: buildProfile(),
      settings: defaultBatteryMvpSettings(),
      hasBills: true,
      hasCalibratedBills: true,
      isSample: false,
    });

    expect(decision.sensitivity.cases.map((item) => item.id)).toEqual([
      "downside",
      "base",
      "upside",
    ]);
    expect(decision.sensitivity.cases[1]?.npvThb).toBe(decision.npvThb);
    expect(decision.sensitivity.npvLowThb).toBeLessThanOrEqual(
      decision.sensitivity.npvHighThb,
    );
    expect(decision.sensitivity.cases[0]?.npvThb).toBeLessThan(
      decision.sensitivity.cases[2]!.npvThb,
    );
  });

  it("uses editable lifecycle assumptions in replacement and financial projections", () => {
    const decision = evaluateBatteryMvp({
      profile: buildProfile(),
      settings: {
        ...defaultBatteryMvpSettings(),
        projectLifeYears: 20,
        degradationPercentPerYear: 4,
        discountRatePercent: 8,
        electricityEscalationRatePercent: 3,
        replacementYear: 12,
        replacementCostPercent: 60,
      },
      hasBills: true,
      hasCalibratedBills: true,
      isSample: false,
    });

    expect(decision.lifecycle.years).toHaveLength(21);
    expect(decision.lifecycle.replacementYear).toBe(12);
    expect(decision.lifecycle.replacementCostThb).toBe(
      decision.optimization.candidates[0]!.capexThb * 0.6,
    );
    expect(decision.lifecycle.degradationPercentPerYear).toBe(4);
    expect(decision.sensitivity.cases[1]).toMatchObject({
      degradationPercentPerYear: 4,
      discountRatePercent: 8,
    });
  });

  it("summarizes the selected dispatch trace into a typical operating day", () => {
    const decision = evaluateBatteryMvp({
      profile: buildProfile(),
      settings: {
        ...defaultBatteryMvpSettings(),
        goal: "bill_savings",
        meterMode: "tou",
      },
      hasBills: true,
      hasCalibratedBills: true,
      isSample: false,
    });

    expect(decision.operation.typicalDay).toHaveLength(24);
    expect(decision.operation.intervalCount).toBe(24 * 7);
    expect(decision.operation.profileDayCount).toBeGreaterThan(0);
    expect(decision.operation.chargingHours.length).toBeGreaterThan(0);
    expect(decision.operation.dischargingHours.length).toBeGreaterThan(0);
    expect(decision.operation.totalChargedKwh).toBeGreaterThan(0);
    expect(decision.operation.totalDischargedKwh).toBeGreaterThan(0);
    expect(decision.operation.minimumSocPercent).toBeGreaterThanOrEqual(0);
    expect(decision.operation.maximumSocPercent).toBeLessThanOrEqual(100);
  });

  it("stress-tests outage coverage at overnight, midday, and evening SOC", () => {
    const decision = evaluateBatteryMvp({
      profile: buildProfile(),
      settings: {
        ...defaultBatteryMvpSettings(),
        goal: "backup",
        criticalLoadKw: 1,
        backupHours: 4,
      },
      hasBills: true,
      hasCalibratedBills: true,
      isSample: false,
    });

    expect(
      decision.resilience.scenarios.map((scenario) => scenario.id),
    ).toEqual(["overnight", "midday", "evening"]);
    expect(
      decision.resilience.scenarios.every(
        (scenario) =>
          scenario.powerSufficient &&
          scenario.startSocPercent >= 0 &&
          scenario.startSocPercent <= 100,
      ),
    ).toBe(true);
    expect(decision.resilience.bestCoverageHours).toBeGreaterThanOrEqual(
      decision.resilience.worstCoverageHours,
    );
    expect(decision.resilience.targetHours).toBe(4);
  });

  it("rejects invalid screening assumptions before running the optimizer", () => {
    expect(() =>
      evaluateBatteryMvp({
        profile: buildProfile(),
        settings: {
          ...defaultBatteryMvpSettings(),
          batteryCostPerKwhThb: 0,
        },
        hasBills: false,
        hasCalibratedBills: false,
        isSample: false,
      }),
    ).toThrow("ต้นทุน Battery ต้องมากกว่า 0");

    expect(() =>
      evaluateBatteryMvp({
        profile: buildProfile(),
        settings: {
          ...defaultBatteryMvpSettings(),
          projectLifeYears: 10,
          replacementYear: 12,
        },
        hasBills: false,
        hasCalibratedBills: false,
        isSample: false,
      }),
    ).toThrow("ปีเปลี่ยน Battery ต้องอยู่ภายในอายุโครงการ");
  });
});

function buildProfile(): CanonicalLoadProfile {
  const intervals = Array.from({ length: 24 * 7 }, (_, index) => {
    const timestamp = new Date(Date.UTC(2026, 6, 1, index, 0, 0)).toISOString();
    const hour = index % 24;
    const energyKwh = hour >= 18 && hour < 22 ? 1.2 : 0.35;
    return {
      timestamp,
      energyKwh,
      averagePowerKw: energyKwh,
      qualityFlags: [],
    };
  });
  return {
    schemaVersion: "1",
    id: "battery-test-profile",
    name: "Battery test profile",
    source: {
      kind: "appliance",
      generatedAt: "2026-07-01T00:00:00.000Z",
    },
    timezone: "Asia/Bangkok",
    intervalMinutes: 60,
    period: {
      startInclusive: intervals[0]!.timestamp,
      endExclusive: new Date(Date.UTC(2026, 6, 8)).toISOString(),
    },
    intervals,
    quality: {
      level: "modeled",
      completeness: 1,
      missingIntervalCount: 0,
      duplicateIntervalCount: 0,
      warnings: [],
    },
    assumptions: {},
    calculationVersion: "0.1.0",
  };
}
