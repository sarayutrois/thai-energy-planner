import Decimal from "decimal.js";
import type {
  CanonicalLoadProfile,
  LoadIntervalInput,
} from "@thai-energy-planner/shared-types";
import { LoadIntervalSchema } from "@thai-energy-planner/shared-types";
import {
  calculateNormalBill,
  calculateTouBill,
  demoNormalTariff,
  demoTouTariff,
  selectTouPeriod,
  type TariffCalculationResult,
  type TariffVersionConfig,
} from "@thai-energy-planner/tariff-engine";
import { detectIntervalMinutes } from "./load-data.js";
import { canonicalLoadProfileToLoadIntervals } from "./load-profile-adapters.js";
import {
  calculateFinancials,
  createDemoSolarInput,
  generateApproxSolarProfile,
  simulateSolarSelfConsumption,
  type FinancialAssumptions,
  type SolarGenerationIntervalInput,
  type SolarSelfConsumptionResult,
} from "./solar-engine.js";

export const batteryEvEngineVersion = "0.7.0-battery-optimizer";

export type Phase6SourceMetadata = {
  status: "demo" | "draft" | "verified" | "published";
  sourceUrl: string | null;
  authority: string;
  notes: string;
  verifiedAt?: string | null | undefined;
};

export type BatteryDispatchStrategy =
  | "SOLAR_SELF_CONSUMPTION"
  | "PEAK_SHAVING"
  | "TOU_ARBITRAGE"
  | "BACKUP_RESERVE"
  | "HYBRID";

export type BatteryConfigInput = {
  capacityKwh: number;
  usableCapacityKwh: number;
  initialSocPercent: number;
  minSocPercent: number;
  maxSocPercent: number;
  chargePowerKw: number;
  dischargePowerKw: number;
  chargeEfficiency: number;
  dischargeEfficiency: number;
  roundTripEfficiency: number;
  degradationPercentPerYear: number;
  cycleLife?: number | undefined;
  capexThb: number;
  oAndMCostPerYear: number;
  replacementCostThb: number;
  replacementYear: number | null;
  backupReservePercent: number;
  dispatchStrategy: BatteryDispatchStrategy;
  peakShavingThresholdKw?: number | undefined;
  allowGridCharging?: boolean | undefined;
  criticalLoadKw?: number | undefined;
  costSource: Phase6SourceMetadata;
};

export type BatteryDispatchInterval = {
  timestamp: string;
  loadKwh: number;
  solarKwh: number;
  availableSolarSurplusKwh: number;
  socBeforeKwh: number;
  socAfterKwh: number;
  chargeKwh: number;
  dischargeKwh: number;
  chargeFromSolarKwh: number;
  chargeFromGridKwh: number;
  dischargeToLoadKwh: number;
  gridImportBeforeKwh: number;
  gridImportAfterKwh: number;
  gridExportBeforeKwh: number;
  gridExportAfterKwh: number;
  curtailedKwh: number;
  periodType: "peak" | "off_peak" | "unknown";
};

export type BatteryDispatchResult = {
  strategy: BatteryDispatchStrategy;
  intervalMinutes: number;
  intervals: BatteryDispatchInterval[];
  totalLoadKwh: number;
  totalSolarKwh: number;
  totalChargedKwh: number;
  totalDischargedKwh: number;
  chargedFromSolarKwh: number;
  chargedFromGridKwh: number;
  dischargedToLoadKwh: number;
  gridImportBeforeKwh: number;
  gridImportAfterKwh: number;
  gridExportBeforeKwh: number;
  gridExportAfterKwh: number;
  solarSelfConsumptionBeforeKwh: number;
  solarSelfConsumptionAfterKwh: number;
  selfConsumptionBeforeRatio: number;
  selfConsumptionAfterRatio: number;
  peakDemandBeforeKw: number;
  peakDemandAfterKw: number;
  backupReserveKwh: number;
  estimatedBackupHours: number | null;
  energyBalanceDeltaKwh: number;
  warnings: string[];
  solarBaseline: SolarSelfConsumptionResult;
};

export type BatteryFinancialResult = {
  billBeforeBatteryThb: number;
  billAfterBatteryThb: number;
  annualBillSavingsThb: number;
  increasedSelfConsumptionKwh: number;
  exportRevenueReductionThb: number;
  simplePaybackYears: number | null;
  discountedPaybackYears: number | null;
  roiPercent: number;
  npvThb: number;
  irrPercent: number | null;
  costPerUsableKwh: number | null;
  costPerCycle: number | null;
  financialTrace: ReturnType<typeof calculateFinancials>;
};

export type BatteryRecommendation = {
  type:
    | "financially_viable"
    | "not_financial_backup_value"
    | "tou_spread_too_low"
    | "low_solar_export"
    | "reduce_battery_size"
    | "increase_solar_first";
  title: string;
  explanation: string;
  supportingMetrics: Record<string, number | string | null>;
  confidence: "low" | "medium" | "high";
  limitations: string[];
  nextAction: string;
};

export type BatteryAnalysisResult = {
  dispatch: BatteryDispatchResult;
  billBeforeBattery: TariffCalculationResult;
  billAfterBattery: TariffCalculationResult;
  financial: BatteryFinancialResult;
  recommendations: BatteryRecommendation[];
};

export type EvChargingStrategy =
  "CHARGE_IMMEDIATELY" | "OFF_PEAK" | "SOLAR_SURPLUS" | "SMART";

export type EvConfigInput = {
  vehicleName: string;
  batteryCapacityKwh: number;
  efficiencyKmPerKwh: number;
  dailyDistanceKm: number;
  weeklyDrivingDays: number;
  chargerPowerKw: number;
  chargerEfficiency: number;
  arrivalTime: string;
  departureTime: string;
  targetSocPercent: number;
  initialSocPercent: number;
  minSocPercent: number;
  chargingDays: number[];
  outsideChargingCostPerKwh: number;
  allowSolarCharging: boolean;
  allowOffPeakCharging: boolean;
  allowSmartCharging: boolean;
  chargingStrategy: EvChargingStrategy;
  equipmentCostThb?: number | undefined;
  costSource: Phase6SourceMetadata;
};

export type EvChargingInterval = {
  timestamp: string;
  energyKwh: number;
  powerKw: number;
  source: "grid" | "solar_surplus" | "mixed";
  solarEnergyKwh: number;
  gridEnergyKwh: number;
  isAtHome: boolean;
  periodType: "peak" | "off_peak" | "unknown";
  costThb: number;
};

export type EvChargingProfileResult = {
  strategy: EvChargingStrategy;
  intervals: EvChargingInterval[];
  dailyEnergyNeededKwh: number;
  totalEvKwh: number;
  homeChargingKwh: number;
  outsideChargingKwh: number;
  outsideChargingCostThb: number;
  completedEnergyKwh: number;
  isComplete: boolean;
  warnings: string[];
  solarSurplusUsedKwh: number;
  gridEnergyKwh: number;
};

export type EvScenarioResult = {
  strategy: EvChargingStrategy;
  profile: EvChargingProfileResult;
  billBeforeEv: TariffCalculationResult;
  billAfterEv: TariffCalculationResult;
  addedEvKwh: number;
  chargingCostThb: number;
  monthlyBillIncreaseThb: number;
  annualBillIncreaseThb: number;
  averageCostPerKm: number | null;
  costPer100Km: number | null;
  gridImportIncreaseKwh: number;
  peakDemandIncreaseKw: number;
  chargingCompletionStatus: "complete" | "incomplete";
  warnings: string[];
};

export type EvScenarioComparisonResult = {
  baselineMonthlyBillThb: number;
  scenarios: EvScenarioResult[];
  bestChargingStrategy: EvScenarioResult;
  recommendations: EvRecommendation[];
};

export type EvRecommendation = {
  type:
    | "charge_off_peak"
    | "smart_charging_best"
    | "solar_surplus_available"
    | "charging_window_insufficient"
    | "peak_impact_high";
  title: string;
  explanation: string;
  supportingMetrics: Record<string, number | string | null>;
  confidence: "low" | "medium" | "high";
  limitations: string[];
  nextAction: string;
};

export type Phase6DemoInput = {
  loadIntervals: LoadIntervalInput[];
  solarIntervals: SolarGenerationIntervalInput[];
  normalTariff: TariffVersionConfig;
  touTariff: TariffVersionConfig;
  batteryConfig: BatteryConfigInput;
  evConfig: EvConfigInput;
};

