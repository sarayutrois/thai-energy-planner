import { describe, expect, it } from "vitest";
import { demoNormalTariff, demoTouTariff } from "@thai-energy-planner/tariff-engine";
import type { LoadIntervalInput } from "@thai-energy-planner/shared-types";
import {
  calculateEvDailyEnergyNeeded,
  createDemoPhase6Input,
  generateEvChargingProfile,
  runBatteryAnalysis,
  runDemoBatteryAnalysis,
  runDemoEvComparison,
  runEvScenario,
  runEvScenarioComparison,
  simulateBatteryDispatch,
  validateBatteryConfig,
  validateEvConfig,
  type BatteryConfigInput,
  type EvConfigInput
} from "./battery-ev-engine";
import type { FinancialAssumptions, SolarGenerationIntervalInput } from "./solar-engine";

function bangkokIso(dayOffset: number, hour: number) {
  return new Date(Date.UTC(2026, 0, 5 + dayOffset, hour - 7, 0, 0)).toISOString();
}

function bangkokDateIso(date: string, hour: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, day ?? 1, hour - 7, 0, 0)).toISOString();
}

function load(rows: Array<[number, number, number]>): LoadIntervalInput[] {
  return rows.map(([day, hour, energyKwh]) => ({
    timestamp: bangkokIso(day, hour),
    energyKwh,
    powerKw: energyKwh
  }));
}

function solar(rows: Array<[number, number, number]>): SolarGenerationIntervalInput[] {
  return rows.map(([day, hour, generationKwh]) => ({
    timestamp: bangkokIso(day, hour),
    generationKwh,
    powerKw: generationKwh
  }));
}

const source = {
  status: "demo" as const,
  sourceUrl: null,
  authority: "test",
  notes: "Synthetic Phase 6 test input."
};

const batteryConfig: BatteryConfigInput = {
  capacityKwh: 10,
  usableCapacityKwh: 9,
  initialSocPercent: 50,
  minSocPercent: 10,
  maxSocPercent: 90,
  chargePowerKw: 2,
  dischargePowerKw: 3,
  chargeEfficiency: 0.9,
  dischargeEfficiency: 0.9,
  roundTripEfficiency: 0.81,
  degradationPercentPerYear: 1,
  cycleLife: 4000,
  capexThb: 100000,
  oAndMCostPerYear: 1000,
  replacementCostThb: 0,
  replacementYear: null,
  backupReservePercent: 30,
  dispatchStrategy: "HYBRID",
  peakShavingThresholdKw: 3,
  allowGridCharging: true,
  criticalLoadKw: 1,
  costSource: source
};

const evConfig: EvConfigInput = {
  vehicleName: "Test EV",
  batteryCapacityKwh: 60,
  efficiencyKmPerKwh: 5,
  dailyDistanceKm: 45,
  weeklyDrivingDays: 5,
  chargerPowerKw: 7,
  chargerEfficiency: 0.9,
  arrivalTime: "18:00",
  departureTime: "07:00",
  targetSocPercent: 80,
  initialSocPercent: 40,
  minSocPercent: 20,
  chargingDays: [1, 2, 3, 4, 5],
  outsideChargingCostPerKwh: 8,
  allowSolarCharging: true,
  allowOffPeakCharging: true,
  allowSmartCharging: true,
  chargingStrategy: "CHARGE_IMMEDIATELY",
  equipmentCostThb: 35000,
  costSource: source
};

const financialAssumptions: FinancialAssumptions = {
  projectLifeYears: 10,
  discountRatePercent: 5,
  electricityEscalationRatePercent: 0,
  inflationRatePercent: 0,
  oAndMEscalationRatePercent: 0,
  degradationRatePercent: 1,
  capexThb: 100000,
  oAndMCostPerYear: 1000,
  inverterReplacementCostThb: 0,
  inverterReplacementYear: null,
  subsidyAmountThb: 0,
  meterChangeCostThb: 0,
  otherInitialCostThb: 0
};

