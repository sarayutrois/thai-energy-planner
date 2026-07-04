import { describe, expect, it } from "vitest";
import { calculateTouBill, demoNormalTariff, demoTouTariff } from "@thai-energy-planner/tariff-engine";
import {
  analyzeTouBreakEven,
  applyLoadShiftRules,
  calculateScenario,
  runScenarioComparison,
  scoreScenarioDataQuality,
  validateLoadShiftRule,
  type ScenarioKind
} from "./scenario-engine";
import type { LoadIntervalInput } from "@thai-energy-planner/shared-types";

function bangkokIso(dayOffset: number, hour: number) {
  return new Date(Date.UTC(2026, 0, 5 + dayOffset, hour - 7, 0, 0)).toISOString();
}

function profile(
  kind: "balanced" | "off_peak_heavy" | "peak_heavy" | "daytime_heavy",
  days = 3
): LoadIntervalInput[] {
  const intervals: LoadIntervalInput[] = [];
  for (let day = 0; day < days; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const energyKwh = hourlyEnergy(kind, hour);
      intervals.push({ timestamp: bangkokIso(day, hour), energyKwh, powerKw: energyKwh });
    }
  }
  return intervals;
}

function hourlyEnergy(kind: "balanced" | "off_peak_heavy" | "peak_heavy" | "daytime_heavy", hour: number) {
  if (kind === "off_peak_heavy") return hour >= 22 || hour < 6 ? 3 : 0.05;
  if (kind === "peak_heavy") return hour >= 9 && hour < 22 ? 3 : 0.05;
  if (kind === "daytime_heavy") return hour >= 9 && hour < 18 ? 2.5 : 0.4;
  return hour >= 18 && hour < 22 ? 1.6 : 0.5;
}

function run(kind: "balanced" | "off_peak_heavy" | "peak_heavy" | "daytime_heavy", scenarios?: ScenarioKind[]) {
  return runScenarioComparison({
    intervals: profile(kind),
    normalTariff: demoNormalTariff,
    touTariff: demoTouTariff,
    billDate: "2026-02-01",
    meterSwitchingCostThb: 1200,
    scenarioKinds: scenarios
  });
}