const zero = new Decimal(0);
const bangkokFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});
const dayOfWeekByName: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function validateBatteryConfig(input: BatteryConfigInput): string[] {
  const errors: string[] = [];
  if (input.capacityKwh <= 0) errors.push("capacityKwh must be greater than 0");
  if (input.usableCapacityKwh <= 0)
    errors.push("usableCapacityKwh must be greater than 0");
  if (input.usableCapacityKwh > input.capacityKwh)
    errors.push("usableCapacityKwh cannot exceed capacityKwh");
  if (input.minSocPercent < 0)
    errors.push("minSocPercent must be non-negative");
  if (input.maxSocPercent > 100) errors.push("maxSocPercent cannot exceed 100");
  if (input.minSocPercent >= input.maxSocPercent)
    errors.push("minSocPercent must be lower than maxSocPercent");
  if (
    input.initialSocPercent < input.minSocPercent ||
    input.initialSocPercent > input.maxSocPercent
  ) {
    errors.push(
      "initialSocPercent must be between minSocPercent and maxSocPercent",
    );
  }
  if (input.chargePowerKw <= 0)
    errors.push("chargePowerKw must be greater than 0");
  if (input.dischargePowerKw <= 0)
    errors.push("dischargePowerKw must be greater than 0");
  if (input.chargeEfficiency <= 0 || input.chargeEfficiency > 1)
    errors.push("chargeEfficiency must be > 0 and <= 1");
  if (input.dischargeEfficiency <= 0 || input.dischargeEfficiency > 1)
    errors.push("dischargeEfficiency must be > 0 and <= 1");
  if (input.roundTripEfficiency <= 0 || input.roundTripEfficiency > 1)
    errors.push("roundTripEfficiency must be > 0 and <= 1");
  if (input.capexThb < 0) errors.push("capexThb must be non-negative");
  if (input.oAndMCostPerYear < 0)
    errors.push("oAndMCostPerYear must be non-negative");
  if (input.backupReservePercent < 0 || input.backupReservePercent > 100) {
    errors.push("backupReservePercent must be between 0 and 100");
  }
  if (
    !input.costSource.status ||
    (!input.costSource.notes && !input.costSource.sourceUrl)
  ) {
    errors.push("costSource must include status and notes or sourceUrl");
  }
  return errors;
}

export function validateEvConfig(input: EvConfigInput): string[] {
  const errors: string[] = [];
  if (input.batteryCapacityKwh <= 0)
    errors.push("batteryCapacityKwh must be greater than 0");
  if (input.dailyDistanceKm < 0)
    errors.push("dailyDistanceKm must be non-negative");
  if (input.weeklyDrivingDays < 0 || input.weeklyDrivingDays > 7)
    errors.push("weeklyDrivingDays must be between 0 and 7");
  if (input.efficiencyKmPerKwh <= 0)
    errors.push("efficiencyKmPerKwh must be greater than 0");
  if (input.chargerPowerKw <= 0)
    errors.push("chargerPowerKw must be greater than 0");
  if (input.chargerEfficiency <= 0 || input.chargerEfficiency > 1)
    errors.push("chargerEfficiency must be > 0 and <= 1");
  if (input.minSocPercent < 0 || input.minSocPercent > 100)
    errors.push("minSocPercent must be between 0 and 100");
  if (input.initialSocPercent < 0 || input.initialSocPercent > 100)
    errors.push("initialSocPercent must be between 0 and 100");
  if (input.targetSocPercent < 0 || input.targetSocPercent > 100)
    errors.push("targetSocPercent must be between 0 and 100");
  if (input.initialSocPercent < input.minSocPercent)
    errors.push(
      "initialSocPercent must be greater than or equal to minSocPercent",
    );
  if (input.targetSocPercent <= input.initialSocPercent)
    errors.push("targetSocPercent must be greater than initialSocPercent");
  if (
    input.chargingDays.some(
      (day) => !Number.isInteger(day) || day < 0 || day > 6,
    )
  ) {
    errors.push("chargingDays must contain day numbers from 0 to 6");
  }
  if (!isValidTime(input.arrivalTime) || !isValidTime(input.departureTime))
    errors.push("arrivalTime and departureTime must be valid HH:mm");
  if (input.outsideChargingCostPerKwh < 0)
    errors.push("outsideChargingCostPerKwh must be non-negative");
  if (
    !input.costSource.status ||
    (!input.costSource.notes && !input.costSource.sourceUrl)
  ) {
    errors.push("costSource must include status and notes or sourceUrl");
  }
  return errors;
}

export function calculateEvDailyEnergyNeeded(input: EvConfigInput): number {
  const errors = validateEvConfig(input);
  if (errors.length > 0)
    throw new Error(`Invalid EV config: ${errors.join(", ")}`);
  return round(
    new Decimal(input.dailyDistanceKm)
      .div(input.efficiencyKmPerKwh)
      .div(input.chargerEfficiency),
    6,
  );
}