describe("phase 6 battery dispatch engine", () => {
  it("validates battery configuration boundaries", () => {
    expect(validateBatteryConfig({ ...batteryConfig, usableCapacityKwh: 11 })).toContain("usableCapacityKwh cannot exceed capacityKwh");
    expect(validateBatteryConfig(batteryConfig)).toEqual([]);
  });

  it("charges solar surplus with efficiency and respects charge power and max SOC", () => {
    const result = simulateBatteryDispatch({
      loadIntervals: load([[0, 12, 1]]),
      solarIntervals: solar([[0, 12, 6]]),
      config: { ...batteryConfig, initialSocPercent: 80, dispatchStrategy: "SOLAR_SELF_CONSUMPTION", chargePowerKw: 2 }
    });

    const interval = result.intervals[0];
    expect(interval?.availableSolarSurplusKwh).toBe(5);
    expect(interval?.chargeFromSolarKwh).toBe(1.111111);
    expect(interval?.socAfterKwh).toBe(9);
    expect(result.gridExportAfterKwh).toBe(3.888889);
    expect(result.selfConsumptionAfterRatio).toBeGreaterThan(result.selfConsumptionBeforeRatio);

    const powerLimited = simulateBatteryDispatch({
      loadIntervals: load([[0, 12, 1]]),
      solarIntervals: solar([[0, 12, 10]]),
      config: { ...batteryConfig, initialSocPercent: 40, dispatchStrategy: "SOLAR_SELF_CONSUMPTION", chargePowerKw: 2 }
    });
    expect(powerLimited.intervals[0]?.chargeFromSolarKwh).toBe(2);
    expect(powerLimited.intervals[0]?.socAfterKwh).toBe(5.8);
  });

  it("discharges to load with efficiency and does not fall below protected reserve", () => {
    const result = simulateBatteryDispatch({
      loadIntervals: load([[0, 19, 8]]),
      solarIntervals: solar([[0, 19, 0]]),
      config: { ...batteryConfig, initialSocPercent: 50, minSocPercent: 20, dispatchStrategy: "SOLAR_SELF_CONSUMPTION" }
    });

    const interval = result.intervals[0];
    expect(interval?.dischargeToLoadKwh).toBe(2.7);
    expect(interval?.socAfterKwh).toBe(2);
    expect(interval?.gridImportAfterKwh).toBe(5.3);
  });

  it("peak shaves only load above the configured threshold", () => {
    const result = simulateBatteryDispatch({
      loadIntervals: load([[0, 18, 5]]),
      config: { ...batteryConfig, dispatchStrategy: "PEAK_SHAVING", peakShavingThresholdKw: 3, initialSocPercent: 90 }
    });

    expect(result.peakDemandBeforeKw).toBe(5);
    expect(result.peakDemandAfterKw).toBe(3);
    expect(result.intervals[0]?.dischargeKwh).toBe(2);
  });

  it("uses tariff-engine period classification for TOU arbitrage and holidays", () => {
    const holiday = simulateBatteryDispatch({
      loadIntervals: [
        { timestamp: bangkokDateIso("2026-01-01", 10), energyKwh: 0, powerKw: 0 },
        { timestamp: bangkokDateIso("2026-01-01", 11), energyKwh: 0, powerKw: 0 }
      ],
      touTariff: demoTouTariff,
      config: { ...batteryConfig, dispatchStrategy: "TOU_ARBITRAGE", initialSocPercent: 10, allowGridCharging: true }
    });
    const arbitrage = simulateBatteryDispatch({
      loadIntervals: [
        { timestamp: bangkokIso(0, 8), energyKwh: 0, powerKw: 0 },
        { timestamp: bangkokIso(0, 9), energyKwh: 4, powerKw: 4 }
      ],
      touTariff: demoTouTariff,
      config: { ...batteryConfig, dispatchStrategy: "TOU_ARBITRAGE", initialSocPercent: 10, allowGridCharging: true }
    });

    expect(holiday.intervals[0]?.periodType).toBe("off_peak");
    expect(arbitrage.intervals[0]?.periodType).toBe("off_peak");
    expect(arbitrage.intervals[0]?.chargeFromGridKwh).toBe(2);
    expect(arbitrage.intervals[1]?.periodType).toBe("peak");
    expect(arbitrage.intervals[1]?.dischargeToLoadKwh).toBeGreaterThan(0);
  });

  it("preserves backup reserve and reports estimated backup hours", () => {
    const result = simulateBatteryDispatch({
      loadIntervals: load([[0, 20, 6]]),
      solarIntervals: solar([[0, 20, 0]]),
      config: { ...batteryConfig, dispatchStrategy: "BACKUP_RESERVE", backupReservePercent: 40, criticalLoadKw: 2 }
    });

    expect(result.backupReserveKwh).toBe(4);
    expect(result.estimatedBackupHours).toBe(2);
    expect(result.intervals[0]?.socAfterKwh).toBeGreaterThanOrEqual(4);
    expect(result.totalDischargedKwh).toBe(0);
  });

  it("calculates bill before/after, financial metrics, and recommendation traces", () => {
    const result = runBatteryAnalysis({
      loadIntervals: load([
        [0, 12, 1],
        [0, 19, 4],
        [0, 20, 4]
      ]),
      solarIntervals: solar([
        [0, 12, 7],
        [0, 19, 0],
        [0, 20, 0]
      ]),
      normalTariff: demoNormalTariff,
      touTariff: demoTouTariff,
      config: { ...batteryConfig, dispatchStrategy: "HYBRID", capexThb: 250000 },
      financialAssumptions,
      meterMode: "tou",
      billDate: "2026-02-01",
      monthlyScaleFactor: 1
    });

    expect(result.dispatch.gridImportAfterKwh).toBeLessThan(result.dispatch.gridImportBeforeKwh);
    expect(result.financial.billAfterBatteryThb).toBeLessThan(result.financial.billBeforeBatteryThb);
    expect(result.financial.costPerUsableKwh).toBeGreaterThan(0);
    expect(result.recommendations.some((item) => item.type === "not_financial_backup_value")).toBe(true);
  });

  it("keeps the energy trace auditable for the demo analysis", () => {
    const result = runDemoBatteryAnalysis("export_home");
    expect(result.dispatch.intervals.length).toBeGreaterThan(0);
    expect(Math.abs(result.dispatch.energyBalanceDeltaKwh)).toBeLessThan(result.dispatch.totalLoadKwh);
    expect(result.billBeforeBattery.lineItems.length).toBeGreaterThan(0);
    expect(result.billAfterBattery.lineItems.length).toBeGreaterThan(0);
  });
});

