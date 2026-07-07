import Decimal from "decimal.js";
import type { LoadIntervalInput } from "@thai-energy-planner/shared-types";
import { LoadIntervalSchema } from "@thai-energy-planner/shared-types";
import {
  calculateNormalBill,
  calculateTouBill,
  demoNormalTariff,
  demoTouTariff,
  type TariffCalculationResult,
  type TariffVersionConfig,
} from "@thai-energy-planner/tariff-engine";
import {
  detectIntervalMinutes,
  parseCsvLoadProfile,
  type LoadProfilePreview,
} from "./load-data.js";
import { calculateIRR } from "./financial.js";

export const solarEngineVersion = "0.6.0-solar-xhigh";

export type SolarDataStatus = "demo" | "draft" | "verified" | "published";

export type SolarSourceMetadata = {
  status: SolarDataStatus;
  sourceUrl: string | null;
  authority: string;
  notes: string;
  verifiedAt?: string | null | undefined;
};

export type SolarAssumptions = {
  province: string;
  systemSizeKwp: number;
  panelWatt?: number | undefined;
  inverterSizeKw?: number | undefined;
  roofAreaSqm?: number | undefined;
  roofAzimuth?: number | undefined;
  roofTilt?: number | undefined;
  monthlySpecificYieldKwhPerKwp: number[];
  systemLossPercent: number;
  shadingLossPercent: number;
  degradationPercentPerYear: number;
  intervalMinutes: 15 | 30 | 60;
  yieldSource: SolarSourceMetadata;
};

export type ExportPolicy = {
  enabled: boolean;
  exportRateThbPerKwh: number;
  exportLimitKw?: number | undefined;
  status: SolarDataStatus;
  sourceUrl: string | null;
  authority: string;
  notes: string;
  verifiedAt?: string | null | undefined;
};

export type FinancialAssumptions = {
  projectLifeYears: number;
  discountRatePercent: number;
  electricityEscalationRatePercent: number;
  inflationRatePercent: number;
  oAndMEscalationRatePercent: number;
  degradationRatePercent: number;
  capexThb: number;
  oAndMCostPerYear: number;
  inverterReplacementCostThb: number;
  inverterReplacementYear: number | null;
  subsidyAmountThb: number;
  meterChangeCostThb: number;
  otherInitialCostThb: number;
  taxRatePercent?: number | undefined;
  loanAmountThb?: number | undefined;
  interestRatePercent?: number | undefined;
  loanTermYears?: number | undefined;
};

export type SolarGenerationIntervalInput = {
  timestamp: string;
  generationKwh: number;
  powerKw?: number | undefined;
};

export type SolarGenerationProfileResult = {
  profileName: string;
  intervals: SolarGenerationIntervalInput[];
  monthlyGenerationKwh: Array<{ month: string; generationKwh: number }>;
  annualGenerationKwh: number;
  source: SolarSourceMetadata;
  assumptionsSnapshot: SolarAssumptions;
  method: "approximate_yield" | "uploaded_profile";
};

export type SolarSelfConsumptionInterval = {
  timestamp: string;
  loadKwh: number;
  solarKwh: number;
  selfConsumedKwh: number;
  gridImportKwh: number;
  gridExportKwh: number;
  loadPowerKw: number;
  gridImportPowerKw: number;
};

export type SolarMonthlyEnergy = {
  month: string;
  totalLoadKwh: number;
  totalSolarGenerationKwh: number;
  selfConsumedKwh: number;
  gridImportKwh: number;
  gridExportKwh: number;
};

export type SolarSelfConsumptionResult = {
  intervalMinutes: number;
  intervalResults: SolarSelfConsumptionInterval[];
  totalLoadKwh: number;
  totalSolarGenerationKwh: number;
  selfConsumedKwh: number;
  gridImportKwh: number;
  gridExportKwh: number;
  selfConsumptionRatio: number;
  selfSufficiencyRatio: number;
  exportRatio: number;
  solarUtilization: number;
  daytimeLoadKwh: number;
  daytimeSolarCoverage: number;
  peakDemandBeforeKw: number;
  peakDemandAfterKw: number;
  monthlyEnergy: SolarMonthlyEnergy[];
};

export type SolarBillScenario = {
  id:
    | "normal_without_solar"
    | "tou_without_solar"
    | "normal_with_solar"
    | "tou_with_solar";
  label: string;
  meterMode: "normal" | "tou";
  usesSolar: boolean;
  bill: TariffCalculationResult;
  monthlyBillThb: number;
  annualBillThb: number;
  monthlyEnergyKwh: number;
  annualGridImportKwh: number;
  annualGridExportKwh: number;
  monthlyExportRevenueThb: number;
  annualExportRevenueThb: number;
  monthlyBillSavingsThb: number;
  annualBillSavingsThb: number;
  netMonthlyCostThb: number;
  netAnnualCostThb: number;
  effectiveRatePerKwh: number;
};

export type SolarBillComparison = {
  billDate: string;
  monthlyScaleFactor: number;
  exportPolicy: ExportPolicy;
  selfConsumption: SolarSelfConsumptionResult;
  normalWithoutSolar: SolarBillScenario;
  touWithoutSolar: SolarBillScenario;
  normalWithSolar: SolarBillScenario;
  touWithSolar: SolarBillScenario;
  bestWithoutSolar: SolarBillScenario;
  bestWithSolar: SolarBillScenario;
  billBeforeSolar: number;
  billAfterSolar: number;
  billSavings: number;
  exportRevenue: number;
  netAnnualBenefit: number;
  effectiveRateBefore: number;
  effectiveRateAfter: number;
  annualGridImportBefore: number;
  annualGridImportAfter: number;
  annualGridExport: number;
  monthlyBreakdown?: any[] | undefined;
  calculationTrace: {
    engineVersion: string;
    usedIntervalMatching: boolean;
    tariffVersionIds: string[];
    lineItemCount: number;
  };
};

export type SolarCashFlow = {
  year: number;
  grossBenefitThb: number;
  billSavingsThb: number;
  exportRevenueThb: number;
  oAndMCostThb: number;
  replacementCostThb: number;
  loanPaymentThb: number;
  netCashFlowThb: number;
  discountedCashFlowThb: number;
  cumulativeCashFlowThb: number;
  cumulativeDiscountedCashFlowThb: number;
  generationKwh: number;
};

export type FinancialResult = {
  initialInvestmentThb: number;
  annualNetBenefitYear1: number;
  simplePaybackYears: number | null;
  discountedPaybackYears: number | null;
  roiPercent: number;
  npvThb: number;
  irrPercent: number | null;
  lcoeThbPerKwh: number | null;
  presentValueOfSavingsThb: number;
  totalBenefitsThb: number;
  totalCostsThb: number;
  cashFlows: SolarCashFlow[];
  assumptionsSnapshot: FinancialAssumptions;
};

export type SizingOptionResult = {
  systemSizeKwp: number;
  annualGenerationKwh: number;
  annualSelfConsumedKwh: number;
  annualExportedKwh: number;
  selfConsumptionRatio: number;
  annualBillSavingsThb: number;
  annualExportRevenueThb: number;
  annualNetBenefitThb: number;
  capexThb: number;
  simplePaybackYears: number | null;
  npvThb: number;
  irrPercent: number | null;
  roiPercent: number;
};

export type SolarSizingOptimizationResult = {
  options: SizingOptionResult[];
  fastestPayback: SizingOptionResult | null;
  highestNpv: SizingOptionResult | null;
  highestAnnualSavings: SizingOptionResult | null;
  bestSelfConsumption: SizingOptionResult | null;
  constraints: {
    requestedMinKwp: number;
    requestedMaxKwp: number;
    appliedMaxKwp: number;
    stepKwp: number;
    roofAreaSqm: number | null;
    exportLimitKw: number | null;
  };
};

export type SensitivityCaseResult = {
  variable:
    | "capex"
    | "electricity_escalation"
    | "solar_generation"
    | "self_consumption"
    | "discount_rate";
  label: string;
  value: number;
  npvThb: number;
  simplePaybackYears: number | null;
  roiPercent: number;
  impactOnNpvThb: number;
};

export type SensitivityAnalysisResult = {
  baseNpvThb: number;
  cases: SensitivityCaseResult[];
  mostImpactfulVariable: SensitivityCaseResult["variable"] | null;
  downsideCase: SensitivityStressCaseResult;
  upsideCase: SensitivityStressCaseResult;
  breakEvenCapexThb: number | null;
  npvRangeThb: {
    low: number;
    high: number;
  };
};

export type SolarRecommendation = {
  type:
    | "solar_worth_it"
    | "solar_not_worth_it"
    | "low_self_consumption"
    | "reduce_system_size"
    | "increase_system_size"
    | "tou_solar_better"
    | "normal_solar_better"
    | "insufficient_data"
    | "check_roof_shading"
    | "payback_vs_max_savings";
  title: string;
  explanation: string;
  supportingMetrics: Record<string, number | string | null>;
  confidence: "low" | "medium" | "high";
  limitations: string[];
  nextAction: string;
};

export type SolarModelDetailLevel = "easy" | "advanced" | "xhigh";

export type SolarModelRisk = {
  code:
    | "demo_yield_source"
    | "demo_export_policy"
    | "short_load_profile"
    | "no_uploaded_solar_profile"
    | "missing_roof_geometry"
    | "high_shading_loss"
    | "high_export_ratio"
    | "negative_npv";
  severity: "info" | "warning" | "critical";
  title: string;
  explanation: string;
  mitigation: string;
};

export type SolarModelQualityResult = {
  detailLevel: SolarModelDetailLevel;
  level: "low" | "medium" | "high" | "xhigh";
  score: number;
  label: string;
  reasons: string[];
  risks: SolarModelRisk[];
};

export type SensitivityStressCaseResult = {
  label: string;
  npvThb: number;
  simplePaybackYears: number | null;
  irrPercent: number | null;
  annualNetBenefitYear1: number;
  assumptions: {
    capexMultiplier: number;
    benefitMultiplier: number;
    discountRatePercent: number;
    oAndMMultiplier: number;
  };
};

export type SolarAnalysisInput = {
  loadIntervals: LoadIntervalInput[];
  normalTariff: TariffVersionConfig;
  touTariff: TariffVersionConfig;
  solarAssumptions: SolarAssumptions;
  exportPolicy: ExportPolicy;
  financialAssumptions: FinancialAssumptions;
  billDate?: string | undefined;
  monthlyScaleFactor?: number | undefined;
  monthlyScaleFactors?: number[] | undefined;
  solarProfile?: SolarGenerationIntervalInput[] | undefined;
  modelDetailLevel?: SolarModelDetailLevel | undefined;
};

export type SolarAnalysisResult = {
  solarProfile: SolarGenerationProfileResult;
  selfConsumption: SolarSelfConsumptionResult;
  billComparison: SolarBillComparison;
  financial: FinancialResult;
  sizing: SolarSizingOptimizationResult;
  sensitivity: SensitivityAnalysisResult;
  modelQuality: SolarModelQualityResult;
  recommendations: SolarRecommendation[];
};

export type DemoSolarProfileKey =
  "evening_home" | "daytime_home" | "daytime_shop";

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

export function validateSolarAssumptions(input: SolarAssumptions): string[] {
  const errors: string[] = [];
  if (input.systemSizeKwp <= 0)
    errors.push("systemSizeKwp must be greater than 0");
  if (input.roofAreaSqm !== undefined && input.roofAreaSqm < 0)
    errors.push("roofAreaSqm must be non-negative");
  if (
    input.roofAzimuth !== undefined &&
    (input.roofAzimuth < 0 || input.roofAzimuth > 360)
  ) {
    errors.push("roofAzimuth must be between 0 and 360");
  }
  if (
    input.roofTilt !== undefined &&
    (input.roofTilt < 0 || input.roofTilt > 60)
  ) {
    errors.push("roofTilt must be between 0 and 60");
  }
  if (input.systemLossPercent < 0 || input.systemLossPercent > 100)
    errors.push("systemLossPercent must be between 0 and 100");
  if (input.shadingLossPercent < 0 || input.shadingLossPercent > 100)
    errors.push("shadingLossPercent must be between 0 and 100");
  if (input.systemLossPercent + input.shadingLossPercent > 100) {
    errors.push("Combined system loss + shading loss must not exceed 100%");
  }
  if (
    input.degradationPercentPerYear < 0 ||
    input.degradationPercentPerYear > 100
  ) {
    errors.push("degradationPercentPerYear must be between 0 and 100");
  }
  if (![15, 30, 60].includes(input.intervalMinutes))
    errors.push("intervalMinutes must be 15, 30, or 60");
  if (input.monthlySpecificYieldKwhPerKwp.length !== 12) {
    errors.push("monthlySpecificYieldKwhPerKwp must include 12 months");
  }
  if (input.monthlySpecificYieldKwhPerKwp.some((value) => value < 0)) {
    errors.push("monthlySpecificYieldKwhPerKwp cannot include negative values");
  }
  if (!input.yieldSource.status || !input.yieldSource.authority) {
    errors.push("yieldSource must include status and authority");
  }
  return errors;
}