export function simulateBatteryDispatch(input: {
  loadIntervals: LoadIntervalInput[];
  solarIntervals?: SolarGenerationIntervalInput[] | undefined;
  touTariff?: TariffVersionConfig | undefined;
  config: BatteryConfigInput;
  strategy?: BatteryDispatchStrategy | undefined;
}): BatteryDispatchResult {
  const errors = validateBatteryConfig(input.config);
  if (errors.length > 0)
    throw new Error(`Invalid battery config: ${errors.join(", ")}`);

  const loadIntervals = normalizeLoadIntervals(input.loadIntervals);
  const solarIntervals = normalizeSolarIntervals(
    input.solarIntervals ?? [],
    detectIntervalMinutes(loadIntervals) ?? 60,
  );
  const intervalMinutes = detectIntervalMinutes(loadIntervals) ?? 60;
  const intervalHours = intervalMinutes / 60;
  const strategy = input.strategy ?? input.config.dispatchStrategy;
  const solarBaseline = simulateSolarSelfConsumption({
    loadIntervals,
    solarIntervals,
  });
  const capacityKwh = new Decimal(input.config.capacityKwh);
  const minSocKwh = capacityKwh.mul(input.config.minSocPercent).div(100);
  const maxSocByPercentKwh = capacityKwh
    .mul(input.config.maxSocPercent)
    .div(100);
  const batteryMaxKwh = Decimal.min(
    maxSocByPercentKwh,
    minSocKwh.plus(input.config.usableCapacityKwh),
  );
  const reserveKwh = capacityKwh
    .mul(input.config.backupReservePercent)
    .div(100);
  const protectedMinSoc =
    strategy === "BACKUP_RESERVE" || strategy === "HYBRID"
      ? Decimal.max(minSocKwh, reserveKwh)
      : minSocKwh;
  let soc = capacityKwh.mul(input.config.initialSocPercent).div(100);
  soc = Decimal.min(Decimal.max(soc, protectedMinSoc), batteryMaxKwh);

  const solarByTimestamp = new Map(
    solarIntervals.map((interval) => [interval.timestamp, interval]),
  );
  const intervals: BatteryDispatchInterval[] = [];
  const warnings: string[] = [];

  let totalLoad = zero;
  let totalSolar = zero;
  let totalCharged = zero;
  let totalDischarged = zero;
  let chargedFromSolar = zero;
  let chargedFromGrid = zero;
  let dischargedToLoad = zero;
  let gridImportBefore = zero;
  let gridImportAfter = zero;
  let gridExportBefore = zero;
  let gridExportAfter = zero;
  let peakBefore = zero;
  let peakAfter = zero;

  for (const load of loadIntervals) {
    const solar = solarByTimestamp.get(load.timestamp);
    const loadKwh = new Decimal(load.energyKwh);
    const solarKwh = new Decimal(solar?.generationKwh ?? 0);
    const baselineImport = Decimal.max(loadKwh.minus(solarKwh), zero);
    const baselineExport = Decimal.max(solarKwh.minus(loadKwh), zero);
    const periodType = input.touTariff
      ? classifyTouPeriod(input.touTariff, load.timestamp)
      : "unknown";
    const socBefore = soc;
    let chargeFromSolar = zero;
    let chargeFromGrid = zero;
    let dischargeToLoad = zero;
    let curtailed = zero;
    let afterImport = baselineImport;
    let afterExport = baselineExport;

    if (supportsSolarCharging(strategy)) {
      const solarCharge = chargeBattery({
        availableSourceKwh: baselineExport,
        soc,
        maxSocKwh: batteryMaxKwh,
        chargePowerKwh: new Decimal(input.config.chargePowerKw).mul(
          intervalHours,
        ),
        chargeEfficiency: new Decimal(input.config.chargeEfficiency),
      });
      chargeFromSolar = solarCharge.sourceKwh;
      soc = solarCharge.nextSoc;
      afterExport = Decimal.max(afterExport.minus(chargeFromSolar), zero);
    }

    if (
      supportsGridCharging(strategy) &&
      input.config.allowGridCharging !== false &&
      periodType === "off_peak"
    ) {
      const gridCharge = chargeBattery({
        availableSourceKwh: new Decimal(input.config.chargePowerKw)
          .mul(intervalHours)
          .minus(chargeFromSolar),
        soc,
        maxSocKwh: batteryMaxKwh,
        chargePowerKwh: new Decimal(input.config.chargePowerKw)
          .mul(intervalHours)
          .minus(chargeFromSolar),
        chargeEfficiency: new Decimal(input.config.chargeEfficiency),
      });
      chargeFromGrid = gridCharge.sourceKwh;
      soc = gridCharge.nextSoc;
      afterImport = afterImport.plus(chargeFromGrid);
    }

    const dischargeRequest = resolveDischargeRequest({
      strategy,
      baselineImport,
      intervalHours,
      periodType,
      thresholdKw: input.config.peakShavingThresholdKw,
    });
    if (dischargeRequest.gt(0)) {
      const discharge = dischargeBattery({
        requestedLoadKwh: dischargeRequest,
        soc,
        minSocKwh: protectedMinSoc,
        dischargePowerKwh: new Decimal(input.config.dischargePowerKw).mul(
          intervalHours,
        ),
        dischargeEfficiency: new Decimal(input.config.dischargeEfficiency),
      });
      dischargeToLoad = discharge.deliveredKwh;
      soc = discharge.nextSoc;
      afterImport = Decimal.max(afterImport.minus(dischargeToLoad), zero);
    }

    if (strategy === "BACKUP_RESERVE" && afterExport.gt(0)) {
      curtailed = afterExport;
      afterExport = zero;
    }

    const beforePower = new Decimal(load.powerKw ?? loadKwh.div(intervalHours));
    const afterPower = afterImport.div(intervalHours);
    totalLoad = totalLoad.plus(loadKwh);
    totalSolar = totalSolar.plus(solarKwh);
    totalCharged = totalCharged.plus(chargeFromSolar).plus(chargeFromGrid);
    totalDischarged = totalDischarged.plus(dischargeToLoad);
    chargedFromSolar = chargedFromSolar.plus(chargeFromSolar);
    chargedFromGrid = chargedFromGrid.plus(chargeFromGrid);
    dischargedToLoad = dischargedToLoad.plus(dischargeToLoad);
    gridImportBefore = gridImportBefore.plus(baselineImport);
    gridImportAfter = gridImportAfter.plus(afterImport);
    gridExportBefore = gridExportBefore.plus(baselineExport);
    gridExportAfter = gridExportAfter.plus(afterExport);
    peakBefore = Decimal.max(peakBefore, beforePower);
    peakAfter = Decimal.max(peakAfter, afterPower);

    intervals.push({
      timestamp: load.timestamp,
      loadKwh: round(loadKwh, 6),
      solarKwh: round(solarKwh, 6),
      availableSolarSurplusKwh: round(baselineExport, 6),
      socBeforeKwh: round(socBefore, 6),
      socAfterKwh: round(soc, 6),
      chargeKwh: round(chargeFromSolar.plus(chargeFromGrid), 6),
      dischargeKwh: round(dischargeToLoad, 6),
      chargeFromSolarKwh: round(chargeFromSolar, 6),
      chargeFromGridKwh: round(chargeFromGrid, 6),
      dischargeToLoadKwh: round(dischargeToLoad, 6),
      gridImportBeforeKwh: round(baselineImport, 6),
      gridImportAfterKwh: round(afterImport, 6),
      gridExportBeforeKwh: round(baselineExport, 6),
      gridExportAfterKwh: round(afterExport, 6),
      curtailedKwh: round(curtailed, 6),
      periodType,
    });
  }

  const selfConsumptionBefore = new Decimal(solarBaseline.selfConsumedKwh);
  const selfConsumptionAfter = selfConsumptionBefore.plus(chargedFromSolar);
  const energyBalanceDelta = gridImportBefore
    .plus(chargedFromGrid)
    .plus(totalSolar)
    .minus(totalLoad)
    .minus(gridExportAfter)
    .minus(dischargedToLoad)
    .minus(chargedFromSolar)
    .minus(chargedFromGrid);
  const criticalLoadKw =
    input.config.criticalLoadKw ?? averageLoadKw(loadIntervals);
  const backupHours =
    criticalLoadKw > 0 ? reserveKwh.div(criticalLoadKw) : null;
  if (soc.lt(protectedMinSoc))
    warnings.push("Battery SOC fell below protected reserve.");

  return {
    strategy,
    intervalMinutes,
    intervals,
    totalLoadKwh: round(totalLoad, 6),
    totalSolarKwh: round(totalSolar, 6),
    totalChargedKwh: round(totalCharged, 6),
    totalDischargedKwh: round(totalDischarged, 6),
    chargedFromSolarKwh: round(chargedFromSolar, 6),
    chargedFromGridKwh: round(chargedFromGrid, 6),
    dischargedToLoadKwh: round(dischargedToLoad, 6),
    gridImportBeforeKwh: round(gridImportBefore, 6),
    gridImportAfterKwh: round(gridImportAfter, 6),
    gridExportBeforeKwh: round(gridExportBefore, 6),
    gridExportAfterKwh: round(gridExportAfter, 6),
    solarSelfConsumptionBeforeKwh: round(selfConsumptionBefore, 6),
    solarSelfConsumptionAfterKwh: round(selfConsumptionAfter, 6),
    selfConsumptionBeforeRatio: ratio(selfConsumptionBefore, totalSolar),
    selfConsumptionAfterRatio: ratio(selfConsumptionAfter, totalSolar),
    peakDemandBeforeKw: round(peakBefore, 6),
    peakDemandAfterKw: round(peakAfter, 6),
    backupReserveKwh: round(reserveKwh, 6),
    estimatedBackupHours: backupHours === null ? null : round(backupHours, 2),
    energyBalanceDeltaKwh: round(energyBalanceDelta, 6),
    warnings,
    solarBaseline,
  };
}

export type BatteryAnalysisInput = {
  loadIntervals: LoadIntervalInput[];
  solarIntervals?: SolarGenerationIntervalInput[] | undefined;
  normalTariff: TariffVersionConfig;
  touTariff: TariffVersionConfig;
  config: BatteryConfigInput;
  financialAssumptions: FinancialAssumptions;
  billDate?: string | undefined;
  meterMode?: "normal" | "tou" | undefined;
  monthlyScaleFactor?: number | undefined;
};