describe("phase 6 EV load generation", () => {
  it("validates EV configuration and daily energy formula", () => {
    expect(validateEvConfig(evConfig)).toEqual([]);
    expect(calculateEvDailyEnergyNeeded(evConfig)).toBe(10);
  });

  it("builds immediate charging from arrival and increases peak load", () => {
    const base = load([
      [0, 18, 1],
      [0, 19, 1],
      [0, 20, 1],
      [0, 23, 1]
    ]);
    const scenario = runEvScenario({
      baseLoadIntervals: base,
      normalTariff: demoNormalTariff,
      touTariff: demoTouTariff,
      config: evConfig,
      strategy: "CHARGE_IMMEDIATELY",
      meterMode: "tou",
      billDate: "2026-02-01",
      monthlyScaleFactor: 1
    });

    expect(scenario.profile.intervals[0]?.timestamp).toBe(bangkokIso(0, 18));
    expect(scenario.profile.totalEvKwh).toBe(10);
    expect(scenario.peakDemandIncreaseKw).toBeGreaterThan(0);
    expect(scenario.monthlyBillIncreaseThb).toBeGreaterThan(0);
    expect(scenario.costPer100Km).toBeGreaterThan(0);
  });

  it("keeps off-peak charging inside tariff off-peak periods", () => {
    const profile = generateEvChargingProfile({
      baseLoadIntervals: load([
        [0, 18, 1],
        [0, 23, 1],
        [1, 0, 1],
        [1, 1, 1]
      ]),
      touTariff: demoTouTariff,
      config: evConfig,
      strategy: "OFF_PEAK"
    });

    expect(profile.intervals.length).toBeGreaterThan(0);
    expect(profile.intervals.every((interval) => interval.periodType === "off_peak")).toBe(true);
  });

  it("warns when the charging window cannot finish before departure", () => {
    const profile = generateEvChargingProfile({
      baseLoadIntervals: load([[0, 18, 1]]),
      touTariff: demoTouTariff,
      config: { ...evConfig, chargerPowerKw: 2, dailyDistanceKm: 80 },
      strategy: "CHARGE_IMMEDIATELY"
    });

    expect(profile.isComplete).toBe(false);
    expect(profile.warnings[0]).toContain("Charging incomplete");
  });

  it("uses solar surplus charging when the vehicle is home during daytime", () => {
    const daytimeEv = { ...evConfig, arrivalTime: "09:00", departureTime: "16:00", chargingDays: [1], dailyDistanceKm: 20 };
    const profile = generateEvChargingProfile({
      baseLoadIntervals: load([
        [0, 10, 1],
        [0, 11, 1],
        [0, 12, 1]
      ]),
      solarIntervals: solar([
        [0, 10, 7],
        [0, 11, 7],
        [0, 12, 7]
      ]),
      touTariff: demoTouTariff,
      config: daytimeEv,
      strategy: "SOLAR_SURPLUS"
    });

    expect(profile.solarSurplusUsedKwh).toBeGreaterThan(0);
    expect(profile.gridEnergyKwh).toBe(0);
    expect(profile.intervals.every((interval) => interval.gridEnergyKwh === 0)).toBe(true);
  });

  it("compares strategies and picks a lower-cost strategy than immediate when available", () => {
    const comparison = runEvScenarioComparison({
      baseLoadIntervals: load([
        [0, 18, 1],
        [0, 19, 1],
        [0, 23, 1],
        [1, 0, 1],
        [1, 1, 1]
      ]),
      normalTariff: demoNormalTariff,
      touTariff: demoTouTariff,
      config: evConfig,
      meterMode: "tou",
      billDate: "2026-02-01",
      monthlyScaleFactor: 1
    });
    const immediate = comparison.scenarios.find((scenario) => scenario.strategy === "CHARGE_IMMEDIATELY");

    expect(comparison.scenarios).toHaveLength(4);
    expect(comparison.bestChargingStrategy.monthlyBillIncreaseThb).toBeLessThanOrEqual(immediate?.monthlyBillIncreaseThb ?? Infinity);
    expect(comparison.recommendations.length).toBeGreaterThan(0);
  });

  it("runs demo EV comparison and links the integration path to tariff bills", () => {
    const comparison = runDemoEvComparison("ev_evening");
    expect(comparison.baselineMonthlyBillThb).toBeGreaterThan(0);
    expect(comparison.bestChargingStrategy.billAfterEv.grandTotal).toBeDefined();
    expect(comparison.bestChargingStrategy.profile.intervals.length).toBeGreaterThan(0);
  });

  it("creates all Phase 6 demo variants without verified equipment prices", () => {
    const exportHome = createDemoPhase6Input("export_home");
    const lowExportHome = createDemoPhase6Input("low_export_home");
    const evEvening = createDemoPhase6Input("ev_evening");

    expect(exportHome.batteryConfig.costSource.status).toBe("demo");
    expect(lowExportHome.batteryConfig.dispatchStrategy).toBe("BACKUP_RESERVE");
    expect(evEvening.evConfig.chargingStrategy).toBe("CHARGE_IMMEDIATELY");
  });
});