export function validateFinancialAssumptions(
  input: FinancialAssumptions,
): string[] {
  const errors: string[] = [];
  if (input.projectLifeYears <= 0)
    errors.push("projectLifeYears must be greater than 0");
  if (input.discountRatePercent < 0 || input.discountRatePercent > 30) {
    errors.push("discountRatePercent should be between 0 and 30");
  }
  if (input.degradationRatePercent < 0 || input.degradationRatePercent > 100) {
    errors.push("degradationRatePercent must be between 0 and 100");
  }
  if (input.capexThb < 0) errors.push("capexThb must be non-negative");
  if (input.oAndMCostPerYear < 0)
    errors.push("oAndMCostPerYear must be non-negative");
  if (input.inverterReplacementCostThb < 0)
    errors.push("inverterReplacementCostThb must be non-negative");
  if (input.subsidyAmountThb < 0)
    errors.push("subsidyAmountThb must be non-negative");
  if (input.meterChangeCostThb < 0)
    errors.push("meterChangeCostThb must be non-negative");
  if (input.otherInitialCostThb < 0)
    errors.push("otherInitialCostThb must be non-negative");
  if (input.loanAmountThb !== undefined && input.loanAmountThb < 0)
    errors.push("loanAmountThb must be non-negative");
  if (input.loanTermYears !== undefined && input.loanTermYears < 0)
    errors.push("loanTermYears must be non-negative");
  return errors;
}

export function validateExportPolicy(input: ExportPolicy): string[] {
  const errors: string[] = [];
  if (input.exportRateThbPerKwh < 0)
    errors.push("exportRateThbPerKwh must be non-negative");
  if (input.exportLimitKw !== undefined && input.exportLimitKw < 0)
    errors.push("exportLimitKw must be non-negative");
  if (!input.status || !input.authority)
    errors.push("exportPolicy must include status and authority");
  if (!input.notes && !input.sourceUrl)
    errors.push("exportPolicy must include notes or sourceUrl");
  return errors;
}

export function generateApproxSolarProfile(input: {
  assumptions: SolarAssumptions;
  startDate?: string | undefined;
  days?: number | undefined;
  profileName?: string | undefined;
}): SolarGenerationProfileResult {
  const errors = validateSolarAssumptions(input.assumptions);
  if (errors.length > 0)
    throw new Error(`Invalid solar assumptions: ${errors.join(", ")}`);

  const startDate = input.startDate ?? "2026-01-05";
  const days = input.days ?? 7;
  const performanceFactor = solarPerformanceFactor(input.assumptions);
  const intervals: SolarGenerationIntervalInput[] = [];

  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    const date = addLocalDays(startDate, dayOffset);
    const monthIndex = Number(date.slice(5, 7)) - 1;
    const monthYield =
      input.assumptions.monthlySpecificYieldKwhPerKwp[monthIndex] ?? 0;
    const dailyTarget = new Decimal(monthYield)
      .mul(input.assumptions.systemSizeKwp)
      .mul(performanceFactor)
      .div(daysInMonth(date));
    const dailyShape = buildDaylightShape(input.assumptions.intervalMinutes);
    const totalWeight = dailyShape.reduce(
      (sum, item) => sum.plus(item.weight),
      zero,
    );

    for (const point of dailyShape) {
      const generation = totalWeight.gt(0)
        ? dailyTarget.mul(point.weight).div(totalWeight)
        : zero;
      const timestamp = localDateMinuteToBangkokIso(date, point.minuteOfDay);
      const powerKw = generation.div(input.assumptions.intervalMinutes / 60);
      intervals.push({
        timestamp,
        generationKwh: generation.toDecimalPlaces(6).toNumber(),
        powerKw: powerKw.toDecimalPlaces(6).toNumber(),
      });
    }
  }

  const monthlyGenerationKwh =
    input.assumptions.monthlySpecificYieldKwhPerKwp.map((yieldKwh, index) => ({
      month: String(index + 1).padStart(2, "0"),
      generationKwh: new Decimal(yieldKwh)
        .mul(input.assumptions.systemSizeKwp)
        .mul(performanceFactor)
        .toDecimalPlaces(3)
        .toNumber(),
    }));
  const annualGenerationKwh = monthlyGenerationKwh.reduce(
    (sum, row) => sum.plus(row.generationKwh),
    zero,
  );

  return {
    profileName: input.profileName ?? "Approximate solar yield",
    intervals,
    monthlyGenerationKwh,
    annualGenerationKwh: annualGenerationKwh.toDecimalPlaces(3).toNumber(),
    source: input.assumptions.yieldSource,
    assumptionsSnapshot: input.assumptions,
    method: "approximate_yield",
  };
}

export function parseSolarGenerationCsv(
  csvText: string,
  options: {
    intervalMinutes?: 15 | 30 | 60 | undefined;
    source: SolarSourceMetadata;
  },
): LoadProfilePreview & {
  solarIntervals: SolarGenerationIntervalInput[];
  source: SolarSourceMetadata;
} {
  const preview = parseCsvLoadProfile(csvText, {
    mapping: {
      timestamp: "timestamp",
      energyKwh: "generation_kwh",
      powerKw: "power_kw",
    },
    timezone: "Asia/Bangkok",
    ...(options.intervalMinutes === undefined
      ? {}
      : { intervalMinutes: options.intervalMinutes }),
  });

  return {
    ...preview,
    solarIntervals: preview.rows.map((row) => ({
      timestamp: row.timestamp,
      generationKwh: row.energyKwh,
      ...(row.powerKw === undefined ? {} : { powerKw: row.powerKw }),
    })),
    source: options.source,
  };
}

export function simulateSolarSelfConsumption(input: {
  loadIntervals: LoadIntervalInput[];
  solarIntervals: SolarGenerationIntervalInput[];
}): SolarSelfConsumptionResult {
  const loadIntervals = normalizeLoadIntervals(input.loadIntervals);
  const solarIntervals = normalizeSolarIntervals(
    input.solarIntervals,
    detectIntervalMinutes(loadIntervals) ?? undefined,
  );
  const intervalMinutes =
    detectIntervalMinutes(loadIntervals) ??
    detectSolarIntervalMinutes(solarIntervals) ??
    60;
  const intervalHours = intervalMinutes / 60;
  const loadByTimestamp = new Map(
    loadIntervals.map((interval) => [interval.timestamp, interval]),
  );
  const solarByTimestamp = new Map(
    solarIntervals.map((interval) => [interval.timestamp, interval]),
  );
  const timestamps = [
    ...new Set([...loadByTimestamp.keys(), ...solarByTimestamp.keys()]),
  ].sort();
  const monthly = new Map<string, {
    month: string;
    totalLoad: Decimal;
    totalSolar: Decimal;
    selfConsumed: Decimal;
    gridImport: Decimal;
    gridExport: Decimal;
  }>();

  let totalLoad = zero;
  let totalSolar = zero;
  let selfConsumed = zero;
  let gridImport = zero;
  let gridExport = zero;
  let daytimeLoad = zero;
  let daytimeSelfConsumed = zero;
  let peakBefore = zero;
  let peakAfter = zero;
  const intervalResults: SolarSelfConsumptionInterval[] = [];

  for (const timestamp of timestamps) {
    const load = loadByTimestamp.get(timestamp);
    const solar = solarByTimestamp.get(timestamp);
    const loadKwh = new Decimal(load?.energyKwh ?? 0);
    const solarKwh = new Decimal(solar?.generationKwh ?? 0);
    const consumed = Decimal.min(loadKwh, solarKwh);
    const imported = Decimal.max(loadKwh.minus(solarKwh), zero);
    const exported = Decimal.max(solarKwh.minus(loadKwh), zero);
    const loadPowerKw = new Decimal(
      load?.powerKw ?? loadKwh.div(intervalHours),
    );
    const importPowerKw = imported.div(intervalHours);
    const local = getBangkokParts(timestamp);

    totalLoad = totalLoad.plus(loadKwh);
    totalSolar = totalSolar.plus(solarKwh);
    selfConsumed = selfConsumed.plus(consumed);
    gridImport = gridImport.plus(imported);
    gridExport = gridExport.plus(exported);
    peakBefore = Decimal.max(peakBefore, loadPowerKw);
    peakAfter = Decimal.max(peakAfter, importPowerKw);

    if (local.hour >= 6 && local.hour < 18) {
      daytimeLoad = daytimeLoad.plus(loadKwh);
      daytimeSelfConsumed = daytimeSelfConsumed.plus(consumed);
    }

    const month = local.date.slice(0, 7);
    const monthAcc = monthly.get(month) ?? {
      month,
      totalLoad: zero,
      totalSolar: zero,
      selfConsumed: zero,
      gridImport: zero,
      gridExport: zero,
    };
    monthAcc.totalLoad = monthAcc.totalLoad.plus(loadKwh);
    monthAcc.totalSolar = monthAcc.totalSolar.plus(solarKwh);
    monthAcc.selfConsumed = monthAcc.selfConsumed.plus(consumed);
    monthAcc.gridImport = monthAcc.gridImport.plus(imported);
    monthAcc.gridExport = monthAcc.gridExport.plus(exported);
    monthly.set(month, monthAcc);

    intervalResults.push({
      timestamp,
      loadKwh: loadKwh.toDecimalPlaces(6).toNumber(),
      solarKwh: solarKwh.toDecimalPlaces(6).toNumber(),
      selfConsumedKwh: consumed.toDecimalPlaces(6).toNumber(),
      gridImportKwh: imported.toDecimalPlaces(6).toNumber(),
      gridExportKwh: exported.toDecimalPlaces(6).toNumber(),
      loadPowerKw: loadPowerKw.toDecimalPlaces(6).toNumber(),
      gridImportPowerKw: importPowerKw.toDecimalPlaces(6).toNumber(),
    });
  }

  return {
    intervalMinutes,
    intervalResults,
    totalLoadKwh: round(totalLoad, 6),
    totalSolarGenerationKwh: round(totalSolar, 6),
    selfConsumedKwh: round(selfConsumed, 6),
    gridImportKwh: round(gridImport, 6),
    gridExportKwh: round(gridExport, 6),
    selfConsumptionRatio: ratio(selfConsumed, totalSolar),
    selfSufficiencyRatio: ratio(selfConsumed, totalLoad),
    exportRatio: ratio(gridExport, totalSolar),
    solarUtilization: ratio(selfConsumed, totalSolar),
    daytimeLoadKwh: round(daytimeLoad, 6),
    daytimeSolarCoverage: ratio(daytimeSelfConsumed, daytimeLoad),
    peakDemandBeforeKw: round(peakBefore, 6),
    peakDemandAfterKw: round(peakAfter, 6),
    monthlyEnergy: [...monthly.values()]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((row) => ({
        month: row.month,
        totalLoadKwh: round(row.totalLoad, 6),
        totalSolarGenerationKwh: round(row.totalSolar, 6),
        selfConsumedKwh: round(row.selfConsumed, 6),
        gridImportKwh: round(row.gridImport, 6),
        gridExportKwh: round(row.gridExport, 6),
      })),
  };
}