export function runBatteryAnalysis(
  input: BatteryAnalysisInput,
): BatteryAnalysisResult {
  const loadIntervals = normalizeLoadIntervals(input.loadIntervals);
  const dispatch = simulateBatteryDispatch({
    loadIntervals,
    solarIntervals: input.solarIntervals,
    touTariff: input.touTariff,
    config: input.config,
  });
  const monthlyScaleFactor =
    input.monthlyScaleFactor ?? inferMonthlyScaleFactor(loadIntervals);
  const beforeIntervals = dispatch.intervals.map((interval) =>
    toLoadInterval(
      interval.timestamp,
      interval.gridImportBeforeKwh,
      dispatch.intervalMinutes,
      monthlyScaleFactor,
    ),
  );
  const afterIntervals = dispatch.intervals.map((interval) =>
    toLoadInterval(
      interval.timestamp,
      interval.gridImportAfterKwh,
      dispatch.intervalMinutes,
      monthlyScaleFactor,
    ),
  );
  const billBeforeBattery = calculateBillForMode({
    mode: input.meterMode ?? "tou",
    normalTariff: input.normalTariff,
    touTariff: input.touTariff,
    billDate:
      input.billDate ??
      getBangkokDate(
        loadIntervals[0]?.timestamp ?? input.normalTariff.effectiveFrom,
      ),
    intervals: beforeIntervals,
  });
  const billAfterBattery = calculateBillForMode({
    mode: input.meterMode ?? "tou",
    normalTariff: input.normalTariff,
    touTariff: input.touTariff,
    billDate:
      input.billDate ??
      getBangkokDate(
        loadIntervals[0]?.timestamp ?? input.normalTariff.effectiveFrom,
      ),
    intervals: afterIntervals,
  });
  const monthlySavings = new Decimal(billBeforeBattery.grandTotal).minus(
    billAfterBattery.grandTotal,
  );
  const annualBillSavings = monthlySavings.mul(12);
  const financialTrace = calculateFinancials({
    annualBillSavingsThb: annualBillSavings.toNumber(),
    annualExportRevenueThb: 0,
    annualGenerationKwh: new Decimal(dispatch.totalDischargedKwh)
      .mul(monthlyScaleFactor)
      .mul(12)
      .toNumber(),
    assumptions: {
      ...input.financialAssumptions,
      capexThb: input.config.capexThb,
      oAndMCostPerYear: input.config.oAndMCostPerYear,
      inverterReplacementCostThb: input.config.replacementCostThb,
      inverterReplacementYear: input.config.replacementYear,
    },
  });
  const financial: BatteryFinancialResult = {
    billBeforeBatteryThb: round(billBeforeBattery.grandTotal, 2),
    billAfterBatteryThb: round(billAfterBattery.grandTotal, 2),
    annualBillSavingsThb: round(annualBillSavings, 2),
    increasedSelfConsumptionKwh: round(
      new Decimal(dispatch.solarSelfConsumptionAfterKwh)
        .minus(dispatch.solarSelfConsumptionBeforeKwh)
        .mul(monthlyScaleFactor)
        .mul(12),
      6,
    ),
    exportRevenueReductionThb: 0,
    simplePaybackYears: financialTrace.simplePaybackYears,
    discountedPaybackYears: financialTrace.discountedPaybackYears,
    roiPercent: financialTrace.roiPercent,
    npvThb: financialTrace.npvThb,
    irrPercent: financialTrace.irrPercent,
    costPerUsableKwh:
      input.config.usableCapacityKwh > 0
        ? round(
            new Decimal(input.config.capexThb).div(
              input.config.usableCapacityKwh,
            ),
            4,
          )
        : null,
    costPerCycle:
      input.config.cycleLife && input.config.cycleLife > 0
        ? round(
            new Decimal(input.config.capexThb)
              .div(input.config.usableCapacityKwh)
              .div(input.config.cycleLife),
            6,
          )
        : null,
    financialTrace,
  };

  return {
    dispatch,
    billBeforeBattery,
    billAfterBattery,
    financial,
    recommendations: buildBatteryRecommendations({
      dispatch,
      financial,
      config: input.config,
    }),
  };
}

export function createBatteryAnalysisInputFromCanonicalLoadProfile(
  input: Omit<BatteryAnalysisInput, "loadIntervals" | "billDate"> & {
    profile: CanonicalLoadProfile;
    billDate?: string | undefined;
  },
): BatteryAnalysisInput {
  const { profile, billDate, ...batteryInput } = input;
  const loadIntervals = canonicalLoadProfileToLoadIntervals(profile);
  return {
    ...batteryInput,
    loadIntervals,
    ...(billDate === undefined
      ? { billDate: profile.period.startInclusive.slice(0, 10) }
      : { billDate }),
  };
}

export function generateEvChargingProfile(input: {
  baseLoadIntervals: LoadIntervalInput[];
  solarIntervals?: SolarGenerationIntervalInput[] | undefined;
  touTariff: TariffVersionConfig;
  config: EvConfigInput;
  strategy?: EvChargingStrategy | undefined;
}): EvChargingProfileResult {
  const errors = validateEvConfig(input.config);
  if (errors.length > 0)
    throw new Error(`Invalid EV config: ${errors.join(", ")}`);

  const base = normalizeLoadIntervals(input.baseLoadIntervals);
  const solar = normalizeSolarIntervals(
    input.solarIntervals ?? [],
    detectIntervalMinutes(base) ?? 60,
  );
  const solarByTimestamp = new Map(
    solar.map((interval) => [interval.timestamp, interval]),
  );
  const strategy = input.strategy ?? input.config.chargingStrategy;
  const intervalMinutes = detectIntervalMinutes(base) ?? 60;
  const intervalHours = intervalMinutes / 60;
  const dailyEnergy = new Decimal(calculateEvDailyEnergyNeeded(input.config));
  const byDate = groupByBangkokDate(base);
  const intervals: EvChargingInterval[] = [];
  const warnings: string[] = [];
  let completedEnergy = zero;
  let outsideEnergy = zero;
  let outsideCost = zero;
  let solarSurplusUsed = zero;
  let gridEnergy = zero;

  for (const [date, dayIntervals] of byDate.entries()) {
    const dayOfWeek = getBangkokParts(
      dayIntervals[0]?.timestamp ?? `${date}T00:00:00.000Z`,
    ).dayOfWeek;
    if (!input.config.chargingDays.includes(dayOfWeek)) continue;
    const homeEnergyTarget = Decimal.min(
      dailyEnergy,
      maxHomeChargeEnergy(input.config),
    );
    const targetShortfall = Decimal.max(
      dailyEnergy.minus(homeEnergyTarget),
      zero,
    );
    if (targetShortfall.gt(0)) {
      outsideEnergy = outsideEnergy.plus(targetShortfall);
      outsideCost = outsideCost.plus(
        targetShortfall.mul(input.config.outsideChargingCostPerKwh),
      );
      warnings.push(
        `Daily EV energy exceeds configured home SOC target on ${date}: ${targetShortfall.toDecimalPlaces(3).toString()} kWh outside charging needed.`,
      );
    }
    let remaining = homeEnergyTarget;
    const candidates = rankEvCandidates({
      intervals: dayIntervals,
      solarByTimestamp,
      touTariff: input.touTariff,
      config: input.config,
      strategy,
    });

    for (const candidate of candidates) {
      if (remaining.lte(0)) break;
      const solarSurplus = candidate.solarSurplusKwh;
      const maxEnergy = new Decimal(input.config.chargerPowerKw).mul(
        intervalHours,
      );
      const energy = Decimal.min(remaining, maxEnergy);
      const canUseSolar =
        (strategy === "SOLAR_SURPLUS" ||
          (strategy === "SMART" && input.config.allowSolarCharging)) &&
        solarSurplus.gt(0);
      const solarEnergy = canUseSolar
        ? Decimal.min(energy, solarSurplus)
        : zero;
      const gridKwh = energy.minus(solarEnergy);
      const cost = gridKwh.mul(candidate.rateThbPerKwh);

      intervals.push({
        timestamp: candidate.interval.timestamp,
        energyKwh: round(energy, 6),
        powerKw: round(energy.div(intervalHours), 6),
        source:
          solarEnergy.gt(0) && gridKwh.eq(0)
            ? "solar_surplus"
            : solarEnergy.gt(0)
              ? "mixed"
              : "grid",
        solarEnergyKwh: round(solarEnergy, 6),
        gridEnergyKwh: round(gridKwh, 6),
        isAtHome: true,
        periodType: candidate.periodType,
        costThb: round(cost, 4),
      });
      remaining = remaining.minus(energy);
      completedEnergy = completedEnergy.plus(energy);
      solarSurplusUsed = solarSurplusUsed.plus(solarEnergy);
      gridEnergy = gridEnergy.plus(gridKwh);
    }

    if (remaining.gt(0)) {
      outsideEnergy = outsideEnergy.plus(remaining);
      outsideCost = outsideCost.plus(
        remaining.mul(input.config.outsideChargingCostPerKwh),
      );
      warnings.push(
        `Charging incomplete on ${date}: ${remaining.toDecimalPlaces(3).toString()} kWh short.`,
      );
    }
  }

  return {
    strategy,
    intervals,
    dailyEnergyNeededKwh: round(dailyEnergy, 6),
    totalEvKwh: round(completedEnergy.plus(outsideEnergy), 6),
    homeChargingKwh: round(completedEnergy, 6),
    outsideChargingKwh: round(outsideEnergy, 6),
    outsideChargingCostThb: round(outsideCost, 4),
    completedEnergyKwh: round(completedEnergy, 6),
    isComplete: warnings.length === 0,
    warnings,
    solarSurplusUsedKwh: round(solarSurplusUsed, 6),
    gridEnergyKwh: round(gridEnergy, 6),
  };
}