describe("phase 4 scenario engine", () => {
  it("calculates a Current Normal scenario through the tariff engine", () => {
    const result = run("balanced", ["CURRENT_NORMAL"]);

    expect(result.baseline.kind).toBe("CURRENT_NORMAL");
    expect(result.baseline.tariffMode).toBe("normal");
    expect(result.baseline.baseEnergyCharge).toBeGreaterThan(0);
    expect(result.baseline.grandTotal).toBeGreaterThan(0);
  });

  it("calculates a Current TOU scenario with peak and off-peak kWh", () => {
    const result = run("balanced", ["CURRENT_TOU"]);
    const currentTou = result.scenarios[0]!;

    expect(currentTou.kind).toBe("CURRENT_TOU");
    expect(currentTou.tariffMode).toBe("tou");
    expect(currentTou.peakKwh).toBeGreaterThan(0);
    expect(currentTou.offPeakKwh).toBeGreaterThan(0);
  });

  it("compares Normal vs TOU without behavior change", () => {
    const result = run("balanced", ["SWITCH_TO_TOU_NO_BEHAVIOR_CHANGE"]);
    const scenario = result.scenarios[0]!;

    expect(scenario.kind).toBe("SWITCH_TO_TOU_NO_BEHAVIOR_CHANGE");
    expect(scenario.savingsMonthly).toBeCloseTo(result.baseline.grandTotal - scenario.grandTotal, 2);
    expect(scenario.effectiveRatePerKwh).toBeGreaterThan(0);
  });

  it("detects a TOU cheaper case for off-peak-heavy load", () => {
    const result = run("off_peak_heavy", ["CURRENT_TOU"]);
    const currentTou = result.scenarios[0]!;

    expect(currentTou.grandTotal).toBeLessThan(result.baseline.grandTotal);
    expect(currentTou.savingsMonthly).toBeGreaterThan(0);
  });

  it("detects a TOU more expensive case for peak-heavy load", () => {
    const result = run("peak_heavy", ["CURRENT_TOU"]);
    const currentTou = result.scenarios[0]!;

    expect(currentTou.grandTotal).toBeGreaterThan(result.baseline.grandTotal);
    expect(currentTou.savingsMonthly).toBeLessThan(0);
  });

  it("preserves total kWh when shifting load", () => {
    const source = profile("peak_heavy");
    const shifted = applyLoadShiftRules(source, {
      tariffVersion: demoTouTariff,
      rules: [{ name: "test shift", shiftPercentOfPeak: 20, targetStartTime: "22:00", targetEndTime: "06:00" }]
    });

    expect(shifted.totalKwhAfter).toBeCloseTo(shifted.totalKwhBefore, 5);
  });

  it("reduces peak kWh after load shifting", () => {
    const shifted = applyLoadShiftRules(profile("peak_heavy"), {
      tariffVersion: demoTouTariff,
      rules: [{ name: "test shift", shiftPercentOfPeak: 20, targetStartTime: "22:00", targetEndTime: "06:00" }]
    });

    expect(shifted.sourcePeakKwhAfter).toBeLessThan(shifted.sourcePeakKwhBefore);
  });

  it("increases off-peak kWh after load shifting", () => {
    const shifted = applyLoadShiftRules(profile("peak_heavy"), {
      tariffVersion: demoTouTariff,
      rules: [{ name: "test shift", shiftPercentOfPeak: 20, targetStartTime: "22:00", targetEndTime: "06:00" }]
    });

    expect(shifted.targetOffPeakKwhAfter).toBeGreaterThan(shifted.targetOffPeakKwhBefore);
  });

  it("does not create negative intervals during shifting", () => {
    const shifted = applyLoadShiftRules(profile("peak_heavy"), {
      tariffVersion: demoTouTariff,
      rules: [{ name: "large capped shift", shiftPercentOfPeak: 100, targetStartTime: "22:00", targetEndTime: "06:00" }]
    });

    expect(shifted.intervals.every((interval) => interval.energyKwh >= 0)).toBe(true);
  });

  it("calculates break-even off-peak ratio", () => {
    const breakEven = analyzeTouBreakEven({
      intervals: profile("peak_heavy"),
      normalTariff: demoNormalTariff,
      touTariff: demoTouTariff,
      billDate: "2026-02-01"
    });

    expect(breakEven.requiredOffPeakRatio).toBeGreaterThanOrEqual(breakEven.currentOffPeakRatio);
  });

  it("estimates required kWh to shift", () => {
    const breakEven = analyzeTouBreakEven({
      intervals: profile("peak_heavy"),
      normalTariff: demoNormalTariff,
      touTariff: demoTouTariff,
      billDate: "2026-02-01"
    });

    expect(breakEven.requiredShiftKwhPerMonth).toBeGreaterThan(0);
  });

  it("calculates payback from meter switching cost", () => {
    const result = runScenarioComparison({
      intervals: profile("off_peak_heavy"),
      normalTariff: demoNormalTariff,
      touTariff: demoTouTariff,
      billDate: "2026-02-01",
      meterSwitchingCostThb: 1200,
      scenarioKinds: ["CURRENT_TOU"]
    });

    expect(result.scenarios[0]?.paybackMonths).toBeGreaterThan(0);
  });

  it("recommends staying Normal when TOU is worse", () => {
    const result = run("peak_heavy", ["CURRENT_TOU"]);

    expect(result.recommendations.some((recommendation) => recommendation.type === "stay_normal")).toBe(true);
  });

  it("recommends switching TOU when TOU is cheaper", () => {
    const result = run("off_peak_heavy", ["CURRENT_TOU"]);

    expect(result.recommendations.some((recommendation) => recommendation.type === "switch_tou")).toBe(true);
  });

  it("recommends more data for insufficient data quality", () => {
    const result = runScenarioComparison({
      intervals: profile("balanced", 1),
      normalTariff: demoNormalTariff,
      touTariff: demoTouTariff,
      billDate: "2026-02-01",
      dataSource: "appliance",
      scenarioKinds: ["CURRENT_TOU"]
    });

    expect(result.dataQuality.level).toBe("LOW");
    expect(result.recommendations.some((recommendation) => recommendation.type === "insufficient_data")).toBe(true);
  });

  it("scores high quality interval data", () => {
    const quality = scoreScenarioDataQuality({ intervals: profile("balanced", 30), source: "interval" });

    expect(quality.level).toBe("HIGH");
    expect(quality.metrics.hasWeekday).toBe(true);
    expect(quality.metrics.hasWeekend).toBe(true);
  });

  it("scores medium quality bill-backed data", () => {
    const quality = scoreScenarioDataQuality({ billMonthCount: 6, source: "bill" });

    expect(quality.level).toBe("MEDIUM");
  });

  it("scores low quality appliance estimates", () => {
    const quality = scoreScenarioDataQuality({ intervals: profile("balanced", 1), source: "appliance" });

    expect(quality.level).toBe("LOW");
  });

  it("keeps scenario result breakdown aligned with tariff totals", () => {
    const result = run("balanced", ["CURRENT_NORMAL"]);
    const componentTotal =
      result.baseline.baseEnergyCharge +
      result.baseline.peakEnergyCharge +
      result.baseline.offPeakEnergyCharge +
      result.baseline.demandCharge +
      result.baseline.ftCharge +
      result.baseline.serviceCharge +
      result.baseline.vat;

    expect(componentTotal).toBeCloseTo(result.baseline.grandTotal, 2);
  });

  it("uses Tariff Engine for TOU totals rather than duplicated billing logic", () => {
    const intervals = profile("balanced");
    const result = calculateScenario({
      kind: "CURRENT_TOU",
      name: "Current TOU",
      intervals,
      normalTariff: demoNormalTariff,
      touTariff: demoTouTariff,
      billDate: "2026-02-01",
      monthlyScaleFactor: 1,
      meterSwitchingCostThb: 0,
      baselineGrandTotal: null
    });
    const direct = calculateTouBill({
      tariffVersion: demoTouTariff,
      intervals: intervals.map((interval) => ({ timestamp: interval.timestamp, energyKwh: interval.energyKwh }))
    });

    expect(result.grandTotal).toBe(Number(direct.grandTotal));
  });

  it("validates invalid load shift percentages", () => {
    expect(validateLoadShiftRule({ name: "bad", shiftPercentOfPeak: 120 })).toContain(
      "shiftPercentOfPeak must be between 0 and 100"
    );
  });

  it("rejects negative meter switching cost", () => {
    expect(() =>
      runScenarioComparison({
        intervals: profile("balanced"),
        normalTariff: demoNormalTariff,
        touTariff: demoTouTariff,
        meterSwitchingCostThb: -1
      })
    ).toThrow("Meter switching cost must be non-negative.");
  });
});