function getShiftMs(firstTimestamp: string, targetMonth: number, baseYear: number): number {
  const firstParts = getBangkokParts(firstTimestamp);
  const targetDayOfWeek = firstParts.dayOfWeek;

  let targetDay = 1;
  for (let d = 1; d <= 7; d++) {
    const dateStr = `${baseYear}-${String(targetMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const iso = localDateMinuteToBangkokIso(dateStr, 0);
    if (getBangkokParts(iso).dayOfWeek === targetDayOfWeek) {
      targetDay = d;
      break;
    }
  }

  const origMs = new Date(localDateMinuteToBangkokIso(firstParts.date, 0)).getTime();
  const targetMs = new Date(
    localDateMinuteToBangkokIso(
      `${baseYear}-${String(targetMonth).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`,
      0,
    ),
  ).getTime();
  return targetMs - origMs;
}

function shiftProfileToMonth<T extends { timestamp: string }>(
  intervals: T[],
  targetMonth: number,
  baseYear: number,
  overrideShiftMs?: number,
): T[] {
  if (intervals.length === 0) return [];
  const timeShiftMs = overrideShiftMs !== undefined
    ? overrideShiftMs
    : getShiftMs(intervals[0]!.timestamp, targetMonth, baseYear);

  return intervals.map((interval) => ({
    ...interval,
    timestamp: new Date(new Date(interval.timestamp).getTime() + timeShiftMs).toISOString(),
  }));
}

function aggregateTariffResults(results: TariffCalculationResult[]): TariffCalculationResult {
  if (results.length === 0) {
    throw new Error("Cannot aggregate empty results list");
  }
  const first = results[0]!;
  let totalEnergyKwh = zero;
  let totalPeakEnergyKwh = zero;
  let totalOffPeakEnergyKwh = zero;
  let totalBaseEnergyCharge = zero;
  let totalPeakEnergyCharge = zero;
  let totalOffPeakEnergyCharge = zero;
  let totalDemandCharge = zero;
  let totalFtCharge = zero;
  let totalServiceCharge = zero;
  let totalDiscount = zero;
  let totalSubtotalBeforeVat = zero;
  let totalVat = zero;
  let totalGrandTotal = zero;
  const allLineItems: any[] = [];
  const allIntervalTraces: any[] = [];

  for (const r of results) {
    totalEnergyKwh = totalEnergyKwh.plus(r.energyKwh || 0);
    totalPeakEnergyKwh = totalPeakEnergyKwh.plus(r.peakEnergyKwh || 0);
    totalOffPeakEnergyKwh = totalOffPeakEnergyKwh.plus(r.offPeakEnergyKwh || 0);
    totalBaseEnergyCharge = totalBaseEnergyCharge.plus(r.baseEnergyCharge || 0);
    totalPeakEnergyCharge = totalPeakEnergyCharge.plus(r.peakEnergyCharge || 0);
    totalOffPeakEnergyCharge = totalOffPeakEnergyCharge.plus(r.offPeakEnergyCharge || 0);
    totalDemandCharge = totalDemandCharge.plus(r.demandCharge || 0);
    totalFtCharge = totalFtCharge.plus(r.ftCharge || 0);
    totalServiceCharge = totalServiceCharge.plus(r.serviceCharge || 0);
    totalDiscount = totalDiscount.plus(r.discount || 0);
    totalSubtotalBeforeVat = totalSubtotalBeforeVat.plus(r.subtotalBeforeVat || 0);
    totalVat = totalVat.plus(r.vat || 0);
    totalGrandTotal = totalGrandTotal.plus(r.grandTotal || 0);
    if (r.lineItems) allLineItems.push(...r.lineItems);
    if (r.intervalTraces) allIntervalTraces.push(...r.intervalTraces);
  }

  const count = results.length;
  const avgEnergyKwh = totalEnergyKwh.div(count);
  const avgPeakEnergyKwh = totalPeakEnergyKwh.div(count);
  const avgOffPeakEnergyKwh = totalOffPeakEnergyKwh.div(count);
  const avgBaseEnergyCharge = totalBaseEnergyCharge.div(count);
  const avgPeakEnergyCharge = totalPeakEnergyCharge.div(count);
  const avgOffPeakEnergyCharge = totalOffPeakEnergyCharge.div(count);
  const avgDemandCharge = totalDemandCharge.div(count);
  const avgFtCharge = totalFtCharge.div(count);
  const avgServiceCharge = totalServiceCharge.div(count);
  const avgDiscount = totalDiscount.div(count);
  const avgSubtotalBeforeVat = totalSubtotalBeforeVat.div(count);
  const avgVat = totalVat.div(count);
  const avgGrandTotal = totalGrandTotal.div(count);

  const effectiveRate = totalEnergyKwh.gt(0)
    ? totalGrandTotal.div(totalEnergyKwh).toDecimalPlaces(6).toString()
    : "0";

  return {
    mode: first.mode,
    tariffVersionId: first.tariffVersionId,
    tariffVersionLabel: first.tariffVersionLabel,
    tariffStatus: first.tariffStatus,
    sourceUrl: first.sourceUrl,
    verifiedAt: first.verifiedAt,
    tariffSnapshot: first.tariffSnapshot,
    energyKwh: avgEnergyKwh.toDecimalPlaces(6).toString(),
    peakEnergyKwh: avgPeakEnergyKwh.toDecimalPlaces(6).toString(),
    offPeakEnergyKwh: avgOffPeakEnergyKwh.toDecimalPlaces(6).toString(),
    baseEnergyCharge: avgBaseEnergyCharge.toDecimalPlaces(4).toString(),
    peakEnergyCharge: avgPeakEnergyCharge.toDecimalPlaces(4).toString(),
    offPeakEnergyCharge: avgOffPeakEnergyCharge.toDecimalPlaces(4).toString(),
    demandCharge: avgDemandCharge.toDecimalPlaces(4).toString(),
    ftCharge: avgFtCharge.toDecimalPlaces(4).toString(),
    serviceCharge: avgServiceCharge.toDecimalPlaces(4).toString(),
    discount: avgDiscount.toDecimalPlaces(4).toString(),
    subtotalBeforeVat: avgSubtotalBeforeVat.toDecimalPlaces(4).toString(),
    vat: avgVat.toDecimalPlaces(4).toString(),
    grandTotal: avgGrandTotal.toDecimalPlaces(4).toString(),
    effectiveRatePerKwh: effectiveRate,
    lineItems: allLineItems,
    intervalTraces: allIntervalTraces,
    roundingPolicy: first.roundingPolicy,
  };
}

export function calculateBillAfterSolar(input: {
  loadIntervals: LoadIntervalInput[];
  solarIntervals: SolarGenerationIntervalInput[];
  normalTariff: TariffVersionConfig;
  touTariff: TariffVersionConfig;
  exportPolicy: ExportPolicy;
  billDate?: string | undefined;
  monthlyScaleFactor?: number | undefined;
  monthlyScaleFactors?: number[] | undefined;
  solarAssumptions?: SolarAssumptions | undefined;
}): SolarBillComparison {
  if (!input.loadIntervals || input.loadIntervals.length === 0) {
    throw new Error("loadIntervals cannot be empty");
  }

  const exportPolicyErrors = validateExportPolicy(input.exportPolicy);
  if (exportPolicyErrors.length > 0)
    throw new Error(`Invalid export policy: ${exportPolicyErrors.join(", ")}`);

  // Extend Ft periods to cover all dates to avoid "No Ft matched" errors
  const normalTariff = {
    ...input.normalTariff,
    ftPeriods: input.normalTariff.ftPeriods.map((p, idx) => ({
      ...p,
      effectiveFrom: idx === 0 ? "1992-01-01" : p.effectiveFrom,
      effectiveTo: idx === input.normalTariff.ftPeriods.length - 1 ? null : p.effectiveTo,
    })),
  };
  const touTariff = {
    ...input.touTariff,
    ftPeriods: input.touTariff.ftPeriods.map((p, idx) => ({
      ...p,
      effectiveFrom: idx === 0 ? "1992-01-01" : p.effectiveFrom,
      effectiveTo: idx === input.touTariff.ftPeriods.length - 1 ? null : p.effectiveTo,
    })),
  };

  const loadIntervals = normalizeLoadIntervals(input.loadIntervals);
  const billDate =
    input.billDate ??
    getBangkokDate(
      loadIntervals[0]?.timestamp ?? normalTariff.effectiveFrom,
    );

  const uniqueMonths = new Set(
    loadIntervals.map((i) => getBangkokParts(i.timestamp).date.slice(0, 7)),
  );
  const isRepresentative = uniqueMonths.size === 1;

  const firstParts = getBangkokParts(loadIntervals[0]?.timestamp ?? billDate);
  const baseYear = Number(firstParts.date.slice(0, 4));
  const repMonth = Number(firstParts.date.slice(5, 7));
  const totalUniqueDays = countUniqueBangkokDates(loadIntervals);

  const monthlyScaleFactors: number[] = [];
  const baseScaleFactors: number[] = [];
  for (let m = 1; m <= 12; m++) {
    const targetDays = new Date(baseYear, m, 0).getDate();
    let baseSf = 1;
    if (isRepresentative) {
      baseSf = totalUniqueDays > 0 ? targetDays / totalUniqueDays : 1;
    } else {
      const mStr = String(m).padStart(2, "0");
      const uniqueDaysInMonth = new Set(
        loadIntervals
          .filter((i) => getBangkokParts(i.timestamp).date.slice(5, 7) === mStr)
          .map((i) => getBangkokParts(i.timestamp).date)
      ).size;
      baseSf = uniqueDaysInMonth > 0 ? targetDays / uniqueDaysInMonth : 1;
    }
    baseScaleFactors.push(baseSf);
  }

  const growthFactors: number[] = [];
  if (input.monthlyScaleFactors) {
    if (input.monthlyScaleFactors.length !== 12) {
      throw new Error("monthlyScaleFactors must have exactly 12 elements");
    }
    if (input.monthlyScaleFactors.some((v) => v === null || v === undefined)) {
      throw new Error("Scale factors cannot contain undefined or null");
    }
    if (input.monthlyScaleFactors.some((v) => v < 0)) {
      throw new Error("Scale factors cannot be negative");
    }
    growthFactors.push(...input.monthlyScaleFactors);
    for (let i = 0; i < 12; i++) {
      monthlyScaleFactors.push(growthFactors[i]! * baseScaleFactors[i]!);
    }
  } else if (input.monthlyScaleFactor !== undefined) {
    if (input.monthlyScaleFactor < 0) {
      throw new Error("Scale factors cannot be negative");
    }
    for (let i = 0; i < 12; i++) {
      growthFactors.push(input.monthlyScaleFactor);
      monthlyScaleFactors.push(input.monthlyScaleFactor * baseScaleFactors[i]!);
    }
  } else {
    for (let i = 0; i < 12; i++) {
      growthFactors.push(1.0);
    }
    monthlyScaleFactors.push(...baseScaleFactors);
  }

  const monthlyBillsNormalWithoutSolar: TariffCalculationResult[] = [];
  const monthlyBillsTouWithoutSolar: TariffCalculationResult[] = [];
  const monthlyBillsNormalWithSolar: TariffCalculationResult[] = [];
  const monthlyBillsTouWithSolar: TariffCalculationResult[] = [];
  const monthlyExportRevenues: Decimal[] = [];
  const monthlyPhysicalExports: Decimal[] = [];
  const monthlySelfConsumptions: SolarSelfConsumptionResult[] = [];
  const simulatedMonths: number[] = [];

  for (let m = 1; m <= 12; m++) {
    let monthlyLoad = loadIntervals;
    let monthlySolar = input.solarIntervals;

    if (isRepresentative) {
      const timeShiftMs = loadIntervals.length > 0 ? getShiftMs(loadIntervals[0]!.timestamp, m, baseYear) : 0;
      monthlyLoad = shiftProfileToMonth(loadIntervals, m, baseYear, timeShiftMs);
      if (input.solarAssumptions) {
        const repYield = input.solarAssumptions.monthlySpecificYieldKwhPerKwp[repMonth - 1] ?? 110;
        const targetYield = input.solarAssumptions.monthlySpecificYieldKwhPerKwp[m - 1] ?? 110;
        const repDays = daysInMonth(firstParts.date);
        const targetDays = new Date(baseYear, m, 0).getDate();

        const solarScaleRatio = repYield > 0
          ? (targetYield / repYield) * (repDays / targetDays)
          : 1;

        monthlySolar = input.solarIntervals.map((interval) => ({
          ...interval,
          generationKwh: new Decimal(interval.generationKwh).mul(solarScaleRatio).toNumber(),
          powerKw: interval.powerKw !== undefined ? new Decimal(interval.powerKw).mul(solarScaleRatio).toNumber() : undefined,
        }));
      }
      monthlySolar = shiftProfileToMonth(monthlySolar, m, baseYear, timeShiftMs);
    } else {
      const mStr = String(m).padStart(2, "0");
      monthlyLoad = loadIntervals.filter((i) => getBangkokParts(i.timestamp).date.slice(5, 7) === mStr);
      monthlySolar = input.solarIntervals.filter((i) => getBangkokParts(i.timestamp).date.slice(5, 7) === mStr);

      if (monthlyLoad.length === 0) continue;
    }

    simulatedMonths.push(m);
    const sf = monthlyScaleFactors[m - 1] ?? 1;

    const selfConsumption = simulateSolarSelfConsumption({
      loadIntervals: monthlyLoad,
      solarIntervals: monthlySolar,
    });
    monthlySelfConsumptions.push(selfConsumption);

    const billingLoad = scaleLoadIntervals(monthlyLoad, sf);
    const billingImport = scaleGridImportIntervals(selfConsumption, sf);

    const monthlyLoadKwh = sumLoadEnergy(billingLoad);
    const monthlyImportKwh = sumLoadEnergy(billingImport);

    const monthlyPhysicalExport = new Decimal(selfConsumption.gridExportKwh).mul(sf);
    const monthlyBillableExport = sumBillableGridExport(selfConsumption, input.exportPolicy).mul(sf);
    const monthlyExportRevenue = input.exportPolicy.enabled
      ? monthlyBillableExport.mul(input.exportPolicy.exportRateThbPerKwh)
      : zero;

    monthlyExportRevenues.push(monthlyExportRevenue);
    monthlyPhysicalExports.push(monthlyPhysicalExport);

    const peakLoadKw = billingLoad.reduce((max, i) => Math.max(max, i.powerKw ?? 0), 0);
    const peakImportKw = billingImport.reduce((max, i) => Math.max(max, i.powerKw ?? 0), 0);

    monthlyBillsNormalWithoutSolar.push(
      calculateNormalBill({
        tariffVersion: normalTariff,
        billDate,
        energyKwh: monthlyLoadKwh.toString(),
        demandKw: peakLoadKw,
      }),
    );
    monthlyBillsTouWithoutSolar.push(
      calculateTouBill({
        tariffVersion: touTariff,
        intervals: billingLoad.map(toTariffInterval),
        demandKw: peakLoadKw,
      }),
    );
    monthlyBillsNormalWithSolar.push(
      calculateNormalBill({
        tariffVersion: normalTariff,
        billDate,
        energyKwh: monthlyImportKwh.toString(),
        demandKw: peakImportKw,
      }),
    );
    monthlyBillsTouWithSolar.push(
      calculateTouBill({
        tariffVersion: touTariff,
        intervals: billingImport.map(toTariffInterval),
        demandKw: peakImportKw,
      }),
    );
  }

  const annualizationFactor = (!isRepresentative && simulatedMonths.length < 12)
    ? new Decimal(12).div(simulatedMonths.length)
    : new Decimal(1);

  const normalWithoutSolar = buildBillScenario({
    id: "normal_without_solar",
    label: "Normal without Solar",
    monthlyBills: monthlyBillsNormalWithoutSolar,
    monthlyExportRevenues,
    monthlyPhysicalExportsKwh: monthlyPhysicalExports,
    baselineMonthlyBills: monthlyBillsNormalWithoutSolar,
    usesSolar: false,
    annualizationFactor,
  });
  const touWithoutSolar = buildBillScenario({
    id: "tou_without_solar",
    label: "TOU without Solar",
    monthlyBills: monthlyBillsTouWithoutSolar,
    monthlyExportRevenues,
    monthlyPhysicalExportsKwh: monthlyPhysicalExports,
    baselineMonthlyBills: monthlyBillsTouWithoutSolar,
    usesSolar: false,
    annualizationFactor,
  });
  const normalWithSolar = buildBillScenario({
    id: "normal_with_solar",
    label: "Normal + Solar",
    monthlyBills: monthlyBillsNormalWithSolar,
    monthlyExportRevenues,
    monthlyPhysicalExportsKwh: monthlyPhysicalExports,
    baselineMonthlyBills: monthlyBillsNormalWithoutSolar,
    usesSolar: true,
    annualizationFactor,
  });
  const touWithSolar = buildBillScenario({
    id: "tou_with_solar",
    label: "TOU + Solar",
    monthlyBills: monthlyBillsTouWithSolar,
    monthlyExportRevenues,
    monthlyPhysicalExportsKwh: monthlyPhysicalExports,
    baselineMonthlyBills: monthlyBillsTouWithoutSolar,
    usesSolar: true,
    annualizationFactor,
  });

  const bestWithoutSolar = [normalWithoutSolar, touWithoutSolar].sort(
    (a, b) => a.monthlyBillThb - b.monthlyBillThb,
  )[0]!;
  const bestWithSolar = [normalWithSolar, touWithSolar].sort(
    (a, b) => a.netMonthlyCostThb - b.netMonthlyCostThb,
  )[0]!;
  const billSavings = new Decimal(bestWithoutSolar.annualBillThb).minus(
    bestWithSolar.annualBillThb,
  );
  const exportRevenue = new Decimal(bestWithSolar.annualExportRevenueThb);
  const netAnnualBenefit = billSavings.plus(exportRevenue);

  const aggregatedIntervalResults: SolarSelfConsumptionInterval[] = [];
  let totalLoadKwh = zero;
  let totalSolarGenerationKwh = zero;
  let selfConsumedKwh = zero;
  let gridImportKwh = zero;
  let gridExportKwh = zero;
  let daytimeLoadKwh = zero;
  let daytimeSelfConsumed = zero;
  let peakDemandBeforeKw = zero;
  let peakDemandAfterKw = zero;
  const monthlyEnergy: SolarMonthlyEnergy[] = [];

  for (let idx = 0; idx < simulatedMonths.length; idx++) {
    const m = simulatedMonths[idx]!;
    const sf = monthlyScaleFactors[m - 1] ?? 1;
    const sc = monthlySelfConsumptions[idx]!;
    const growthFactor = growthFactors[m - 1] ?? 1;

    totalLoadKwh = totalLoadKwh.plus(new Decimal(sc.totalLoadKwh).mul(sf));
    totalSolarGenerationKwh = totalSolarGenerationKwh.plus(new Decimal(sc.totalSolarGenerationKwh).mul(sf));
    selfConsumedKwh = selfConsumedKwh.plus(new Decimal(sc.selfConsumedKwh).mul(sf));
    gridImportKwh = gridImportKwh.plus(new Decimal(sc.gridImportKwh).mul(sf));
    gridExportKwh = gridExportKwh.plus(new Decimal(sc.gridExportKwh).mul(sf));
    daytimeLoadKwh = daytimeLoadKwh.plus(new Decimal(sc.daytimeLoadKwh).mul(sf));
    daytimeSelfConsumed = daytimeSelfConsumed.plus(new Decimal(sc.daytimeSolarCoverage * sc.daytimeLoadKwh).mul(sf));

    peakDemandBeforeKw = Decimal.max(peakDemandBeforeKw, new Decimal(sc.peakDemandBeforeKw).mul(growthFactor));
    peakDemandAfterKw = Decimal.max(peakDemandAfterKw, new Decimal(sc.peakDemandAfterKw).mul(growthFactor));

    for (const interval of sc.intervalResults) {
      aggregatedIntervalResults.push({
        timestamp: interval.timestamp,
        loadKwh: round(new Decimal(interval.loadKwh).mul(sf).toNumber(), 6),
        solarKwh: round(new Decimal(interval.solarKwh).mul(sf).toNumber(), 6),
        selfConsumedKwh: round(new Decimal(interval.selfConsumedKwh).mul(sf).toNumber(), 6),
        gridImportKwh: round(new Decimal(interval.gridImportKwh).mul(sf).toNumber(), 6),
        gridExportKwh: round(new Decimal(interval.gridExportKwh).mul(sf).toNumber(), 6),
        loadPowerKw: round(new Decimal(interval.loadPowerKw).mul(sf).toNumber(), 6),
        gridImportPowerKw: round(new Decimal(interval.gridImportPowerKw).mul(sf).toNumber(), 6),
      });
    }

    const monthStr = `${baseYear}-${String(m).padStart(2, "0")}`;
    monthlyEnergy.push({
      month: monthStr,
      totalLoadKwh: round(new Decimal(sc.totalLoadKwh).mul(sf), 6),
      totalSolarGenerationKwh: round(new Decimal(sc.totalSolarGenerationKwh).mul(sf), 6),
      selfConsumedKwh: round(new Decimal(sc.selfConsumedKwh).mul(sf), 6),
      gridImportKwh: round(new Decimal(sc.gridImportKwh).mul(sf), 6),
      gridExportKwh: round(new Decimal(sc.gridExportKwh).mul(sf), 6),
    });
  }

  const count = simulatedMonths.length || 1;
  const aggregatedSelfConsumption: SolarSelfConsumptionResult = {
    intervalMinutes: monthlySelfConsumptions[0]?.intervalMinutes ?? 60,
    intervalResults: aggregatedIntervalResults,
    totalLoadKwh: round(totalLoadKwh.div(count), 6),
    totalSolarGenerationKwh: round(totalSolarGenerationKwh.mul(annualizationFactor), 6), // Keep as annual total for runSolarAnalysis/optimizeSolarSize
    selfConsumedKwh: round(selfConsumedKwh.mul(annualizationFactor), 6), // Keep as annual total
    gridImportKwh: round(gridImportKwh.div(count), 6), // Return as monthly average (raw/unscaled)
    gridExportKwh: round(gridExportKwh.div(count), 6), // Return as monthly average (raw/unscaled)
    selfConsumptionRatio: ratio(selfConsumedKwh, totalSolarGenerationKwh),
    selfSufficiencyRatio: ratio(selfConsumedKwh, totalLoadKwh),
    exportRatio: ratio(gridExportKwh, totalSolarGenerationKwh),
    solarUtilization: ratio(selfConsumedKwh, totalSolarGenerationKwh),
    daytimeLoadKwh: round(daytimeLoadKwh.div(count), 6),
    daytimeSolarCoverage: ratio(daytimeSelfConsumed, daytimeLoadKwh),
    peakDemandBeforeKw: round(peakDemandBeforeKw, 6),
    peakDemandAfterKw: round(peakDemandAfterKw, 6),
    monthlyEnergy: monthlyEnergy.sort((a, b) => a.month.localeCompare(b.month)),
  };

  const monthlyBreakdown: any[] = [];
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  for (let idx = 0; idx < simulatedMonths.length; idx++) {
    const m = simulatedMonths[idx]!;
    const sf = monthlyScaleFactors[m - 1] ?? 1;
    const sc = monthlySelfConsumptions[idx]!;
    const normalWithout = monthlyBillsNormalWithoutSolar[idx]!;
    const touWithout = monthlyBillsTouWithoutSolar[idx]!;
    const normalWith = monthlyBillsNormalWithSolar[idx]!;
    const touWith = monthlyBillsTouWithSolar[idx]!;

    const monthlyBillableExport = sumBillableGridExport(sc, input.exportPolicy).mul(sf);
    const monthlyExportRev = input.exportPolicy.enabled
      ? monthlyBillableExport.mul(input.exportPolicy.exportRateThbPerKwh)
      : zero;

    monthlyBreakdown.push({
      monthIndex: m - 1,
      monthName: monthNames[m - 1],
      loadKwh: round(new Decimal(sc.totalLoadKwh).mul(sf), 6),
      solarGenerationKwh: round(new Decimal(sc.totalSolarGenerationKwh).mul(sf), 6),
      selfConsumedKwh: round(new Decimal(sc.selfConsumedKwh).mul(sf), 6),
      gridImportKwh: round(new Decimal(sc.gridImportKwh).mul(sf), 6),
      gridExportKwh: round(new Decimal(sc.gridExportKwh).mul(sf), 6),
      exportRevenueThb: round(monthlyExportRev, 2),
      billBeforeSolarNormalThb: round(normalWithout.grandTotal, 2),
      billBeforeSolarTouThb: round(touWithout.grandTotal, 2),
      billAfterSolarNormalThb: round(normalWith.grandTotal, 2),
      billAfterSolarTouThb: round(touWith.grandTotal, 2),
    });
  }

  const averageMonthlyScaleFactor = input.monthlyScaleFactor ?? (input.monthlyScaleFactors ? (input.monthlyScaleFactors.reduce((a, b) => a + b, 0) / 12) : totalUniqueDays > 0 ? 30.4 / totalUniqueDays : 1);

  return {
    billDate,
    monthlyScaleFactor: averageMonthlyScaleFactor,
    exportPolicy: input.exportPolicy,
    selfConsumption: aggregatedSelfConsumption,
    normalWithoutSolar,
    touWithoutSolar,
    normalWithSolar,
    touWithSolar,
    bestWithoutSolar,
    bestWithSolar,
    billBeforeSolar: bestWithoutSolar.annualBillThb,
    billAfterSolar: bestWithSolar.annualBillThb,
    billSavings: round(billSavings, 2),
    exportRevenue: round(exportRevenue, 2),
    netAnnualBenefit: round(netAnnualBenefit, 2),
    effectiveRateBefore: bestWithoutSolar.effectiveRatePerKwh,
    effectiveRateAfter: bestWithSolar.effectiveRatePerKwh,
    annualGridImportBefore: bestWithoutSolar.annualGridImportKwh,
    annualGridImportAfter: bestWithSolar.annualGridImportKwh,
    annualGridExport: bestWithSolar.annualGridExportKwh,
    monthlyBreakdown,
    calculationTrace: {
      engineVersion: solarEngineVersion,
      usedIntervalMatching: true,
      tariffVersionIds: [
        normalTariff.id,
        touTariff.id,
      ],
      lineItemCount:
        monthlyBillsNormalWithoutSolar.reduce((sum, b) => sum + b.lineItems.length, 0) +
        monthlyBillsTouWithoutSolar.reduce((sum, b) => sum + b.lineItems.length, 0) +
        monthlyBillsNormalWithSolar.reduce((sum, b) => sum + b.lineItems.length, 0) +
        monthlyBillsTouWithSolar.reduce((sum, b) => sum + b.lineItems.length, 0),
    },
  };
}

export function calculateFinancials(input: {
  annualBillSavingsThb: number;
  annualExportRevenueThb: number;
  annualGenerationKwh: number;
  assumptions: FinancialAssumptions;
}): FinancialResult {
  const errors = validateFinancialAssumptions(input.assumptions);
  if (errors.length > 0)
    throw new Error(`Invalid financial assumptions: ${errors.join(", ")}`);

  const assumptions = input.assumptions;
  const projectLife = Math.floor(assumptions.projectLifeYears);
  const discountRate = new Decimal(assumptions.discountRatePercent).div(100);
  const escalationRate = new Decimal(
    assumptions.electricityEscalationRatePercent,
  ).div(100);
  const degradationRate = new Decimal(assumptions.degradationRatePercent).div(
    100,
  );
  const oAndMEscalation = new Decimal(
    assumptions.oAndMEscalationRatePercent || assumptions.inflationRatePercent,
  ).div(100);
  const totalInitialCost = new Decimal(assumptions.capexThb)
    .plus(assumptions.meterChangeCostThb)
    .plus(assumptions.otherInitialCostThb);
  const loanAmount = new Decimal(assumptions.loanAmountThb ?? 0);
  const initialInvestment = Decimal.max(
    zero,
    totalInitialCost.minus(assumptions.subsidyAmountThb).minus(loanAmount),
  );
  const annualLoanPayment = calculateAnnualLoanPayment(assumptions);
  const cashFlows: SolarCashFlow[] = [];
  let cumulative = zero.minus(initialInvestment);
  let cumulativeDiscounted = zero.minus(initialInvestment);
  let totalBenefits = zero;
  let totalCosts = initialInvestment;
  let presentValueOfSavings = zero;
  let presentCostsForLcoe = initialInvestment;
  let presentGeneration = zero;

  cashFlows.push({
    year: 0,
    grossBenefitThb: 0,
    billSavingsThb: 0,
    exportRevenueThb: 0,
    oAndMCostThb: 0,
    replacementCostThb: 0,
    loanPaymentThb: 0,
    netCashFlowThb: round(zero.minus(initialInvestment), 2),
    discountedCashFlowThb: round(zero.minus(initialInvestment), 2),
    cumulativeCashFlowThb: round(cumulative, 2),
    cumulativeDiscountedCashFlowThb: round(cumulativeDiscounted, 2),
    generationKwh: 0,
  });

  for (let year = 1; year <= projectLife; year += 1) {
    const benefitMultiplier = onePlus(escalationRate)
      .pow(year - 1)
      .mul(oneMinus(degradationRate).pow(year - 1));
    const generationMultiplier = oneMinus(degradationRate).pow(year - 1);
    const billSavings = new Decimal(input.annualBillSavingsThb).mul(
      benefitMultiplier,
    );
    const exportRevenue = new Decimal(input.annualExportRevenueThb).mul(
      benefitMultiplier,
    );
    const grossBenefit = billSavings.plus(exportRevenue);
    const oAndM = new Decimal(assumptions.oAndMCostPerYear).mul(
      onePlus(oAndMEscalation).pow(year - 1),
    );
    const replacement =
      assumptions.inverterReplacementYear !== null &&
      assumptions.inverterReplacementYear === year
        ? new Decimal(assumptions.inverterReplacementCostThb)
        : zero;
    const loanPayment =
      year <= (assumptions.loanTermYears ?? 0) ? annualLoanPayment : zero;
    const netCashFlow = grossBenefit
      .minus(oAndM)
      .minus(replacement)
      .minus(loanPayment);
    const discountFactor = onePlus(discountRate).pow(year);
    const discounted = netCashFlow.div(discountFactor);
    const discountedGrossBenefit = grossBenefit.div(discountFactor);
    const discountedCost = oAndM
      .plus(replacement)
      .plus(loanPayment)
      .div(discountFactor);
    const generation = new Decimal(input.annualGenerationKwh).mul(
      generationMultiplier,
    );

    cumulative = cumulative.plus(netCashFlow);
    cumulativeDiscounted = cumulativeDiscounted.plus(discounted);
    totalBenefits = totalBenefits.plus(grossBenefit);
    totalCosts = totalCosts.plus(oAndM).plus(replacement).plus(loanPayment);
    presentValueOfSavings = presentValueOfSavings.plus(discountedGrossBenefit);
    presentCostsForLcoe = presentCostsForLcoe.plus(discountedCost);
    presentGeneration = presentGeneration.plus(generation.div(discountFactor));

    cashFlows.push({
      year,
      grossBenefitThb: round(grossBenefit, 2),
      billSavingsThb: round(billSavings, 2),
      exportRevenueThb: round(exportRevenue, 2),
      oAndMCostThb: round(oAndM, 2),
      replacementCostThb: round(replacement, 2),
      loanPaymentThb: round(loanPayment, 2),
      netCashFlowThb: round(netCashFlow, 2),
      discountedCashFlowThb: round(discounted, 2),
      cumulativeCashFlowThb: round(cumulative, 2),
      cumulativeDiscountedCashFlowThb: round(cumulativeDiscounted, 2),
      generationKwh: round(generation, 3),
    });
  }

  const yearOneNet = new Decimal(cashFlows[1]?.netCashFlowThb ?? 0);
  const simplePaybackYears =
    initialInvestment.gt(0) && yearOneNet.gt(0)
      ? round(initialInvestment.div(yearOneNet), 2)
      : null;
  const discountedPaybackYears = findPaybackYear(
    cashFlows,
    "cumulativeDiscountedCashFlowThb",
  );
  const totalCostForRoi = totalCosts.gt(0) ? totalCosts : new Decimal(1);
  const roiPercent = totalBenefits
    .minus(totalCosts)
    .div(totalCostForRoi)
    .mul(100);
  const npv = new Decimal(
    cashFlows.at(-1)?.cumulativeDiscountedCashFlowThb ?? 0,
  );
  const irrPercent = calculateIRR(
    cashFlows.map((cashFlow) => ({
      year: cashFlow.year,
      amountThb: cashFlow.netCashFlowThb,
    })),
  );
  const lcoe = presentGeneration.gt(0)
    ? presentCostsForLcoe.div(presentGeneration)
    : null;

  return {
    initialInvestmentThb: round(initialInvestment, 2),
    annualNetBenefitYear1: round(yearOneNet, 2),
    simplePaybackYears,
    discountedPaybackYears,
    roiPercent: round(roiPercent, 2),
    npvThb: round(npv, 2),
    irrPercent: irrPercent === null ? null : round(irrPercent, 2),
    lcoeThbPerKwh: lcoe === null ? null : round(lcoe, 4),
    presentValueOfSavingsThb: round(presentValueOfSavings, 2),
    totalBenefitsThb: round(totalBenefits, 2),
    totalCostsThb: round(totalCosts, 2),
    cashFlows,
    assumptionsSnapshot: assumptions,
  };
}

export function optimizeSolarSize(input: {
  loadIntervals: LoadIntervalInput[];
  normalTariff: TariffVersionConfig;
  touTariff: TariffVersionConfig;
  baseSolarAssumptions: SolarAssumptions;
  exportPolicy: ExportPolicy;
  financialAssumptions: FinancialAssumptions;
  billDate?: string | undefined;
  minKwp?: number | undefined;
  maxKwp?: number | undefined;
  stepKwp?: number | undefined;
  roofAreaSqm?: number | undefined;
  sqmPerKwp?: number | undefined;
  selfConsumptionThreshold?: number | undefined;
  monthlyScaleFactor?: number | undefined;
  monthlyScaleFactors?: number[] | undefined;
}): SolarSizingOptimizationResult {
  const loadIntervals = normalizeLoadIntervals(input.loadIntervals);
  const minKwp = input.minKwp ?? 1;
  const requestedMaxKwp = input.maxKwp ?? 20;
  const stepKwp = input.stepKwp ?? 1;
  const sqmPerKwp = input.sqmPerKwp ?? 5;
  const roofLimit =
    input.roofAreaSqm === undefined
      ? requestedMaxKwp
      : input.roofAreaSqm / sqmPerKwp;
  const exportLimit = input.exportPolicy.enabled
    ? (input.exportPolicy.exportLimitKw ?? requestedMaxKwp)
    : requestedMaxKwp;
  const appliedMaxKwp = Math.max(
    minKwp,
    Math.min(requestedMaxKwp, roofLimit, exportLimit),
  );
  const options: SizingOptionResult[] = [];
  const baseSize = input.baseSolarAssumptions.systemSizeKwp;
  const monthlyScaleFactor = input.monthlyScaleFactor;
  const monthlyScaleFactors = input.monthlyScaleFactors;
  const startDate = getBangkokDate(loadIntervals[0]?.timestamp ?? "2026-01-05");
  const days = countUniqueBangkokDates(loadIntervals);
  const MAX_SIZING_ITERATIONS = 100;

  for (let size = minKwp; size <= appliedMaxKwp + 0.000001; size += stepKwp) {
    if (options.length >= MAX_SIZING_ITERATIONS) break;
    const systemSizeKwp = Number(size.toFixed(3));
    const solarAssumptions = { ...input.baseSolarAssumptions, systemSizeKwp };
    const profile = generateApproxSolarProfile({
      assumptions: solarAssumptions,
      startDate,
      days,
      profileName: `${systemSizeKwp} kWp`,
    });
    const billComparison = calculateBillAfterSolar({
      loadIntervals,
      solarIntervals: profile.intervals,
      normalTariff: input.normalTariff,
      touTariff: input.touTariff,
      exportPolicy: input.exportPolicy,
      billDate: input.billDate,
      monthlyScaleFactor,
      monthlyScaleFactors,
      solarAssumptions,
    });
    const scaledFinancial = scaleFinancialAssumptions(
      input.financialAssumptions,
      systemSizeKwp,
      baseSize,
    );
    const billSavingsAnnual = new Decimal(
      billComparison.bestWithoutSolar.annualBillThb,
    ).minus(billComparison.bestWithSolar.annualBillThb);
    const financial = calculateFinancials({
      annualBillSavingsThb: billSavingsAnnual.toNumber(),
      annualExportRevenueThb:
        billComparison.bestWithSolar.annualExportRevenueThb,
      annualGenerationKwh: billComparison.selfConsumption.totalSolarGenerationKwh,
      assumptions: scaledFinancial,
    });

    options.push({
      systemSizeKwp,
      annualGenerationKwh: billComparison.selfConsumption.totalSolarGenerationKwh,
      annualSelfConsumedKwh: billComparison.selfConsumption.selfConsumedKwh,
      annualExportedKwh: billComparison.annualGridExport,
      selfConsumptionRatio: billComparison.selfConsumption.selfConsumptionRatio,
      annualBillSavingsThb: round(billSavingsAnnual, 2),
      annualExportRevenueThb:
        billComparison.bestWithSolar.annualExportRevenueThb,
      annualNetBenefitThb: billComparison.netAnnualBenefit,
      capexThb: scaledFinancial.capexThb,
      simplePaybackYears: financial.simplePaybackYears,
      npvThb: financial.npvThb,
      irrPercent: financial.irrPercent,
      roiPercent: financial.roiPercent,
    });
  }

  const fastestPayback = minBy(
    options.filter((option) => option.simplePaybackYears !== null),
    (option) => option.simplePaybackYears ?? Number.POSITIVE_INFINITY,
  );
  const highestNpv = maxBy(options, (option) => option.npvThb);
  const highestAnnualSavings = maxBy(
    options,
    (option) => option.annualNetBenefitThb,
  );
  const threshold = input.selfConsumptionThreshold ?? 0.7;
  const thresholdOptions = options.filter(
    (option) => option.selfConsumptionRatio >= threshold,
  );
  const bestSelfConsumption = maxBy(
    thresholdOptions.length > 0 ? thresholdOptions : options,
    (option) => option.selfConsumptionRatio,
  );

  return {
    options,
    fastestPayback,
    highestNpv,
    highestAnnualSavings,
    bestSelfConsumption,
    constraints: {
      requestedMinKwp: minKwp,
      requestedMaxKwp,
      appliedMaxKwp,
      stepKwp,
      roofAreaSqm: input.roofAreaSqm ?? null,
      exportLimitKw: input.exportPolicy.enabled
        ? (input.exportPolicy.exportLimitKw ?? null)
        : null,
    },
  };
}

export function runSensitivityAnalysis(input: {
  annualBillSavingsThb: number;
  annualExportRevenueThb: number;
  annualGenerationKwh: number;
  assumptions: FinancialAssumptions;
}): SensitivityAnalysisResult {
  const base = calculateFinancials(input);
  const cases: SensitivityCaseResult[] = [];
  const addCase = (
    variable: SensitivityCaseResult["variable"],
    label: string,
    value: number,
    overrides: {
      annualBillSavingsThb?: number | undefined;
      annualExportRevenueThb?: number | undefined;
      annualGenerationKwh?: number | undefined;
      assumptions?: Partial<FinancialAssumptions> | undefined;
    },
  ) => {
    const candidate = calculateFinancials({
      annualBillSavingsThb:
        overrides.annualBillSavingsThb ?? input.annualBillSavingsThb,
      annualExportRevenueThb:
        overrides.annualExportRevenueThb ?? input.annualExportRevenueThb,
      annualGenerationKwh:
        overrides.annualGenerationKwh ?? input.annualGenerationKwh,
      assumptions: { ...input.assumptions, ...overrides.assumptions },
    });
    cases.push({
      variable,
      label,
      value,
      npvThb: candidate.npvThb,
      simplePaybackYears: candidate.simplePaybackYears,
      roiPercent: candidate.roiPercent,
      impactOnNpvThb: round(
        new Decimal(candidate.npvThb).minus(base.npvThb),
        2,
      ),
    });
  };

  for (const multiplier of [0.8, 0.9, 1, 1.1, 1.2]) {
    addCase("capex", `CAPEX ${Math.round(multiplier * 100)}%`, multiplier, {
      assumptions: {
        capexThb: new Decimal(input.assumptions.capexThb)
          .mul(multiplier)
          .toDecimalPlaces(2)
          .toNumber(),
      },
    });
  }

  for (const escalation of uniqueNumbers([
    0,
    2,
    4,
    input.assumptions.electricityEscalationRatePercent,
  ])) {
    addCase("electricity_escalation", `Escalation ${escalation}%`, escalation, {
      assumptions: { electricityEscalationRatePercent: escalation },
    });
  }

  for (const multiplier of [0.85, 0.9, 1, 1.1]) {
    addCase(
      "solar_generation",
      `Generation ${Math.round(multiplier * 100)}%`,
      multiplier,
      {
        annualBillSavingsThb: input.annualBillSavingsThb * multiplier,
        annualExportRevenueThb: input.annualExportRevenueThb * multiplier,
        annualGenerationKwh: input.annualGenerationKwh * multiplier,
      },
    );
  }

  for (const multiplier of [0.75, 1, 1.15]) {
    addCase(
      "self_consumption",
      `Self consumption ${Math.round(multiplier * 100)}%`,
      multiplier,
      {
        annualBillSavingsThb: input.annualBillSavingsThb * multiplier,
      },
    );
  }

  for (const discountRate of uniqueNumbers([
    Math.max(0, input.assumptions.discountRatePercent - 2),
    input.assumptions.discountRatePercent,
    input.assumptions.discountRatePercent + 2,
  ])) {
    addCase("discount_rate", `Discount ${discountRate}%`, discountRate, {
      assumptions: { discountRatePercent: discountRate },
    });
  }

  const ranges = new Map<SensitivityCaseResult["variable"], number>();
  for (const variable of [
    "capex",
    "electricity_escalation",
    "solar_generation",
    "self_consumption",
    "discount_rate",
  ] as const) {
    const values = cases
      .filter((item) => item.variable === variable)
      .map((item) => item.npvThb);
    if (values.length === 0) continue;
    ranges.set(variable, Math.max(...values) - Math.min(...values));
  }
  const mostImpactfulVariable =
    [...ranges.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const downsideCase = calculateSensitivityStressCase({
    label: "Downside: higher capex, lower generation/self-use, higher discount",
    input,
    capexMultiplier: 1.1,
    benefitMultiplier: 0.85,
    discountRatePercent: input.assumptions.discountRatePercent + 2,
    oAndMMultiplier: 1.15,
  });
  const upsideCase = calculateSensitivityStressCase({
    label: "Upside: lower capex, higher generation/self-use, lower discount",
    input,
    capexMultiplier: 0.9,
    benefitMultiplier: 1.1,
    discountRatePercent: Math.max(0, input.assumptions.discountRatePercent - 1),
    oAndMMultiplier: 0.95,
  });
  const allNpvs = [
    base.npvThb,
    downsideCase.npvThb,
    upsideCase.npvThb,
    ...cases.map((item) => item.npvThb),
  ];
  const breakEvenCapex = new Decimal(input.assumptions.capexThb).plus(
    base.npvThb,
  );

  return {
    baseNpvThb: base.npvThb,
    cases,
    mostImpactfulVariable,
    downsideCase,
    upsideCase,
    breakEvenCapexThb: breakEvenCapex.gte(0) ? round(breakEvenCapex, 2) : null,
    npvRangeThb: {
      low: round(Math.min(...allNpvs), 2),
      high: round(Math.max(...allNpvs), 2),
    },
  };
}

function calculateSensitivityStressCase(input: {
  label: string;
  input: {
    annualBillSavingsThb: number;
    annualExportRevenueThb: number;
    annualGenerationKwh: number;
    assumptions: FinancialAssumptions;
  };
  capexMultiplier: number;
  benefitMultiplier: number;
  discountRatePercent: number;
  oAndMMultiplier: number;
}): SensitivityStressCaseResult {
  const assumptions = input.input.assumptions;
  const result = calculateFinancials({
    annualBillSavingsThb:
      input.input.annualBillSavingsThb * input.benefitMultiplier,
    annualExportRevenueThb:
      input.input.annualExportRevenueThb * input.benefitMultiplier,
    annualGenerationKwh:
      input.input.annualGenerationKwh * input.benefitMultiplier,
    assumptions: {
      ...assumptions,
      capexThb: round(
        new Decimal(assumptions.capexThb).mul(input.capexMultiplier),
        2,
      ),
      discountRatePercent: input.discountRatePercent,
      oAndMCostPerYear: round(
        new Decimal(assumptions.oAndMCostPerYear).mul(input.oAndMMultiplier),
        2,
      ),
      inverterReplacementCostThb: round(
        new Decimal(assumptions.inverterReplacementCostThb).mul(
          input.capexMultiplier,
        ),
        2,
      ),
    },
  });

  return {
    label: input.label,
    npvThb: result.npvThb,
    simplePaybackYears: result.simplePaybackYears,
    irrPercent: result.irrPercent,
    annualNetBenefitYear1: result.annualNetBenefitYear1,
    assumptions: {
      capexMultiplier: input.capexMultiplier,
      benefitMultiplier: input.benefitMultiplier,
      discountRatePercent: input.discountRatePercent,
      oAndMMultiplier: input.oAndMMultiplier,
    },
  };
}

export function buildSolarRecommendations(input: {
  billComparison: SolarBillComparison;
  financial: FinancialResult;
  sizing: SolarSizingOptimizationResult;
  intervalDays: number;
  shadingLossPercent: number;
}): SolarRecommendation[] {
  const recommendations: SolarRecommendation[] = [];
  const limitations =
    input.intervalDays < 30
      ? ["ข้อมูลการใช้ไฟมีน้อยกว่า 30 วัน (ข้อมูลอาจไม่แม่นยำเพียงพอ)"]
      : [];
  const payback = input.financial.simplePaybackYears;

  if (
    input.financial.npvThb > 0 &&
    payback !== null &&
    payback <= input.financial.assumptionsSnapshot.projectLifeYears
  ) {
    recommendations.push({
      type: "solar_worth_it",
      title: "การติดตั้งโซลาร์เซลล์มีความคุ้มค่า",
      explanation: `NPV คือ ${formatMoney(input.financial.npvThb)} บาท และระยะเวลาคืนทุนคือ ${payback} ปี`,
      supportingMetrics: {
        npvThb: input.financial.npvThb,
        paybackYears: payback,
      },
      confidence: input.intervalDays >= 30 ? "high" : "medium",
      limitations,
      nextAction:
        "ควรตรวจสอบสภาพหลังคา, เงาบัง, และเงื่อนไขการรับซื้อไฟก่อนตัดสินใจลงทุน",
    });
  } else {
    recommendations.push({
      type: "solar_not_worth_it",
      title: "การติดตั้งโซลาร์เซลล์อาจจะยังไม่คุ้มค่าในตอนนี้",
      explanation: `NPV คือ ${formatMoney(input.financial.npvThb)} บาท และประหยัดสุทธิต่อปีคือ ${formatMoney(input.billComparison.netAnnualBenefit)} บาท`,
      supportingMetrics: {
        npvThb: input.financial.npvThb,
        annualNetBenefitThb: input.billComparison.netAnnualBenefit,
      },
      confidence: input.intervalDays >= 30 ? "medium" : "low",
      limitations,
      nextAction:
        "ลองตรวจสอบตัวเลขเงินลงทุน (CAPEX) และอัตราการรับซื้อไฟใหม่อีกครั้ง",
    });
  }

  if (input.billComparison.selfConsumption.selfConsumptionRatio < 0.5) {
    recommendations.push({
      type: "low_self_consumption",
      title: "อัตราการใช้ไฟเองต่ำ (Low Self-consumption)",
      explanation:
        "ปริมาณไฟฟ้าส่วนใหญ่ที่ผลิตได้ถูกส่งกลับเข้าสายส่ง แทนที่จะเป็นการนำมาใช้เพื่อลดค่าไฟ",
      supportingMetrics: {
        selfConsumptionRatio:
          input.billComparison.selfConsumption.selfConsumptionRatio,
        exportRatio: input.billComparison.selfConsumption.exportRatio,
      },
      confidence: "medium",
      limitations,
      nextAction:
        "ลองพิจารณาลดขนาดระบบลง หรือปรับพฤติกรรมมาใช้ไฟฟ้าช่วงกลางวันมากขึ้น",
    });
  }

  if (input.billComparison.selfConsumption.exportRatio > 0.4) {
    recommendations.push({
      type: "reduce_system_size",
      title: "พิจารณาลดขนาดระบบลง",
      explanation:
        "มีอัตราการส่งไฟคืนเข้าสายส่งค่อนข้างสูง ซึ่งอาจไม่คุ้มค่าหากการไฟฟ้าให้เรทรับซื้อที่ต่ำ",
      supportingMetrics: {
        exportRatio: input.billComparison.selfConsumption.exportRatio,
      },
      confidence: "medium",
      limitations,
      nextAction:
        "ลองเปรียบเทียบระหว่างไซส์ที่คืนทุนเร็วที่สุด กับไซส์ที่ประหยัดค่าไฟได้มากที่สุด",
    });
  }

  if (
    input.billComparison.selfConsumption.daytimeSolarCoverage < 0.65 &&
    input.billComparison.selfConsumption.exportRatio < 0.2
  ) {
    recommendations.push({
      type: "increase_system_size",
      title: "ยังสามารถเพิ่มขนาดระบบโซลาร์ได้อีก",
      explanation:
        "พฤติกรรมการใช้ไฟตอนกลางวันยังสูงพอที่จะรองรับไฟจากโซลาร์เซลล์ได้มากกว่านี้",
      supportingMetrics: {
        daytimeSolarCoverage:
          input.billComparison.selfConsumption.daytimeSolarCoverage,
        exportRatio: input.billComparison.selfConsumption.exportRatio,
      },
      confidence: "medium",
      limitations,
      nextAction: "ลองพิจารณาเพิ่มขนาดแผง และตรวจสอบพื้นที่หลังคาว่าพอหรือไม่",
    });
  }

  if (
    input.billComparison.touWithSolar.netMonthlyCostThb <
    input.billComparison.normalWithSolar.netMonthlyCostThb
  ) {
    recommendations.push({
      type: "tou_solar_better",
      title: "TOU + โซลาร์ ประหยัดกว่าการใช้มิเตอร์ปกติ",
      explanation:
        "การเปลี่ยนมาใช้มิเตอร์ TOU พร้อมกับติดโซลาร์ จะทำให้ค่าไฟสุทธิต่อเดือนถูกลง",
      supportingMetrics: {
        touSolarNetMonthlyThb:
          input.billComparison.touWithSolar.netMonthlyCostThb,
        normalSolarNetMonthlyThb:
          input.billComparison.normalWithSolar.netMonthlyCostThb,
      },
      confidence: "medium",
      limitations,
      nextAction:
        "ตรวจสอบเงื่อนไขและค่าใช้จ่ายในการขอเปลี่ยนมิเตอร์ TOU กับการไฟฟ้า",
    });
  } else {
    recommendations.push({
      type: "normal_solar_better",
      title: "มิเตอร์ปกติ + โซลาร์ ประหยัดกว่า TOU",
      explanation:
        "จากรูปแบบการใช้ไฟของคุณ การใช้มิเตอร์ปกติควบคู่กับโซลาร์ให้ผลลัพธ์ทางการเงินที่ดีกว่า",
      supportingMetrics: {
        normalSolarNetMonthlyThb:
          input.billComparison.normalWithSolar.netMonthlyCostThb,
        touSolarNetMonthlyThb:
          input.billComparison.touWithSolar.netMonthlyCostThb,
      },
      confidence: "medium",
      limitations,
      nextAction:
        "ยังไม่ต้องเปลี่ยนเป็น TOU แต่อาจกลับมาดูใหม่หากพฤติกรรมการใช้ไฟเปลี่ยนไป",
    });
  }

  if (input.intervalDays < 30) {
    recommendations.push({
      type: "insufficient_data",
      title: "ควรมีข้อมูลการใช้ไฟให้มากขึ้น",
      explanation: `ปัจจุบันระบบมีข้อมูลเพียง ${input.intervalDays} วัน ซึ่งอาจส่งผลให้การประเมินคลาดเคลื่อน`,
      supportingMetrics: { intervalDays: input.intervalDays },
      confidence: "high",
      limitations,
      nextAction:
        "แนะนำให้อัปโหลดข้อมูลบิลหรือ Load Profile ที่ครอบคลุมอย่างน้อย 30 วัน",
    });
  }

  if (input.shadingLossPercent > 10) {
    recommendations.push({
      type: "check_roof_shading",
      title: "ตรวจสอบพื้นที่หลังคาและเงาบัง",
      explanation:
        "พบการสูญเสียประสิทธิภาพจากเงาบังค่อนข้างเยอะ ซึ่งอาจทำให้ผลลัพธ์ NPV และการคืนทุนเปลี่ยนไป",
      supportingMetrics: { shadingLossPercent: input.shadingLossPercent },
      confidence: "medium",
      limitations,
      nextAction:
        "สำรวจพื้นที่จริงเพื่อหาจุดติดตั้งบนหลังคาที่โดนแสงดีที่สุดและไม่มีเงาบัง",
    });
  }

  if (
    input.sizing.fastestPayback &&
    input.sizing.highestAnnualSavings &&
    input.sizing.fastestPayback.systemSizeKwp !==
      input.sizing.highestAnnualSavings.systemSizeKwp
  ) {
    recommendations.push({
      type: "payback_vs_max_savings",
      title: "จุดที่คืนทุนไวสุด ไม่ใช่ขนาดที่ประหยัดที่สุดเสมอไป",
      explanation:
        "ระบบพบว่าเป้าหมายคืนทุนเร็วสุด กับเป้าหมายลดค่าไฟรายปีให้ได้มากที่สุดตกอยู่ที่ระบบคนละขนาดกัน",
      supportingMetrics: {
        fastestPaybackKwp: input.sizing.fastestPayback.systemSizeKwp,
        maxSavingsKwp: input.sizing.highestAnnualSavings.systemSizeKwp,
      },
      confidence: "medium",
      limitations,
      nextAction:
        "ให้ตัดสินใจเลือกจากเป้าหมายหลัก ว่าอยากคืนทุนไว หรืออยากลดยอดบิลค่าไฟให้มากที่สุด",
    });
  }

  return recommendations;
}

export function runSolarAnalysis(
  input: SolarAnalysisInput,
): SolarAnalysisResult {
  const loadIntervals = normalizeLoadIntervals(input.loadIntervals);
  const startDate = getBangkokDate(loadIntervals[0]?.timestamp ?? "2026-01-05");
  const intervalDays = countUniqueBangkokDates(loadIntervals);
  const solarProfile = input.solarProfile
    ? profileFromUploadedIntervals(input.solarProfile, input.solarAssumptions)
    : generateApproxSolarProfile({
        assumptions: input.solarAssumptions,
        startDate,
        days: intervalDays,
        profileName: `${input.solarAssumptions.systemSizeKwp} kWp demo profile`,
      });
  const monthlyScaleFactor = input.monthlyScaleFactor;
  const billComparison = calculateBillAfterSolar({
    loadIntervals,
    solarIntervals: solarProfile.intervals,
    normalTariff: input.normalTariff,
    touTariff: input.touTariff,
    exportPolicy: input.exportPolicy,
    billDate: input.billDate,
    monthlyScaleFactor,
    monthlyScaleFactors: input.monthlyScaleFactors,
    solarAssumptions: input.solarAssumptions,
  });
  const annualBillSavings = new Decimal(
    billComparison.bestWithoutSolar.annualBillThb,
  ).minus(billComparison.bestWithSolar.annualBillThb);
  const annualGenerationKwh = new Decimal(
    billComparison.selfConsumption.totalSolarGenerationKwh,
  );
  const financial = calculateFinancials({
    annualBillSavingsThb: annualBillSavings.toNumber(),
    annualExportRevenueThb: billComparison.bestWithSolar.annualExportRevenueThb,
    annualGenerationKwh: annualGenerationKwh.toNumber(),
    assumptions: input.financialAssumptions,
  });
  const sizing = optimizeSolarSize({
    loadIntervals,
    normalTariff: input.normalTariff,
    touTariff: input.touTariff,
    baseSolarAssumptions: input.solarAssumptions,
    exportPolicy: input.exportPolicy,
    financialAssumptions: input.financialAssumptions,
    billDate: input.billDate,
    minKwp: 1,
    maxKwp: 20,
    stepKwp: 1,
    roofAreaSqm: input.solarAssumptions.roofAreaSqm,
    monthlyScaleFactor: input.monthlyScaleFactor,
    monthlyScaleFactors: input.monthlyScaleFactors,
  });
  const sensitivity = runSensitivityAnalysis({
    annualBillSavingsThb: annualBillSavings.toNumber(),
    annualExportRevenueThb: billComparison.bestWithSolar.annualExportRevenueThb,
    annualGenerationKwh: annualGenerationKwh.toNumber(),
    assumptions: input.financialAssumptions,
  });
  const recommendations = buildSolarRecommendations({
    billComparison,
    financial,
    sizing,
    intervalDays,
    shadingLossPercent: input.solarAssumptions.shadingLossPercent,
  });
  const modelQuality = assessSolarModelQuality({
    detailLevel: input.modelDetailLevel ?? "easy",
    intervalDays,
    hasUploadedSolarProfile: input.solarProfile !== undefined,
    solarAssumptions: input.solarAssumptions,
    exportPolicy: input.exportPolicy,
    billComparison,
    financial,
  });

  return {
    solarProfile,
    selfConsumption: billComparison.selfConsumption,
    billComparison,
    financial,
    sizing,
    sensitivity,
    modelQuality,
    recommendations,
  };
}

export function createDemoSolarInput(
  profile: DemoSolarProfileKey = "evening_home",
  overrides: {
    systemSizeKwp?: number | undefined;
    capexThb?: number | undefined;
    exportRateThbPerKwh?: number | undefined;
    exportEnabled?: boolean | undefined;
    exportLimitKw?: number | undefined;
    discountRatePercent?: number | undefined;
    projectLifeYears?: number | undefined;
    roofAreaSqm?: number | undefined;
    roofAzimuth?: number | undefined;
    roofTilt?: number | undefined;
    systemLossPercent?: number | undefined;
    shadingLossPercent?: number | undefined;
    degradationPercentPerYear?: number | undefined;
    electricityEscalationRatePercent?: number | undefined;
    oAndMCostPerYear?: number | undefined;
    inverterReplacementCostThb?: number | undefined;
    inverterReplacementYear?: number | null | undefined;
    modelDetailLevel?: SolarModelDetailLevel | undefined;
  } = {},
): SolarAnalysisInput {
  const systemSizeKwp =
    overrides.systemSizeKwp ?? (profile === "daytime_shop" ? 8 : 5);
  const capexThb = overrides.capexThb ?? systemSizeKwp * 42000;

  return {
    loadIntervals: createDemoLoadProfile(profile, 7),
    normalTariff: demoNormalTariff,
    touTariff: demoTouTariff,
    billDate: "2026-02-01",
    solarAssumptions: {
      province: "Bangkok demo",
      systemSizeKwp,
      panelWatt: 550,
      inverterSizeKw: systemSizeKwp,
      roofAreaSqm: overrides.roofAreaSqm ?? systemSizeKwp * 6,
      roofAzimuth: overrides.roofAzimuth ?? 180,
      roofTilt: overrides.roofTilt ?? 12,
      monthlySpecificYieldKwhPerKwp: [
        112, 118, 126, 124, 118, 108, 104, 106, 110, 112, 108, 106,
      ],
      systemLossPercent: overrides.systemLossPercent ?? 12,
      shadingLossPercent:
        overrides.shadingLossPercent ?? (profile === "evening_home" ? 8 : 4),
      degradationPercentPerYear: overrides.degradationPercentPerYear ?? 0.5,
      intervalMinutes: 60,
      yieldSource: {
        status: "demo",
        sourceUrl: null,
        authority: "Thai Energy Planner demo",
        notes:
          "Synthetic monthly specific yield for Phase 5 demo only; not verified irradiance data.",
      },
    },
    exportPolicy: {
      enabled: overrides.exportEnabled ?? true,
      exportRateThbPerKwh: overrides.exportRateThbPerKwh ?? 0.8,
      exportLimitKw: overrides.exportLimitKw ?? 10,
      status: "demo",
      sourceUrl: null,
      authority: "Thai Energy Planner demo",
      notes: "Synthetic demo export rate; not an official feed-in tariff.",
    },
    financialAssumptions: {
      projectLifeYears: overrides.projectLifeYears ?? 20,
      discountRatePercent: overrides.discountRatePercent ?? 6,
      electricityEscalationRatePercent:
        overrides.electricityEscalationRatePercent ?? 2,
      inflationRatePercent: 2,
      oAndMEscalationRatePercent: 2,
      degradationRatePercent: 0.5,
      capexThb,
      oAndMCostPerYear: overrides.oAndMCostPerYear ?? capexThb * 0.01,
      inverterReplacementCostThb:
        overrides.inverterReplacementCostThb ?? systemSizeKwp * 5500,
      inverterReplacementYear:
        overrides.inverterReplacementYear === undefined
          ? 10
          : overrides.inverterReplacementYear,
      subsidyAmountThb: 0,
      meterChangeCostThb: 0,
      otherInitialCostThb: 0,
    },
    modelDetailLevel: overrides.modelDetailLevel ?? "easy",
  };
}

export function runDemoSolarAnalysis(
  profile: DemoSolarProfileKey = "evening_home",
  overrides: Parameters<typeof createDemoSolarInput>[1] = {},
): SolarAnalysisResult {
  return runSolarAnalysis(createDemoSolarInput(profile, overrides));
}

function profileFromUploadedIntervals(
  intervals: SolarGenerationIntervalInput[],
  assumptions: SolarAssumptions,
): SolarGenerationProfileResult {
  const normalized = normalizeSolarIntervals(
    intervals,
    assumptions.intervalMinutes,
  );
  const monthMap = new Map<string, Decimal>();
  for (const interval of normalized) {
    const month = getBangkokDate(interval.timestamp).slice(0, 7);
    monthMap.set(
      month,
      (monthMap.get(month) ?? zero).plus(interval.generationKwh),
    );
  }
  const monthlyGenerationKwh = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, generation]) => ({
      month,
      generationKwh: generation.toDecimalPlaces(3).toNumber(),
    }));
  const annualGenerationKwh = monthlyGenerationKwh.reduce(
    (sum, row) => sum.plus(row.generationKwh),
    zero,
  );

  return {
    profileName: "Uploaded solar profile",
    intervals: normalized,
    monthlyGenerationKwh,
    annualGenerationKwh: annualGenerationKwh.toDecimalPlaces(3).toNumber(),
    source: assumptions.yieldSource,
    assumptionsSnapshot: assumptions,
    method: "uploaded_profile",
  };
}

function buildBillScenario(input: {
  id: SolarBillScenario["id"];
  label: string;
  monthlyBills: TariffCalculationResult[];
  monthlyExportRevenues: Decimal[];
  monthlyPhysicalExportsKwh: Decimal[];
  baselineMonthlyBills: TariffCalculationResult[];
  usesSolar: boolean;
  annualizationFactor: Decimal;
}): SolarBillScenario {
  const aggregatedBill = aggregateTariffResults(input.monthlyBills);

  const rawAnnualBill = input.monthlyBills.reduce((sum, b) => sum.plus(b.grandTotal), zero);
  const rawAnnualExportRevenue = input.usesSolar
    ? input.monthlyExportRevenues.reduce((sum, r) => sum.plus(r), zero)
    : zero;
  const rawAnnualGridImportKwh = input.monthlyBills.reduce((sum, b) => sum.plus(b.energyKwh), zero);
  const rawAnnualGridExportKwh = input.usesSolar
    ? input.monthlyPhysicalExportsKwh.reduce((sum, e) => sum.plus(e), zero)
    : zero;

  const rawAnnualBaselineBill = input.baselineMonthlyBills.reduce((sum, b) => sum.plus(b.grandTotal), zero);

  // Apply annualization factor to annual variables
  const annualBill = rawAnnualBill.mul(input.annualizationFactor);
  const annualExportRevenue = rawAnnualExportRevenue.mul(input.annualizationFactor);
  const annualGridImportKwh = rawAnnualGridImportKwh.mul(input.annualizationFactor);
  const annualGridExportKwh = rawAnnualGridExportKwh.mul(input.annualizationFactor);
  const annualBaselineBill = rawAnnualBaselineBill.mul(input.annualizationFactor);

  const annualBillSavings = input.usesSolar
    ? Decimal.max(zero, annualBaselineBill.minus(annualBill))
    : zero;

  const netAnnualCost = annualBill.minus(annualExportRevenue);

  const count = input.monthlyBills.length;
  // Use raw unscaled values for monthly averages
  const monthlyBill = count > 0 ? rawAnnualBill.div(count) : zero;
  const monthlyEnergyKwh = count > 0 ? rawAnnualGridImportKwh.div(count) : zero;
  const monthlyExportRevenue = count > 0 ? rawAnnualExportRevenue.div(count) : zero;
  
  const rawAnnualBillSavings = input.usesSolar
    ? Decimal.max(zero, rawAnnualBaselineBill.minus(rawAnnualBill))
    : zero;
  const monthlyBillSavings = count > 0 ? rawAnnualBillSavings.div(count) : zero;
  
  const rawNetAnnualCost = rawAnnualBill.minus(rawAnnualExportRevenue);
  const netMonthlyCost = count > 0 ? rawNetAnnualCost.div(count) : zero;

  return {
    id: input.id,
    label: input.label,
    meterMode: aggregatedBill.mode,
    usesSolar: input.usesSolar,
    bill: aggregatedBill,
    monthlyBillThb: round(monthlyBill, 2),
    annualBillThb: round(annualBill, 2),
    monthlyEnergyKwh: round(monthlyEnergyKwh, 6),
    annualGridImportKwh: round(annualGridImportKwh, 6),
    annualGridExportKwh: round(annualGridExportKwh, 6),
    monthlyExportRevenueThb: round(monthlyExportRevenue, 2),
    annualExportRevenueThb: round(annualExportRevenue, 2),
    monthlyBillSavingsThb: round(monthlyBillSavings, 2),
    annualBillSavingsThb: round(annualBillSavings, 2),
    netMonthlyCostThb: round(netMonthlyCost, 2),
    netAnnualCostThb: round(netAnnualCost, 2),
    effectiveRatePerKwh: round(aggregatedBill.effectiveRatePerKwh, 6),
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
  fallbackIntervalMinutes?: number | undefined,
) {
  const normalized = intervals.map((interval) => {
    if (!Number.isFinite(new Date(interval.timestamp).getTime()))
      throw new Error(`Invalid solar timestamp ${interval.timestamp}`);
    if (interval.generationKwh < 0)
      throw new Error("Solar generation cannot be negative");
    if (interval.powerKw !== undefined && interval.powerKw < 0)
      throw new Error("Solar power cannot be negative");
    return { ...interval, timestamp: normalizeTimestamp(interval.timestamp) };
  });
  const sorted = normalized.sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  const intervalMinutes =
    detectSolarIntervalMinutes(sorted) ?? fallbackIntervalMinutes ?? 60;
  const intervalHours = intervalMinutes / 60;
  return sorted.map((interval) => {
    return {
      timestamp: interval.timestamp,
      generationKwh: new Decimal(interval.generationKwh)
        .toDecimalPlaces(9)
        .toNumber(),
      powerKw: new Decimal(
        interval.powerKw ?? interval.generationKwh / intervalHours,
      )
        .toDecimalPlaces(9)
        .toNumber(),
    };
  });
}

function detectSolarIntervalMinutes(intervals: SolarGenerationIntervalInput[]) {
  if (intervals.length < 2) return null;
  const sorted = [...intervals].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  const minutes = sorted.slice(1).map((row, index) => {
    const previous = sorted[index];
    if (!previous) return 0;
    return (
      (new Date(row.timestamp).getTime() -
        new Date(previous.timestamp).getTime()) /
      60000
    );
  });
  const positive = minutes.filter((value) => value > 0);
  return positive.length === 0 ? null : mode(positive);
}

function scaleLoadIntervals(
  intervals: LoadIntervalInput[],
  factor: number,
): LoadIntervalInput[] {
  return intervals.map((interval) => {
    const energy = new Decimal(interval.energyKwh).mul(factor);
    return {
      timestamp: interval.timestamp,
      energyKwh: energy.toDecimalPlaces(6).toNumber(),
      ...(interval.powerKw === undefined
        ? {}
        : {
            powerKw: new Decimal(interval.powerKw)
              .mul(factor)
              .toDecimalPlaces(6)
              .toNumber(),
          }),
    };
  });
}

function scaleGridImportIntervals(
  result: SolarSelfConsumptionResult,
  factor: number,
): LoadIntervalInput[] {
  return result.intervalResults.map((interval) => {
    const energy = new Decimal(interval.gridImportKwh).mul(factor);
    const power = new Decimal(interval.gridImportPowerKw).mul(factor);
    return {
      timestamp: interval.timestamp,
      energyKwh: energy.toDecimalPlaces(6).toNumber(),
      powerKw: power.toDecimalPlaces(6).toNumber(),
    };
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

function sumLoadEnergy(intervals: LoadIntervalInput[]) {
  return intervals.reduce(
    (sum, interval) => sum.plus(interval.energyKwh),
    zero,
  );
}

function sumBillableGridExport(
  result: SolarSelfConsumptionResult,
  exportPolicy: ExportPolicy,
) {
  if (!exportPolicy.enabled) return zero;
  const exportLimitKwh =
    exportPolicy.exportLimitKw === undefined
      ? null
      : new Decimal(exportPolicy.exportLimitKw)
          .mul(result.intervalMinutes)
          .div(60);

  return result.intervalResults.reduce((sum, interval) => {
    const exported = new Decimal(interval.gridExportKwh);
    return sum.plus(
      exportLimitKwh === null
        ? exported
        : Decimal.min(exported, exportLimitKwh),
    );
  }, zero);
}

function normalizeTimestamp(timestamp: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) return timestamp;
  const parsed = new Date(timestamp);
  if (!Number.isFinite(parsed.getTime()))
    throw new Error(`Invalid timestamp ${timestamp}`);
  return parsed.toISOString();
}

function solarLossFactor(assumptions: SolarAssumptions) {
  const lossPercent = new Decimal(assumptions.systemLossPercent).plus(
    assumptions.shadingLossPercent,
  );
  return Decimal.max(zero, new Decimal(1).minus(lossPercent.div(100)));
}

function solarPerformanceFactor(assumptions: SolarAssumptions) {
  return solarLossFactor(assumptions).mul(roofOrientationFactor(assumptions));
}

function roofOrientationFactor(assumptions: SolarAssumptions) {
  if (
    assumptions.roofAzimuth === undefined &&
    assumptions.roofTilt === undefined
  )
    return new Decimal(1);

  const azimuth = assumptions.roofAzimuth ?? 180;
  const tilt = assumptions.roofTilt ?? 12;
  const azimuthDelta = Math.min(
    Math.abs(azimuth - 180),
    360 - Math.abs(azimuth - 180),
  );
  const azimuthPenalty = Math.min(0.18, (azimuthDelta / 180) * 0.18);
  const tiltPenalty = Math.min(0.1, Math.abs(tilt - 12) / 60);
  return new Decimal(1)
    .minus(azimuthPenalty)
    .minus(tiltPenalty)
    .toDecimalPlaces(6);
}

function assessSolarModelQuality(input: {
  detailLevel: SolarModelDetailLevel;
  intervalDays: number;
  hasUploadedSolarProfile: boolean;
  solarAssumptions: SolarAssumptions;
  exportPolicy: ExportPolicy;
  billComparison: SolarBillComparison;
  financial: FinancialResult;
}): SolarModelQualityResult {
  const risks: SolarModelRisk[] = [];
  const reasons: string[] = [];
  let score =
    input.detailLevel === "xhigh"
      ? 72
      : input.detailLevel === "advanced"
        ? 62
        : 48;

  if (input.intervalDays >= 365) {
    score += 16;
    reasons.push("Load profile covers at least 12 months.");
  } else if (input.intervalDays >= 30) {
    score += 9;
    reasons.push("Load profile covers at least 30 days.");
  } else {
    score -= 12;
    risks.push({
      code: "short_load_profile",
      severity: "warning",
      title: "Load profile is short",
      explanation: `The model uses ${input.intervalDays} day(s) of interval load data, so seasonality may be missed.`,
      mitigation:
        "Use at least 30 days for screening and 12 months for investment-grade review.",
    });
  }

  if (input.hasUploadedSolarProfile) {
    score += 12;
    reasons.push("Uploaded solar generation profile is used.");
  } else {
    score -= 6;
    risks.push({
      code: "no_uploaded_solar_profile",
      severity: "info",
      title: "Solar profile is approximate",
      explanation:
        "Generation is estimated from monthly specific yield and a generic daylight curve.",
      mitigation:
        "Use measured PV output, bankable irradiance data, or a site-specific PV model before committing capital.",
    });
  }

  if (
    input.solarAssumptions.yieldSource.status === "demo" ||
    input.solarAssumptions.yieldSource.status === "draft"
  ) {
    score -= 14;
    risks.push({
      code: "demo_yield_source",
      severity: "warning",
      title: "Yield source is demo/draft",
      explanation:
        "The production estimate is not from a verified solar resource source.",
      mitigation:
        "Replace with verified irradiance/yield assumptions for the selected site.",
    });
  } else {
    score += 8;
    reasons.push("Yield source is verified or published.");
  }

  if (
    input.exportPolicy.status === "demo" ||
    input.exportPolicy.status === "draft"
  ) {
    score -= 10;
    risks.push({
      code: "demo_export_policy",
      severity: "warning",
      title: "Export policy is demo/draft",
      explanation:
        "Export revenue is sensitive to eligibility, contract terms, and verified feed-in rates.",
      mitigation:
        "Verify export eligibility and rate with the relevant authority before using this as a decision basis.",
    });
  } else {
    score += 5;
    reasons.push("Export policy source is verified or published.");
  }

  if (
    input.solarAssumptions.roofAzimuth === undefined ||
    input.solarAssumptions.roofTilt === undefined
  ) {
    score -= 7;
    risks.push({
      code: "missing_roof_geometry",
      severity: "info",
      title: "Roof geometry is incomplete",
      explanation:
        "Azimuth or tilt is missing, so the model falls back to default orientation assumptions.",
      mitigation:
        "Enter roof azimuth and tilt, then compare sensitivity before choosing system size.",
    });
  } else {
    score += 5;
    reasons.push("Roof azimuth and tilt are included.");
  }

  if (input.solarAssumptions.shadingLossPercent > 10) {
    score -= 8;
    risks.push({
      code: "high_shading_loss",
      severity: "warning",
      title: "Shading loss is material",
      explanation:
        "High shading loss can shift payback, NPV, and optimum system size.",
      mitigation:
        "Confirm shading with a site survey or hourly shading simulation.",
    });
  }

  if (input.billComparison.selfConsumption.exportRatio > 0.45) {
    score -= 7;
    risks.push({
      code: "high_export_ratio",
      severity: "warning",
      title: "Export ratio is high",
      explanation:
        "A large exported share can make results depend heavily on export-rate assumptions.",
      mitigation:
        "Compare smaller systems, load shifting, or battery cases before selecting size.",
    });
  }

  if (input.financial.npvThb < 0) {
    risks.push({
      code: "negative_npv",
      severity: "info",
      title: "NPV is negative",
      explanation:
        "The current assumptions do not recover the required return over the project life.",
      mitigation:
        "Recheck CAPEX, self-consumption, export eligibility, discount rate, and system size.",
    });
  }

  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const level =
    boundedScore >= 90
      ? "xhigh"
      : boundedScore >= 75
        ? "high"
        : boundedScore >= 55
          ? "medium"
          : "low";

  return {
    detailLevel: input.detailLevel,
    level,
    score: boundedScore,
    label:
      level === "xhigh"
        ? "XHIGH review-ready"
        : level === "high"
          ? "High confidence"
          : level === "medium"
            ? "Screening confidence"
            : "Draft confidence",
    reasons,
    risks,
  };
}

function buildDaylightShape(intervalMinutes: 15 | 30 | 60) {
  const points: Array<{ minuteOfDay: number; weight: Decimal }> = [];
  for (let minute = 0; minute < 24 * 60; minute += intervalMinutes) {
    if (minute < 6 * 60 || minute >= 18 * 60) {
      points.push({ minuteOfDay: minute, weight: zero });
      continue;
    }
    const daylightProgress =
      (minute - 6 * 60 + intervalMinutes / 2) / (12 * 60);
    const weight = new Decimal(
      Math.sin(Math.PI * daylightProgress),
    ).toDecimalPlaces(9);
    points.push({ minuteOfDay: minute, weight });
  }
  return points;
}

function addLocalDays(date: string, days: number) {
  const [year = "2026", month = "01", day = "01"] = date.split("-");
  const utc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day) + days,
    0,
    0,
    0,
  );
  return new Date(utc).toISOString().slice(0, 10);
}

function daysInMonth(date: string) {
  const [year = "2026", month = "01"] = date.split("-");
  return new Date(Number(year), Number(month), 0).getDate();
}

function localDateMinuteToBangkokIso(date: string, minuteOfDay: number) {
  const [year = "2026", month = "01", day = "01"] = date.split("-");
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), hour - 7, minute, 0),
  ).toISOString();
}

function getBangkokDate(timestamp: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) return timestamp;
  return getBangkokParts(timestamp).date;
}

export function getBangkokParts(timestamp: string) {
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

function scaleFinancialAssumptions(
  input: FinancialAssumptions,
  systemSizeKwp: number,
  baseSystemSizeKwp: number,
): FinancialAssumptions {
  const scale =
    baseSystemSizeKwp > 0
      ? new Decimal(systemSizeKwp).div(baseSystemSizeKwp)
      : new Decimal(1);
  return {
    ...input,
    capexThb: new Decimal(input.capexThb)
      .mul(scale)
      .toDecimalPlaces(2)
      .toNumber(),
    oAndMCostPerYear: new Decimal(input.oAndMCostPerYear)
      .mul(scale)
      .toDecimalPlaces(2)
      .toNumber(),
    inverterReplacementCostThb: new Decimal(input.inverterReplacementCostThb)
      .mul(scale)
      .toDecimalPlaces(2)
      .toNumber(),
  };
}

function calculateAnnualLoanPayment(assumptions: FinancialAssumptions) {
  const principal = new Decimal(assumptions.loanAmountThb ?? 0);
  const years = assumptions.loanTermYears ?? 0;
  if (principal.lte(0) || years <= 0) return zero;
  const rate = new Decimal(assumptions.interestRatePercent ?? 0).div(100);
  if (rate.eq(0)) return principal.div(years);
  const factor = onePlus(rate).pow(years);
  return principal.mul(rate).mul(factor).div(factor.minus(1));
}

function findPaybackYear(
  cashFlows: SolarCashFlow[],
  field: "cumulativeCashFlowThb" | "cumulativeDiscountedCashFlowThb",
) {
  for (let index = 1; index < cashFlows.length; index += 1) {
    const current = cashFlows[index];
    const previous = cashFlows[index - 1];
    if (!current || !previous) continue;
    if (current[field] >= 0) {
      const previousCumulative = new Decimal(previous[field]);
      const currentCashFlow = new Decimal(current[field]).minus(
        previousCumulative,
      );
      if (currentCashFlow.lte(0)) return current.year;
      const fraction = previousCumulative.abs().div(currentCashFlow);
      return round(new Decimal(current.year - 1).plus(fraction), 2);
    }
  }
  return null;
}

function onePlus(value: Decimal) {
  return new Decimal(1).plus(value);
}

function oneMinus(value: Decimal) {
  return Decimal.max(zero, new Decimal(1).minus(value));
}

function minBy<T>(items: T[], selector: (item: T) => number) {
  return items.reduce<T | null>(
    (best, item) =>
      best === null || selector(item) < selector(best) ? item : best,
    null,
  );
}

function maxBy<T>(items: T[], selector: (item: T) => number) {
  return items.reduce<T | null>(
    (best, item) =>
      best === null || selector(item) > selector(best) ? item : best,
    null,
  );
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values.map((value) => Number(value.toFixed(4))))].sort(
    (a, b) => a - b,
  );
}

function mode(values: number[]) {
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return (
    [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ??
    values[0] ??
    0
  );
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

const usdFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function formatMoney(value: number) {
  return usdFormatter.format(value);
}

function createDemoLoadProfile(
  profile: DemoSolarProfileKey,
  days: number,
): LoadIntervalInput[] {
  const intervals: LoadIntervalInput[] = [];
  const start = Date.UTC(2026, 0, 5, -7, 0, 0);
  for (let day = 0; day < days; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const timestamp = new Date(
        start + day * 24 * 60 * 60000 + hour * 60 * 60000,
      ).toISOString();
      const localHour = getBangkokParts(timestamp).hour;
      const energyKwh = demoHourlyEnergy(profile, localHour);
      intervals.push({ timestamp, energyKwh, powerKw: energyKwh });
    }
  }
  return intervals;
}

function demoHourlyEnergy(profile: DemoSolarProfileKey, hour: number) {
  if (profile === "evening_home") {
    if (hour >= 18 && hour < 22) return 2.7;
    if (hour >= 22 || hour < 6) return 0.5;
    return 0.65;
  }
  if (profile === "daytime_home") {
    if (hour >= 10 && hour < 16) return 1.8;
    if (hour >= 18 && hour < 22) return 1;
    if (hour >= 22 || hour < 6) return 0.35;
    return 0.75;
  }
  if (hour >= 9 && hour < 18) return 2.6;
  if (hour >= 18 && hour < 22) return 1.2;
  return 0.45;
}