export function runEvScenario(input: {
  baseLoadIntervals: LoadIntervalInput[];
  solarIntervals?: SolarGenerationIntervalInput[] | undefined;
  normalTariff: TariffVersionConfig;
  touTariff: TariffVersionConfig;
  config: EvConfigInput;
  strategy: EvChargingStrategy;
  billDate?: string | undefined;
  meterMode?: "normal" | "tou" | undefined;
  monthlyScaleFactor?: number | undefined;
}): EvScenarioResult {
  const base = normalizeLoadIntervals(input.baseLoadIntervals);
  const monthlyScaleFactor =
    input.monthlyScaleFactor ?? inferMonthlyScaleFactor(base);
  const profile = generateEvChargingProfile({
    baseLoadIntervals: base,
    solarIntervals: input.solarIntervals,
    touTariff: input.touTariff,
    config: input.config,
    strategy: input.strategy,
  });
  const evByTimestamp = new Map(
    profile.intervals.map((interval) => [interval.timestamp, interval]),
  );
  const billingBaseIntervals = resolveEvBillingBaseIntervals(
    base,
    input.solarIntervals,
  );
  const intervalMinutes = detectIntervalMinutes(base) ?? 60;
  const intervalHours = intervalMinutes / 60;
  const afterIntervals = billingBaseIntervals.map((interval) => {
    const ev = evByTimestamp.get(interval.timestamp);
    const energy = new Decimal(interval.energyKwh).plus(ev?.gridEnergyKwh ?? 0);
    const basePower = new Decimal(
      interval.powerKw ?? new Decimal(interval.energyKwh).div(intervalHours),
    );
    const evPower = ev
      ? new Decimal(ev.gridEnergyKwh).div(intervalHours)
      : zero;
    return {
      ...interval,
      energyKwh: energy.toNumber(),
      powerKw: basePower.plus(evPower).toNumber(),
    };
  });
  const billDate =
    input.billDate ??
    getBangkokDate(base[0]?.timestamp ?? input.normalTariff.effectiveFrom);
  const billBeforeEv = calculateBillForMode({
    mode: input.meterMode ?? "tou",
    normalTariff: input.normalTariff,
    touTariff: input.touTariff,
    billDate,
    intervals: scaleIntervals(billingBaseIntervals, monthlyScaleFactor),
  });
  const billAfterEv = calculateBillForMode({
    mode: input.meterMode ?? "tou",
    normalTariff: input.normalTariff,
    touTariff: input.touTariff,
    billDate,
    intervals: scaleIntervals(afterIntervals, monthlyScaleFactor),
  });
  const monthlyIncrease = new Decimal(billAfterEv.grandTotal).minus(
    billBeforeEv.grandTotal,
  );
  const days = countUniqueBangkokDates(base);
  const targetDays =
    days > 0 ? new Decimal(days).mul(monthlyScaleFactor) : new Decimal(30);
  const monthlyKm = new Decimal(input.config.dailyDistanceKm)
    .mul(input.config.weeklyDrivingDays)
    .div(7)
    .mul(targetDays);
  const outsideChargingCost = new Decimal(profile.outsideChargingCostThb).mul(
    monthlyScaleFactor,
  );
  const monthlyCost = monthlyIncrease.plus(outsideChargingCost);
  const peakBefore = peakDemandKw(billingBaseIntervals);
  const peakAfter = peakDemandKw(afterIntervals);

  return {
    strategy: input.strategy,
    profile,
    billBeforeEv,
    billAfterEv,
    addedEvKwh: round(
      new Decimal(profile.totalEvKwh).mul(monthlyScaleFactor),
      6,
    ),
    chargingCostThb: round(monthlyCost, 2),
    monthlyBillIncreaseThb: round(monthlyIncrease, 2),
    annualBillIncreaseThb: round(monthlyIncrease.mul(12), 2),
    averageCostPerKm: monthlyKm.gt(0)
      ? round(monthlyCost.div(monthlyKm), 4)
      : null,
    costPer100Km: monthlyKm.gt(0)
      ? round(monthlyCost.div(monthlyKm).mul(100), 2)
      : null,
    gridImportIncreaseKwh: round(
      new Decimal(profile.gridEnergyKwh).mul(monthlyScaleFactor),
      6,
    ),
    peakDemandIncreaseKw: round(new Decimal(peakAfter).minus(peakBefore), 6),
    chargingCompletionStatus: profile.isComplete ? "complete" : "incomplete",
    warnings:
      days < 7
        ? [...profile.warnings, "Load profile covers less than 7 days."]
        : profile.warnings,
  };
}

export type EvScenarioComparisonInput = {
  baseLoadIntervals: LoadIntervalInput[];
  solarIntervals?: SolarGenerationIntervalInput[] | undefined;
  normalTariff: TariffVersionConfig;
  touTariff: TariffVersionConfig;
  config: EvConfigInput;
  billDate?: string | undefined;
  meterMode?: "normal" | "tou" | undefined;
  monthlyScaleFactor?: number | undefined;
};

export function runEvScenarioComparison(
  input: EvScenarioComparisonInput,
): EvScenarioComparisonResult {
  const strategies: EvChargingStrategy[] = [
    "CHARGE_IMMEDIATELY",
    "OFF_PEAK",
    "SMART",
    "SOLAR_SURPLUS",
  ];
  const scenarios = strategies.map((strategy) =>
    runEvScenario({
      ...input,
      strategy,
      config: { ...input.config, chargingStrategy: strategy },
    }),
  );
  const bestChargingStrategy = scenarios.reduce((best, scenario) =>
    isBetterEvStrategy(scenario, best) ? scenario : best,
  );

  return {
    baselineMonthlyBillThb: round(
      scenarios[0]?.billBeforeEv.grandTotal ?? 0,
      2,
    ),
    scenarios,
    bestChargingStrategy,
    recommendations: buildEvRecommendations({
      scenarios,
      best: bestChargingStrategy,
    }),
  };
}

export function createEvScenarioComparisonInputFromCanonicalLoadProfile(
  input: Omit<EvScenarioComparisonInput, "baseLoadIntervals" | "billDate"> & {
    profile: CanonicalLoadProfile;
    billDate?: string | undefined;
  },
): EvScenarioComparisonInput {
  const { profile, billDate, ...evInput } = input;
  return {
    ...evInput,
    baseLoadIntervals: canonicalLoadProfileToLoadIntervals(profile),
    ...(billDate === undefined
      ? { billDate: profile.period.startInclusive.slice(0, 10) }
      : { billDate }),
  };
}

export function createDemoPhase6Input(
  profile: "export_home" | "low_export_home" | "ev_evening" = "export_home",
): Phase6DemoInput {
  const solarDemo = createDemoSolarInput(
    profile === "low_export_home" ? "daytime_shop" : "evening_home",
    {
      systemSizeKwp: profile === "low_export_home" ? 3 : 8,
      capexThb: profile === "low_export_home" ? 120000 : 320000,
      exportEnabled: true,
      exportRateThbPerKwh: 0.8,
    },
  );
  const solarProfile = generateApproxSolarProfile({
    assumptions: solarDemo.solarAssumptions,
    startDate: "2026-01-05",
    days: 7,
    profileName: "ข้อมูลตัวอย่าง Solar สำหรับการประเมิน",
  });
  const costSource: Phase6SourceMetadata = {
    status: "demo",
    sourceUrl: null,
    authority: "Thai Energy Planner demo",
    notes:
      "ต้นทุนอุปกรณ์เป็นค่าตัวอย่างสำหรับการประเมินเบื้องต้น ไม่ใช่ใบเสนอราคาในตลาด.",
  };

  return {
    loadIntervals: solarDemo.loadIntervals,
    solarIntervals: solarProfile.intervals,
    normalTariff: demoNormalTariff,
    touTariff: demoTouTariff,
    batteryConfig: {
      capacityKwh: profile === "low_export_home" ? 5 : 10,
      usableCapacityKwh: profile === "low_export_home" ? 4.5 : 9,
      initialSocPercent: 40,
      minSocPercent: 10,
      maxSocPercent: 95,
      chargePowerKw: 5,
      dischargePowerKw: 5,
      chargeEfficiency: 0.95,
      dischargeEfficiency: 0.95,
      roundTripEfficiency: 0.9025,
      degradationPercentPerYear: 2,
      cycleLife: 5000,
      capexThb: profile === "low_export_home" ? 180000 : 320000,
      oAndMCostPerYear: profile === "low_export_home" ? 1800 : 3200,
      replacementCostThb: profile === "low_export_home" ? 90000 : 160000,
      replacementYear: 10,
      backupReservePercent: 20,
      dispatchStrategy:
        profile === "low_export_home" ? "BACKUP_RESERVE" : "HYBRID",
      peakShavingThresholdKw: 2,
      allowGridCharging: true,
      criticalLoadKw: 0.8,
      costSource,
    },
    evConfig: {
      vehicleName: "Demo EV",
      batteryCapacityKwh: 60,
      efficiencyKmPerKwh: 6,
      dailyDistanceKm: profile === "ev_evening" ? 70 : 45,
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
      chargingStrategy:
        profile === "ev_evening" ? "CHARGE_IMMEDIATELY" : "SMART",
      equipmentCostThb: 35000,
      costSource,
    },
  };
}

export function createDemoBatteryFinancialAssumptions(
  config: BatteryConfigInput,
): FinancialAssumptions {
  return demoFinancialAssumptions(config);
}

export function runDemoBatteryAnalysis(
  profile: "export_home" | "low_export_home" | "ev_evening" = "export_home",
) {
  const demo = createDemoPhase6Input(profile);
  return runBatteryAnalysis({
    loadIntervals: demo.loadIntervals,
    solarIntervals: demo.solarIntervals,
    normalTariff: demo.normalTariff,
    touTariff: demo.touTariff,
    config: demo.batteryConfig,
    financialAssumptions: demoFinancialAssumptions(demo.batteryConfig),
    meterMode: "tou",
    billDate: "2026-02-01",
  });
}

export function runDemoEvComparison(
  profile: "export_home" | "low_export_home" | "ev_evening" = "ev_evening",
) {
  const demo = createDemoPhase6Input(profile);
  return runEvScenarioComparison({
    baseLoadIntervals: demo.loadIntervals,
    solarIntervals: demo.solarIntervals,
    normalTariff: demo.normalTariff,
    touTariff: demo.touTariff,
    config: demo.evConfig,
    meterMode: "tou",
    billDate: "2026-02-01",
  });
}

function buildBatteryRecommendations(input: {
  dispatch: BatteryDispatchResult;
  financial: BatteryFinancialResult;
  config: BatteryConfigInput;
}): BatteryRecommendation[] {
  const recommendations: BatteryRecommendation[] = [];
  const limitations =
    input.config.costSource.status === "demo"
      ? ["Equipment cost is demo/draft, not verified."]
      : [];

  if (
    input.financial.npvThb > 0 &&
    input.financial.simplePaybackYears !== null
  ) {
    recommendations.push({
      type: "financially_viable",
      title: "การลงทุนแบตเตอรี่มีความคุ้มค่าในกรณีนี้",
      explanation: `NPV อยู่ที่ ${input.financial.npvThb} บาท และระยะเวลาคืนทุนคือ ${input.financial.simplePaybackYears} ปี`,
      supportingMetrics: {
        npvThb: input.financial.npvThb,
        paybackYears: input.financial.simplePaybackYears,
      },
      confidence: "medium",
      limitations,
      nextAction: "ควรตรวจสอบราคาและเงื่อนไขการรับประกันก่อนตัดสินใจลงทุน",
    });
  } else {
    recommendations.push({
      type: "not_financial_backup_value",
      title: "การลงทุนแบตเตอรี่ยังไม่คุ้มค่าทางการเงิน",
      explanation: `ประหยัดค่าไฟได้ ${input.financial.annualBillSavingsThb} บาทต่อปี ในขณะที่ต้นทุนสูงถึง ${input.config.capexThb} บาท`,
      supportingMetrics: {
        annualSavingsThb: input.financial.annualBillSavingsThb,
        capexThb: input.config.capexThb,
      },
      confidence: "medium",
      limitations,
      nextAction:
        "แนะนำให้พิจารณาในแง่ของระบบสำรองไฟ หรือลองปรับลดต้นทุน CAPEX ดูอีกครั้ง",
    });
  }

  if (input.dispatch.gridExportBeforeKwh < input.dispatch.totalSolarKwh * 0.1) {
    recommendations.push({
      type: "low_solar_export",
      title: "ปริมาณไฟส่งออกมีน้อยอยู่แล้ว (แบตเตอรี่อาจเกินความจำเป็น)",
      explanation: "ไม่มีไฟโซลาร์ส่วนเกินเหลือพอให้แบตเตอรี่ชาร์จเก็บไว้",
      supportingMetrics: {
        exportBeforeKwh: input.dispatch.gridExportBeforeKwh,
      },
      confidence: "medium",
      limitations,
      nextAction: "ควรเพิ่มขนาดแผงโซลาร์ หรือลดขนาดแบตเตอรี่ลง",
    });
  }

  if (
    input.dispatch.chargedFromSolarKwh <
    input.config.usableCapacityKwh * 0.5
  ) {
    recommendations.push({
      type: "reduce_battery_size",
      title: "แบตเตอรี่อาจมีขนาดใหญ่เกินไปเมื่อเทียบกับไฟที่เหลือ",
      explanation:
        "ปริมาณไฟโซลาร์ที่ชาร์จเข้าแบตเตอรี่ได้มีน้อยมากเมื่อเทียบกับความจุแบตเตอรี่",
      supportingMetrics: {
        chargedFromSolarKwh: input.dispatch.chargedFromSolarKwh,
        usableCapacityKwh: input.config.usableCapacityKwh,
      },
      confidence: "medium",
      limitations,
      nextAction:
        "ลองเปรียบเทียบกับแบตเตอรี่ขนาดเล็กกว่า หรือเพิ่มขนาดแผงโซลาร์",
    });
  }

  if (
    input.dispatch.strategy === "TOU_ARBITRAGE" &&
    input.financial.annualBillSavingsThb <= 0
  ) {
    recommendations.push({
      type: "tou_spread_too_low",
      title: "ส่วนต่างค่าไฟ TOU ยังไม่มากพอ",
      explanation:
        "การสูญเสียพลังงานระหว่างชาร์จและส่วนต่างค่าไฟไม่สามารถสร้างผลกำไรได้ในกรณีนี้",
      supportingMetrics: {
        annualSavingsThb: input.financial.annualBillSavingsThb,
      },
      confidence: "medium",
      limitations,
      nextAction:
        "ตรวจสอบเรทค่าไฟ Peak/Off-Peak ของจริงอีกครั้งก่อนใช้งานระบบชาร์จไฟจากกริด",
    });
  }

  return recommendations;
}

function buildEvRecommendations(input: {
  scenarios: EvScenarioResult[];
  best: EvScenarioResult;
}): EvRecommendation[] {
  const recommendations: EvRecommendation[] = [];
  const immediate = input.scenarios.find(
    (scenario) => scenario.strategy === "CHARGE_IMMEDIATELY",
  );

  if (input.best.strategy === "OFF_PEAK") {
    recommendations.push({
      type: "charge_off_peak",
      title: "การชาร์จช่วง Off-Peak เป็นทางเลือกที่ดีที่สุด",
      explanation: `การชาร์จช่วง Off-Peak ช่วยลดค่าไฟที่เพิ่มขึ้นเหลือ ${input.best.monthlyBillIncreaseThb} บาท/เดือน`,
      supportingMetrics: {
        monthlyBillIncreaseThb: input.best.monthlyBillIncreaseThb,
      },
      confidence: "medium",
      limitations: ["Uses demo tariff data."],
      nextAction: "ตั้งเวลาเครื่องชาร์จให้ทำงานเฉพาะช่วง Off-Peak",
    });
  }

  if (input.best.strategy === "SMART") {
    recommendations.push({
      type: "smart_charging_best",
      title: "ระบบชาร์จอัจฉริยะช่วยประหยัดต้นทุนได้มากที่สุด",
      explanation: "ระบบจะเลือกช่วงเวลาที่ค่าไฟถูกที่สุดในการชาร์จอัตโนมัติ",
      supportingMetrics: {
        monthlyBillIncreaseThb: input.best.monthlyBillIncreaseThb,
      },
      confidence: "medium",
      limitations: ["Requires charger scheduling capability."],
      nextAction: "แนะนำให้เปิดโหมด Smart Charging หรือตั้งเวลาชาร์จล่วงหน้า",
    });
  }

  if (
    input.scenarios.some((scenario) => scenario.profile.solarSurplusUsedKwh > 0)
  ) {
    recommendations.push({
      type: "solar_surplus_available",
      title: "รถ EV สามารถชาร์จด้วยไฟโซลาร์ส่วนเกินได้",
      explanation:
        "หากจอดรถช่วงกลางวัน จะสามารถใช้ไฟโซลาร์ที่เหลือทิ้งมาชาร์จรถเพื่อลดการดึงไฟจากกริดได้",
      supportingMetrics: {
        solarSurplusUsedKwh:
          input.scenarios.find(
            (scenario) => scenario.strategy === "SOLAR_SURPLUS",
          )?.profile.solarSurplusUsedKwh ?? 0,
      },
      confidence: "medium",
      limitations: [
        "Demo assumes charger availability during candidate intervals.",
      ],
      nextAction: "ลองตั้งค่าพฤติกรรมการชาร์จรถช่วงกลางวันที่บ้าน",
    });
  }

  if (
    input.scenarios.some(
      (scenario) => scenario.chargingCompletionStatus === "incomplete",
    )
  ) {
    recommendations.push({
      type: "charging_window_insufficient",
      title: "ระยะเวลาชาร์จอาจไม่เพียงพอ",
      explanation:
        "มีอย่างน้อย 1 กลยุทธ์ที่ไม่สามารถชาร์จไฟได้ตามเป้าหมายก่อนถึงเวลาออกเดินทาง",
      supportingMetrics: {
        incompleteStrategies: input.scenarios.filter(
          (scenario) => scenario.chargingCompletionStatus === "incomplete",
        ).length,
      },
      confidence: "high",
      limitations: [],
      nextAction: "ควรเพิ่มขนาดเครื่องชาร์จ หรือขยายเวลาจอดรถให้นานขึ้น",
    });
  }

  if (immediate && immediate.peakDemandIncreaseKw > 2) {
    recommendations.push({
      type: "peak_impact_high",
      title: "การเสียบชาร์จทันทีทำให้ Peak Demand สูงขึ้น",
      explanation: `การเสียบชาร์จทันทีเมื่อถึงบ้านทำให้ Peak Demand เพิ่มขึ้น ${immediate.peakDemandIncreaseKw} kW`,
      supportingMetrics: {
        peakDemandIncreaseKw: immediate.peakDemandIncreaseKw,
      },
      confidence: "medium",
      limitations: [],
      nextAction: "ควรเปลี่ยนไปชาร์จช่วง Off-Peak หรือใช้ระบบ Smart Charging",
    });
  }

  return recommendations;
}

function isBetterEvStrategy(
  candidate: EvScenarioResult,
  current: EvScenarioResult,
) {
  if (candidate.chargingCompletionStatus !== current.chargingCompletionStatus) {
    return candidate.chargingCompletionStatus === "complete";
  }
  if (candidate.chargingCostThb !== current.chargingCostThb)
    return candidate.chargingCostThb < current.chargingCostThb;
  if (candidate.peakDemandIncreaseKw !== current.peakDemandIncreaseKw)
    return candidate.peakDemandIncreaseKw < current.peakDemandIncreaseKw;
  return (
    strategyPriority(candidate.strategy) < strategyPriority(current.strategy)
  );
}

function strategyPriority(strategy: EvChargingStrategy) {
  if (strategy === "SMART") return 0;
  if (strategy === "OFF_PEAK") return 1;
  if (strategy === "SOLAR_SURPLUS") return 2;
  return 3;
}

function resolveEvBillingBaseIntervals(
  base: LoadIntervalInput[],
  solarIntervals?: SolarGenerationIntervalInput[] | undefined,
) {
  if (!solarIntervals || solarIntervals.length === 0) return base;
  const solarBaseline = simulateSolarSelfConsumption({
    loadIntervals: base,
    solarIntervals,
  });
  return solarBaseline.intervalResults.map((interval) => ({
    timestamp: interval.timestamp,
    energyKwh: interval.gridImportKwh,
    powerKw: interval.gridImportPowerKw,
  }));
}

function chargeBattery(input: {
  availableSourceKwh: Decimal;
  soc: Decimal;
  maxSocKwh: Decimal;
  chargePowerKwh: Decimal;
  chargeEfficiency: Decimal;
}) {
  const availableCapacityAtSource = Decimal.max(
    input.maxSocKwh.minus(input.soc),
    zero,
  ).div(input.chargeEfficiency);
  const sourceKwh = Decimal.max(
    zero,
    Decimal.min(
      input.availableSourceKwh,
      input.chargePowerKwh,
      availableCapacityAtSource,
    ),
  );
  return {
    sourceKwh,
    nextSoc: input.soc.plus(sourceKwh.mul(input.chargeEfficiency)),
  };
}

function dischargeBattery(input: {
  requestedLoadKwh: Decimal;
  soc: Decimal;
  minSocKwh: Decimal;
  dischargePowerKwh: Decimal;
  dischargeEfficiency: Decimal;
}) {
  const deliverableFromSoc = Decimal.max(
    input.soc.minus(input.minSocKwh),
    zero,
  ).mul(input.dischargeEfficiency);
  const deliveredKwh = Decimal.max(
    zero,
    Decimal.min(
      input.requestedLoadKwh,
      input.dischargePowerKwh,
      deliverableFromSoc,
    ),
  );
  return {
    deliveredKwh,
    nextSoc: input.soc.minus(deliveredKwh.div(input.dischargeEfficiency)),
  };
}

function resolveDischargeRequest(input: {
  strategy: BatteryDispatchStrategy;
  baselineImport: Decimal;
  intervalHours: number;
  periodType: "peak" | "off_peak" | "unknown";
  thresholdKw?: number | undefined;
}) {
  if (
    input.strategy === "SOLAR_SELF_CONSUMPTION" ||
    input.strategy === "HYBRID"
  )
    return input.baselineImport;
  if (input.strategy === "TOU_ARBITRAGE" && input.periodType === "peak")
    return input.baselineImport;
  if (input.strategy === "PEAK_SHAVING") {
    const thresholdKwh = new Decimal(input.thresholdKw ?? 0).mul(
      input.intervalHours,
    );
    return Decimal.max(input.baselineImport.minus(thresholdKwh), zero);
  }
  return zero;
}

function supportsSolarCharging(strategy: BatteryDispatchStrategy) {
  return (
    strategy === "SOLAR_SELF_CONSUMPTION" ||
    strategy === "HYBRID" ||
    strategy === "BACKUP_RESERVE"
  );
}

function supportsGridCharging(strategy: BatteryDispatchStrategy) {
  return strategy === "TOU_ARBITRAGE" || strategy === "PEAK_SHAVING";
}

function rankEvCandidates(input: {
  intervals: LoadIntervalInput[];
  solarByTimestamp: Map<string, SolarGenerationIntervalInput>;
  touTariff: TariffVersionConfig;
  config: EvConfigInput;
  strategy: EvChargingStrategy;
}) {
  const candidates = input.intervals
    .filter((interval) =>
      isAtHome(
        interval.timestamp,
        input.config.arrivalTime,
        input.config.departureTime,
      ),
    )
    .map((interval) => {
      const period = classifyTouPeriod(input.touTariff, interval.timestamp);
      const rate = touRate(input.touTariff, interval.timestamp);
      const solar = input.solarByTimestamp.get(interval.timestamp);
      const solarSurplusKwh = Decimal.max(
        new Decimal(solar?.generationKwh ?? 0).minus(interval.energyKwh),
        zero,
      );
      return {
        interval,
        periodType: period,
        rateThbPerKwh: rate,
        solarSurplusKwh,
      };
    });

  if (input.strategy === "CHARGE_IMMEDIATELY")
    return candidates.sort((a, b) =>
      a.interval.timestamp.localeCompare(b.interval.timestamp),
    );
  if (input.strategy === "OFF_PEAK") {
    if (!input.config.allowOffPeakCharging) return [];
    return candidates
      .filter((item) => item.periodType === "off_peak")
      .sort((a, b) => a.interval.timestamp.localeCompare(b.interval.timestamp));
  }
  if (input.strategy === "SOLAR_SURPLUS") {
    if (!input.config.allowSolarCharging) return [];
    return candidates
      .filter((item) => item.solarSurplusKwh.gt(0))
      .sort((a, b) => b.solarSurplusKwh.comparedTo(a.solarSurplusKwh));
  }
  if (!input.config.allowSmartCharging)
    return candidates.sort((a, b) =>
      a.interval.timestamp.localeCompare(b.interval.timestamp),
    );
  return candidates.sort((a, b) => {
    const aCost =
      a.solarSurplusKwh.gt(0) && input.config.allowSolarCharging
        ? zero
        : a.rateThbPerKwh;
    const bCost =
      b.solarSurplusKwh.gt(0) && input.config.allowSolarCharging
        ? zero
        : b.rateThbPerKwh;
    return (
      aCost.comparedTo(bCost) ||
      a.interval.timestamp.localeCompare(b.interval.timestamp)
    );
  });
}

function classifyTouPeriod(
  tariffVersion: TariffVersionConfig,
  timestamp: string,
): "peak" | "off_peak" {
  const localDate = getBangkokDate(timestamp);
  const isHoliday = tariffVersion.holidays.some(
    (holiday) => getBangkokDate(holiday.date) === localDate,
  );
  return selectTouPeriod(tariffVersion.touPeriods, timestamp, isHoliday)
    .periodType;
}

function touRate(tariffVersion: TariffVersionConfig, timestamp: string) {
  const localDate = getBangkokDate(timestamp);
  const isHoliday = tariffVersion.holidays.some(
    (holiday) => getBangkokDate(holiday.date) === localDate,
  );
  return new Decimal(
    selectTouPeriod(tariffVersion.touPeriods, timestamp, isHoliday)
      .rateThbPerKwh,
  );
}

function calculateBillForMode(input: {
  mode: "normal" | "tou";
  normalTariff: TariffVersionConfig;
  touTariff: TariffVersionConfig;
  billDate: string;
  intervals: LoadIntervalInput[];
}) {
  if (input.mode === "normal") {
    const energy = input.intervals.reduce(
      (sum, interval) => sum.plus(interval.energyKwh),
      zero,
    );
    return calculateNormalBill({
      tariffVersion: input.normalTariff,
      billDate: input.billDate,
      energyKwh: energy.toString(),
    });
  }
  return calculateTouBill({
    tariffVersion: input.touTariff,
    intervals: input.intervals.map(toTariffInterval),
  });
}

function toTariffInterval(interval: LoadIntervalInput) {
  return {
    timestamp: interval.timestamp,
    energyKwh: interval.energyKwh.toString(),
    ...(interval.powerKw === undefined
      ? {}
      : { powerKw: interval.powerKw.toString() }),
  };
}

function scaleIntervals(intervals: LoadIntervalInput[], factor: number) {
  return intervals.map((interval) => {
    const energy = new Decimal(interval.energyKwh).mul(factor);
    const powerKw =
      interval.powerKw !== undefined
        ? new Decimal(interval.powerKw)
            .mul(factor)
            .toDecimalPlaces(6)
            .toNumber()
        : undefined;
    return {
      ...interval,
      energyKwh: energy.toDecimalPlaces(6).toNumber(),
      ...(powerKw === undefined ? {} : { powerKw }),
    };
  });
}

function toLoadInterval(
  timestamp: string,
  energyKwh: number,
  intervalMinutes: number,
  factor: number,
): LoadIntervalInput {
  const energy = new Decimal(energyKwh).mul(factor);
  return {
    timestamp,
    energyKwh: energy.toDecimalPlaces(6).toNumber(),
    powerKw: new Decimal(energyKwh)
      .div(intervalMinutes / 60)
      .toDecimalPlaces(6)
      .toNumber(),
  };
}

function normalizeLoadIntervals(intervals: LoadIntervalInput[]) {
  return intervals
    .map((interval) => {
      const parsed = LoadIntervalSchema.parse(interval);
      return { ...parsed, timestamp: normalizeTimestamp(parsed.timestamp) };
    })
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function normalizeSolarIntervals(
  intervals: SolarGenerationIntervalInput[],
  intervalMinutes: number,
) {
  const intervalHours = intervalMinutes / 60;
  return intervals
    .map((interval) => {
      if (!Number.isFinite(new Date(interval.timestamp).getTime()))
        throw new Error(`Invalid solar timestamp ${interval.timestamp}`);
      if (interval.generationKwh < 0)
        throw new Error("Solar generation cannot be negative");
      if (interval.powerKw !== undefined && interval.powerKw < 0)
        throw new Error("Solar power cannot be negative");
      return {
        timestamp: normalizeTimestamp(interval.timestamp),
        generationKwh: new Decimal(interval.generationKwh)
          .toDecimalPlaces(9)
          .toNumber(),
        powerKw: new Decimal(
          interval.powerKw ?? interval.generationKwh / intervalHours,
        )
          .toDecimalPlaces(9)
          .toNumber(),
      };
    })
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function groupByBangkokDate(intervals: LoadIntervalInput[]) {
  const groups = new Map<string, LoadIntervalInput[]>();
  for (const interval of intervals) {
    const date = getBangkokDate(interval.timestamp);
    groups.set(date, [...(groups.get(date) ?? []), interval]);
  }
  return groups;
}

function isAtHome(
  timestamp: string,
  arrivalTime: string,
  departureTime: string,
) {
  const minute = getBangkokParts(timestamp).minuteOfDay;
  return isMinuteInRange(minute, arrivalTime, departureTime);
}

function isMinuteInRange(
  minuteOfDay: number,
  startTime: string,
  endTime: string,
) {
  const start = timeToMinute(startTime);
  const end = timeToMinute(endTime);
  if (start === end) return true;
  if (start < end) return minuteOfDay >= start && minuteOfDay < end;
  return minuteOfDay >= start || minuteOfDay < end;
}

function isValidTime(time: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) || time === "24:00";
}

function timeToMinute(time: string) {
  if (time === "24:00") return 24 * 60;
  const [hour = "0", minute = "0"] = time.split(":");
  return Number(hour) * 60 + Number(minute);
}

function inferMonthlyScaleFactor(intervals: LoadIntervalInput[]) {
  const days = countUniqueBangkokDates(intervals);
  const firstDate = intervals[0]
    ? getBangkokDate(intervals[0].timestamp)
    : null;
  const targetDays = firstDate ? daysInMonth(firstDate) : 30;
  return days > 0
    ? new Decimal(targetDays).div(days).toDecimalPlaces(6).toNumber()
    : 1;
}

function countUniqueBangkokDates(intervals: LoadIntervalInput[]) {
  return new Set(
    intervals.map((interval) => getBangkokDate(interval.timestamp)),
  ).size;
}

function peakDemandKw(intervals: LoadIntervalInput[]) {
  const intervalMinutes = detectIntervalMinutes(intervals) ?? 60;
  return intervals.reduce(
    (peak, interval) =>
      Math.max(
        peak,
        interval.powerKw ?? interval.energyKwh / (intervalMinutes / 60),
      ),
    0,
  );
}

function averageLoadKw(intervals: LoadIntervalInput[]) {
  const intervalMinutes = detectIntervalMinutes(intervals) ?? 60;
  const total = intervals.reduce(
    (sum, interval) => sum.plus(interval.energyKwh),
    zero,
  );
  return intervals.length > 0
    ? total.div(intervals.length * (intervalMinutes / 60)).toNumber()
    : 0;
}

function maxHomeChargeEnergy(input: EvConfigInput) {
  return new Decimal(input.batteryCapacityKwh)
    .mul(input.targetSocPercent - input.initialSocPercent)
    .div(100)
    .div(input.chargerEfficiency);
}

function normalizeTimestamp(timestamp: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) return timestamp;
  const parsed = new Date(timestamp);
  if (!Number.isFinite(parsed.getTime()))
    throw new Error(`Invalid timestamp ${timestamp}`);
  return parsed.toISOString();
}

function daysInMonth(date: string) {
  const [year = "2026", month = "01"] = date.split("-");
  return new Date(Number(year), Number(month), 0).getDate();
}

function getBangkokDate(timestamp: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) return timestamp;
  return getBangkokParts(timestamp).date;
}

function getBangkokParts(timestamp: string) {
  const parts = Object.fromEntries(
    bangkokFormatter
      .formatToParts(new Date(timestamp))
      .map((part) => [part.type, part.value]),
  );
  const dayOfWeek = dayOfWeekByName[parts.weekday ?? ""] ?? 0;
  const hour = Number(parts.hour ?? 0);
  const minute = Number(parts.minute ?? 0);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
    minute,
    dayOfWeek,
    minuteOfDay: hour * 60 + minute,
  };
}

function demoFinancialAssumptions(
  config: BatteryConfigInput,
): FinancialAssumptions {
  return {
    projectLifeYears: 15,
    discountRatePercent: 6,
    electricityEscalationRatePercent: 2,
    inflationRatePercent: 2,
    oAndMEscalationRatePercent: 2,
    degradationRatePercent: config.degradationPercentPerYear,
    capexThb: config.capexThb,
    oAndMCostPerYear: config.oAndMCostPerYear,
    inverterReplacementCostThb: config.replacementCostThb,
    inverterReplacementYear: config.replacementYear,
    subsidyAmountThb: 0,
    meterChangeCostThb: 0,
    otherInitialCostThb: 0,
  };
}

function ratio(numerator: Decimal, denominator: Decimal) {
  return denominator.gt(0)
    ? numerator.div(denominator).toDecimalPlaces(6).toNumber()
    : 0;
}

function round(value: Decimal.Value, places: number) {
  return new Decimal(value)
    .toDecimalPlaces(places, Decimal.ROUND_HALF_UP)
    .toNumber();
}
