import Decimal from "decimal.js";
import type { LoadIntervalInput } from "@thai-energy-planner/shared-types";
import { LoadIntervalSchema } from "@thai-energy-planner/shared-types";
import {
  calculateNormalBill,
  calculateTouBill,
  demoNormalTariff,
  demoTouTariff,
  type TariffCalculationResult,
  type TariffVersionConfig
} from "@thai-energy-planner/tariff-engine";
import { detectIntervalMinutes, parseCsvLoadProfile, type LoadProfilePreview } from "./load-data.js";

export const solarEngineVersion = "0.5.0-solar-finance";

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
  id: "normal_without_solar" | "tou_without_solar" | "normal_with_solar" | "tou_with_solar";
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
  variable: "capex" | "electricity_escalation" | "solar_generation" | "self_consumption" | "discount_rate";
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

export type SolarAnalysisInput = {
  loadIntervals: LoadIntervalInput[];
  normalTariff: TariffVersionConfig;
  touTariff: TariffVersionConfig;
  solarAssumptions: SolarAssumptions;
  exportPolicy: ExportPolicy;
  financialAssumptions: FinancialAssumptions;
  billDate?: string | undefined;
  monthlyScaleFactor?: number | undefined;
  solarProfile?: SolarGenerationIntervalInput[] | undefined;
};

export type SolarAnalysisResult = {
  solarProfile: SolarGenerationProfileResult;
  selfConsumption: SolarSelfConsumptionResult;
  billComparison: SolarBillComparison;
  financial: FinancialResult;
  sizing: SolarSizingOptimizationResult;
  sensitivity: SensitivityAnalysisResult;
  recommendations: SolarRecommendation[];
};

export type DemoSolarProfileKey = "evening_home" | "daytime_home" | "daytime_shop";

const zero = new Decimal(0);

export function validateSolarAssumptions(input: SolarAssumptions): string[] {
  const errors: string[] = [];
  if (input.systemSizeKwp <= 0) errors.push("systemSizeKwp must be greater than 0");
  if (input.roofAreaSqm !== undefined && input.roofAreaSqm < 0) errors.push("roofAreaSqm must be non-negative");
  if (input.systemLossPercent < 0 || input.systemLossPercent > 100) errors.push("systemLossPercent must be between 0 and 100");
  if (input.shadingLossPercent < 0 || input.shadingLossPercent > 100) errors.push("shadingLossPercent must be between 0 and 100");
  if (input.degradationPercentPerYear < 0 || input.degradationPercentPerYear > 100) {
    errors.push("degradationPercentPerYear must be between 0 and 100");
  }
  if (![15, 30, 60].includes(input.intervalMinutes)) errors.push("intervalMinutes must be 15, 30, or 60");
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

export function validateFinancialAssumptions(input: FinancialAssumptions): string[] {
  const errors: string[] = [];
  if (input.projectLifeYears <= 0) errors.push("projectLifeYears must be greater than 0");
  if (input.discountRatePercent < 0 || input.discountRatePercent > 30) {
    errors.push("discountRatePercent should be between 0 and 30");
  }
  if (input.degradationRatePercent < 0 || input.degradationRatePercent > 100) {
    errors.push("degradationRatePercent must be between 0 and 100");
  }
  if (input.capexThb < 0) errors.push("capexThb must be non-negative");
  if (input.oAndMCostPerYear < 0) errors.push("oAndMCostPerYear must be non-negative");
  if (input.inverterReplacementCostThb < 0) errors.push("inverterReplacementCostThb must be non-negative");
  if (input.subsidyAmountThb < 0) errors.push("subsidyAmountThb must be non-negative");
  if (input.meterChangeCostThb < 0) errors.push("meterChangeCostThb must be non-negative");
  if (input.otherInitialCostThb < 0) errors.push("otherInitialCostThb must be non-negative");
  if (input.loanAmountThb !== undefined && input.loanAmountThb < 0) errors.push("loanAmountThb must be non-negative");
  if (input.loanTermYears !== undefined && input.loanTermYears < 0) errors.push("loanTermYears must be non-negative");
  return errors;
}

export function validateExportPolicy(input: ExportPolicy): string[] {
  const errors: string[] = [];
  if (input.exportRateThbPerKwh < 0) errors.push("exportRateThbPerKwh must be non-negative");
  if (input.exportLimitKw !== undefined && input.exportLimitKw < 0) errors.push("exportLimitKw must be non-negative");
  if (!input.status || !input.authority) errors.push("exportPolicy must include status and authority");
  if (!input.notes && !input.sourceUrl) errors.push("exportPolicy must include notes or sourceUrl");
  return errors;
}

export function generateApproxSolarProfile(input: {
  assumptions: SolarAssumptions;
  startDate?: string | undefined;
  days?: number | undefined;
  profileName?: string | undefined;
}): SolarGenerationProfileResult {
  const errors = validateSolarAssumptions(input.assumptions);
  if (errors.length > 0) throw new Error(`Invalid solar assumptions: ${errors.join(", ")}`);

  const startDate = input.startDate ?? "2026-01-05";
  const days = input.days ?? 7;
  const lossFactor = solarLossFactor(input.assumptions);
  const intervals: SolarGenerationIntervalInput[] = [];

  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    const date = addLocalDays(startDate, dayOffset);
    const monthIndex = Number(date.slice(5, 7)) - 1;
    const monthYield = input.assumptions.monthlySpecificYieldKwhPerKwp[monthIndex] ?? 0;
    const dailyTarget = new Decimal(monthYield)
      .mul(input.assumptions.systemSizeKwp)
      .mul(lossFactor)
      .div(daysInMonth(date));
    const dailyShape = buildDaylightShape(input.assumptions.intervalMinutes);
    const totalWeight = dailyShape.reduce((sum, item) => sum.plus(item.weight), zero);

    for (const point of dailyShape) {
      const generation = totalWeight.gt(0) ? dailyTarget.mul(point.weight).div(totalWeight) : zero;
      const timestamp = localDateMinuteToBangkokIso(date, point.minuteOfDay);
      const powerKw = generation.div(input.assumptions.intervalMinutes / 60);
      intervals.push({
        timestamp,
        generationKwh: generation.toDecimalPlaces(6).toNumber(),
        powerKw: powerKw.toDecimalPlaces(6).toNumber()
      });
    }
  }

  const monthlyGenerationKwh = input.assumptions.monthlySpecificYieldKwhPerKwp.map((yieldKwh, index) => ({
    month: String(index + 1).padStart(2, "0"),
    generationKwh: new Decimal(yieldKwh)
      .mul(input.assumptions.systemSizeKwp)
      .mul(lossFactor)
      .toDecimalPlaces(3)
      .toNumber()
  }));
  const annualGenerationKwh = monthlyGenerationKwh.reduce((sum, row) => sum.plus(row.generationKwh), zero);

  return {
    profileName: input.profileName ?? "Approximate solar yield",
    intervals,
    monthlyGenerationKwh,
    annualGenerationKwh: annualGenerationKwh.toDecimalPlaces(3).toNumber(),
    source: input.assumptions.yieldSource,
    assumptionsSnapshot: input.assumptions,
    method: "approximate_yield"
  };
}

export function parseSolarGenerationCsv(
  csvText: string,
  options: { intervalMinutes?: 15 | 30 | 60 | undefined; source: SolarSourceMetadata }
): LoadProfilePreview & { solarIntervals: SolarGenerationIntervalInput[]; source: SolarSourceMetadata } {
  const preview = parseCsvLoadProfile(csvText, {
    mapping: {
      timestamp: "timestamp",
      energyKwh: "generation_kwh",
      powerKw: "power_kw"
    },
    timezone: "Asia/Bangkok",
    ...(options.intervalMinutes === undefined ? {} : { intervalMinutes: options.intervalMinutes })
  });

  return {
    ...preview,
    solarIntervals: preview.rows.map((row) => ({
      timestamp: row.timestamp,
      generationKwh: row.energyKwh,
      ...(row.powerKw === undefined ? {} : { powerKw: row.powerKw })
    })),
    source: options.source
  };
}

export function simulateSolarSelfConsumption(input: {
  loadIntervals: LoadIntervalInput[];
  solarIntervals: SolarGenerationIntervalInput[];
}): SolarSelfConsumptionResult {
  const loadIntervals = normalizeLoadIntervals(input.loadIntervals);
  const solarIntervals = normalizeSolarIntervals(input.solarIntervals, detectIntervalMinutes(loadIntervals) ?? undefined);
  const intervalMinutes = detectIntervalMinutes(loadIntervals) ?? detectSolarIntervalMinutes(solarIntervals) ?? 60;
  const intervalHours = intervalMinutes / 60;
  const loadByTimestamp = new Map(loadIntervals.map((interval) => [interval.timestamp, interval]));
  const solarByTimestamp = new Map(solarIntervals.map((interval) => [interval.timestamp, interval]));
  const timestamps = [...new Set([...loadByTimestamp.keys(), ...solarByTimestamp.keys()])].sort();
  const monthly = new Map<string, SolarMonthlyEnergy>();

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
    const loadPowerKw = new Decimal(load?.powerKw ?? loadKwh.div(intervalHours));
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
    const monthRow = monthly.get(month) ?? {
      month,
      totalLoadKwh: 0,
      totalSolarGenerationKwh: 0,
      selfConsumedKwh: 0,
      gridImportKwh: 0,
      gridExportKwh: 0
    };
    monthRow.totalLoadKwh = new Decimal(monthRow.totalLoadKwh).plus(loadKwh).toNumber();
    monthRow.totalSolarGenerationKwh = new Decimal(monthRow.totalSolarGenerationKwh).plus(solarKwh).toNumber();
    monthRow.selfConsumedKwh = new Decimal(monthRow.selfConsumedKwh).plus(consumed).toNumber();
    monthRow.gridImportKwh = new Decimal(monthRow.gridImportKwh).plus(imported).toNumber();
    monthRow.gridExportKwh = new Decimal(monthRow.gridExportKwh).plus(exported).toNumber();
    monthly.set(month, monthRow);

    intervalResults.push({
      timestamp,
      loadKwh: loadKwh.toDecimalPlaces(6).toNumber(),
      solarKwh: solarKwh.toDecimalPlaces(6).toNumber(),
      selfConsumedKwh: consumed.toDecimalPlaces(6).toNumber(),
      gridImportKwh: imported.toDecimalPlaces(6).toNumber(),
      gridExportKwh: exported.toDecimalPlaces(6).toNumber(),
      loadPowerKw: loadPowerKw.toDecimalPlaces(6).toNumber(),
      gridImportPowerKw: importPowerKw.toDecimalPlaces(6).toNumber()
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
        totalLoadKwh: round(row.totalLoadKwh, 6),
        totalSolarGenerationKwh: round(row.totalSolarGenerationKwh, 6),
        selfConsumedKwh: round(row.selfConsumedKwh, 6),
        gridImportKwh: round(row.gridImportKwh, 6),
        gridExportKwh: round(row.gridExportKwh, 6)
      }))
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
}): SolarBillComparison {
  const exportPolicyErrors = validateExportPolicy(input.exportPolicy);
  if (exportPolicyErrors.length > 0) throw new Error(`Invalid export policy: ${exportPolicyErrors.join(", ")}`);

  const loadIntervals = normalizeLoadIntervals(input.loadIntervals);
  const billDate = input.billDate ?? getBangkokDate(loadIntervals[0]?.timestamp ?? input.normalTariff.effectiveFrom);
  const monthlyScaleFactor = input.monthlyScaleFactor ?? inferMonthlyScaleFactor(loadIntervals);
  const selfConsumption = simulateSolarSelfConsumption({
    loadIntervals,
    solarIntervals: input.solarIntervals
  });
  const billingLoadIntervals = scaleLoadIntervals(loadIntervals, monthlyScaleFactor);
  const billingImportIntervals = scaleGridImportIntervals(selfConsumption, monthlyScaleFactor);
  const monthlyLoadKwh = sumLoadEnergy(billingLoadIntervals);
  const monthlyImportKwh = sumLoadEnergy(billingImportIntervals);
  const monthlyExportKwh = new Decimal(selfConsumption.gridExportKwh).mul(monthlyScaleFactor);
  const monthlyExportRevenue = input.exportPolicy.enabled
    ? monthlyExportKwh.mul(input.exportPolicy.exportRateThbPerKwh)
    : zero;

  const normalBaselineBill = calculateNormalBill({
    tariffVersion: input.normalTariff,
    billDate,
    energyKwh: monthlyLoadKwh.toString()
  });
  const touBaselineBill = calculateTouBill({
    tariffVersion: input.touTariff,
    intervals: billingLoadIntervals.map(toTariffInterval)
  });
  const normalSolarBill = calculateNormalBill({
    tariffVersion: input.normalTariff,
    billDate,
    energyKwh: monthlyImportKwh.toString()
  });
  const touSolarBill = calculateTouBill({
    tariffVersion: input.touTariff,
    intervals: billingImportIntervals.map(toTariffInterval)
  });

  const normalWithoutSolar = buildBillScenario({
    id: "normal_without_solar",
    label: "Normal without Solar",
    bill: normalBaselineBill,
    monthlyExportRevenue,
    annualGridExportKwh: monthlyExportKwh.mul(12),
    baselineBill: normalBaselineBill,
    usesSolar: false
  });
  const touWithoutSolar = buildBillScenario({
    id: "tou_without_solar",
    label: "TOU without Solar",
    bill: touBaselineBill,
    monthlyExportRevenue,
    annualGridExportKwh: monthlyExportKwh.mul(12),
    baselineBill: touBaselineBill,
    usesSolar: false
  });
  const normalWithSolar = buildBillScenario({
    id: "normal_with_solar",
    label: "Normal + Solar",
    bill: normalSolarBill,
    monthlyExportRevenue,
    annualGridExportKwh: monthlyExportKwh.mul(12),
    baselineBill: normalBaselineBill,
    usesSolar: true
  });
  const touWithSolar = buildBillScenario({
    id: "tou_with_solar",
    label: "TOU + Solar",
    bill: touSolarBill,
    monthlyExportRevenue,
    annualGridExportKwh: monthlyExportKwh.mul(12),
    baselineBill: touBaselineBill,
    usesSolar: true
  });
  const bestWithoutSolar = [normalWithoutSolar, touWithoutSolar].sort((a, b) => a.monthlyBillThb - b.monthlyBillThb)[0]!;
  const bestWithSolar = [normalWithSolar, touWithSolar].sort((a, b) => a.netMonthlyCostThb - b.netMonthlyCostThb)[0]!;
  const billSavings = new Decimal(bestWithoutSolar.annualBillThb).minus(bestWithSolar.annualBillThb);
  const exportRevenue = new Decimal(bestWithSolar.annualExportRevenueThb);
  const netAnnualBenefit = billSavings.plus(exportRevenue);

  return {
    billDate,
    monthlyScaleFactor,
    exportPolicy: input.exportPolicy,
    selfConsumption,
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
    annualGridImportBefore: new Decimal(monthlyLoadKwh).mul(12).toDecimalPlaces(6).toNumber(),
    annualGridImportAfter: new Decimal(monthlyImportKwh).mul(12).toDecimalPlaces(6).toNumber(),
    annualGridExport: monthlyExportKwh.mul(12).toDecimalPlaces(6).toNumber(),
    calculationTrace: {
      engineVersion: solarEngineVersion,
      usedIntervalMatching: true,
      tariffVersionIds: [
        normalBaselineBill.tariffVersionId,
        touBaselineBill.tariffVersionId,
        normalSolarBill.tariffVersionId,
        touSolarBill.tariffVersionId
      ],
      lineItemCount:
        normalBaselineBill.lineItems.length +
        touBaselineBill.lineItems.length +
        normalSolarBill.lineItems.length +
        touSolarBill.lineItems.length
    }
  };
}

export function calculateFinancials(input: {
  annualBillSavingsThb: number;
  annualExportRevenueThb: number;
  annualGenerationKwh: number;
  assumptions: FinancialAssumptions;
}): FinancialResult {
  const errors = validateFinancialAssumptions(input.assumptions);
  if (errors.length > 0) throw new Error(`Invalid financial assumptions: ${errors.join(", ")}`);

  const assumptions = input.assumptions;
  const projectLife = Math.floor(assumptions.projectLifeYears);
  const discountRate = new Decimal(assumptions.discountRatePercent).div(100);
  const escalationRate = new Decimal(assumptions.electricityEscalationRatePercent).div(100);
  const degradationRate = new Decimal(assumptions.degradationRatePercent).div(100);
  const oAndMEscalation = new Decimal(assumptions.oAndMEscalationRatePercent || assumptions.inflationRatePercent).div(100);
  const totalInitialCost = new Decimal(assumptions.capexThb)
    .plus(assumptions.meterChangeCostThb)
    .plus(assumptions.otherInitialCostThb);
  const loanAmount = new Decimal(assumptions.loanAmountThb ?? 0);
  const initialInvestment = Decimal.max(zero, totalInitialCost.minus(assumptions.subsidyAmountThb).minus(loanAmount));
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
    generationKwh: 0
  });

  for (let year = 1; year <= projectLife; year += 1) {
    const benefitMultiplier = onePlus(escalationRate).pow(year - 1).mul(oneMinus(degradationRate).pow(year - 1));
    const generationMultiplier = oneMinus(degradationRate).pow(year - 1);
    const billSavings = new Decimal(input.annualBillSavingsThb).mul(benefitMultiplier);
    const exportRevenue = new Decimal(input.annualExportRevenueThb).mul(benefitMultiplier);
    const grossBenefit = billSavings.plus(exportRevenue);
    const oAndM = new Decimal(assumptions.oAndMCostPerYear).mul(onePlus(oAndMEscalation).pow(year - 1));
    const replacement =
      assumptions.inverterReplacementYear !== null && assumptions.inverterReplacementYear === year
        ? new Decimal(assumptions.inverterReplacementCostThb)
        : zero;
    const loanPayment = year <= (assumptions.loanTermYears ?? 0) ? annualLoanPayment : zero;
    const netCashFlow = grossBenefit.minus(oAndM).minus(replacement).minus(loanPayment);
    const discountFactor = onePlus(discountRate).pow(year);
    const discounted = netCashFlow.div(discountFactor);
    const discountedGrossBenefit = grossBenefit.div(discountFactor);
    const discountedCost = oAndM.plus(replacement).plus(loanPayment).div(discountFactor);
    const generation = new Decimal(input.annualGenerationKwh).mul(generationMultiplier);

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
      generationKwh: round(generation, 3)
    });
  }

  const yearOneNet = new Decimal(cashFlows[1]?.netCashFlowThb ?? 0);
  const simplePaybackYears = initialInvestment.gt(0) && yearOneNet.gt(0) ? round(initialInvestment.div(yearOneNet), 2) : null;
  const discountedPaybackYears = findPaybackYear(cashFlows, "cumulativeDiscountedCashFlowThb");
  const totalCostForRoi = totalCosts.gt(0) ? totalCosts : new Decimal(1);
  const roiPercent = totalBenefits.minus(totalCosts).div(totalCostForRoi).mul(100);
  const npv = new Decimal(cashFlows.at(-1)?.cumulativeDiscountedCashFlowThb ?? 0);
  const irr = calculateIrr(cashFlows.map((cashFlow) => new Decimal(cashFlow.netCashFlowThb)));
  const lcoe = presentGeneration.gt(0) ? presentCostsForLcoe.div(presentGeneration) : null;

  return {
    initialInvestmentThb: round(initialInvestment, 2),
    annualNetBenefitYear1: round(yearOneNet, 2),
    simplePaybackYears,
    discountedPaybackYears,
    roiPercent: round(roiPercent, 2),
    npvThb: round(npv, 2),
    irrPercent: irr === null ? null : round(irr.mul(100), 2),
    lcoeThbPerKwh: lcoe === null ? null : round(lcoe, 4),
    presentValueOfSavingsThb: round(presentValueOfSavings, 2),
    totalBenefitsThb: round(totalBenefits, 2),
    totalCostsThb: round(totalCosts, 2),
    cashFlows,
    assumptionsSnapshot: assumptions
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
}): SolarSizingOptimizationResult {
  const loadIntervals = normalizeLoadIntervals(input.loadIntervals);
  const minKwp = input.minKwp ?? 1;
  const requestedMaxKwp = input.maxKwp ?? 20;
  const stepKwp = input.stepKwp ?? 1;
  const sqmPerKwp = input.sqmPerKwp ?? 5;
  const roofLimit = input.roofAreaSqm === undefined ? requestedMaxKwp : input.roofAreaSqm / sqmPerKwp;
  const exportLimit = input.exportPolicy.enabled ? input.exportPolicy.exportLimitKw ?? requestedMaxKwp : requestedMaxKwp;
  const appliedMaxKwp = Math.max(minKwp, Math.min(requestedMaxKwp, roofLimit, exportLimit));
  const options: SizingOptionResult[] = [];
  const baseSize = input.baseSolarAssumptions.systemSizeKwp;
  const monthlyScaleFactor = inferMonthlyScaleFactor(loadIntervals);
  const startDate = getBangkokDate(loadIntervals[0]?.timestamp ?? "2026-01-05");
  const days = countUniqueBangkokDates(loadIntervals);

  for (let size = minKwp; size <= appliedMaxKwp + 0.000001; size += stepKwp) {
    const systemSizeKwp = Number(size.toFixed(3));
    const solarAssumptions = { ...input.baseSolarAssumptions, systemSizeKwp };
    const profile = generateApproxSolarProfile({ assumptions: solarAssumptions, startDate, days, profileName: `${systemSizeKwp} kWp` });
    const billComparison = calculateBillAfterSolar({
      loadIntervals,
      solarIntervals: profile.intervals,
      normalTariff: input.normalTariff,
      touTariff: input.touTariff,
      exportPolicy: input.exportPolicy,
      billDate: input.billDate,
      monthlyScaleFactor
    });
    const scaledFinancial = scaleFinancialAssumptions(input.financialAssumptions, systemSizeKwp, baseSize);
    const billSavingsAnnual = new Decimal(billComparison.bestWithoutSolar.annualBillThb).minus(
      billComparison.bestWithSolar.annualBillThb
    );
    const financial = calculateFinancials({
      annualBillSavingsThb: billSavingsAnnual.toNumber(),
      annualExportRevenueThb: billComparison.bestWithSolar.annualExportRevenueThb,
      annualGenerationKwh: new Decimal(billComparison.selfConsumption.totalSolarGenerationKwh).mul(monthlyScaleFactor).mul(12).toNumber(),
      assumptions: scaledFinancial
    });

    options.push({
      systemSizeKwp,
      annualGenerationKwh: round(new Decimal(billComparison.selfConsumption.totalSolarGenerationKwh).mul(monthlyScaleFactor).mul(12), 3),
      annualSelfConsumedKwh: round(new Decimal(billComparison.selfConsumption.selfConsumedKwh).mul(monthlyScaleFactor).mul(12), 3),
      annualExportedKwh: billComparison.annualGridExport,
      selfConsumptionRatio: billComparison.selfConsumption.selfConsumptionRatio,
      annualBillSavingsThb: round(billSavingsAnnual, 2),
      annualExportRevenueThb: billComparison.bestWithSolar.annualExportRevenueThb,
      annualNetBenefitThb: billComparison.netAnnualBenefit,
      capexThb: scaledFinancial.capexThb,
      simplePaybackYears: financial.simplePaybackYears,
      npvThb: financial.npvThb,
      irrPercent: financial.irrPercent,
      roiPercent: financial.roiPercent
    });
  }

  const fastestPayback = minBy(
    options.filter((option) => option.simplePaybackYears !== null),
    (option) => option.simplePaybackYears ?? Number.POSITIVE_INFINITY
  );
  const highestNpv = maxBy(options, (option) => option.npvThb);
  const highestAnnualSavings = maxBy(options, (option) => option.annualNetBenefitThb);
  const threshold = input.selfConsumptionThreshold ?? 0.7;
  const thresholdOptions = options.filter((option) => option.selfConsumptionRatio >= threshold);
  const bestSelfConsumption = maxBy(thresholdOptions.length > 0 ? thresholdOptions : options, (option) => option.selfConsumptionRatio);

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
      exportLimitKw: input.exportPolicy.enabled ? input.exportPolicy.exportLimitKw ?? null : null
    }
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
    }
  ) => {
    const candidate = calculateFinancials({
      annualBillSavingsThb: overrides.annualBillSavingsThb ?? input.annualBillSavingsThb,
      annualExportRevenueThb: overrides.annualExportRevenueThb ?? input.annualExportRevenueThb,
      annualGenerationKwh: overrides.annualGenerationKwh ?? input.annualGenerationKwh,
      assumptions: { ...input.assumptions, ...overrides.assumptions }
    });
    cases.push({
      variable,
      label,
      value,
      npvThb: candidate.npvThb,
      simplePaybackYears: candidate.simplePaybackYears,
      roiPercent: candidate.roiPercent,
      impactOnNpvThb: round(new Decimal(candidate.npvThb).minus(base.npvThb), 2)
    });
  };

  for (const multiplier of [0.8, 0.9, 1, 1.1, 1.2]) {
    addCase("capex", `CAPEX ${Math.round(multiplier * 100)}%`, multiplier, {
      assumptions: {
        capexThb: new Decimal(input.assumptions.capexThb).mul(multiplier).toDecimalPlaces(2).toNumber()
      }
    });
  }

  for (const escalation of uniqueNumbers([0, 2, 4, input.assumptions.electricityEscalationRatePercent])) {
    addCase("electricity_escalation", `Escalation ${escalation}%`, escalation, {
      assumptions: { electricityEscalationRatePercent: escalation }
    });
  }

  for (const multiplier of [0.85, 0.9, 1, 1.1]) {
    addCase("solar_generation", `Generation ${Math.round(multiplier * 100)}%`, multiplier, {
      annualBillSavingsThb: input.annualBillSavingsThb * multiplier,
      annualExportRevenueThb: input.annualExportRevenueThb * multiplier,
      annualGenerationKwh: input.annualGenerationKwh * multiplier
    });
  }

  for (const multiplier of [0.75, 1, 1.15]) {
    addCase("self_consumption", `Self consumption ${Math.round(multiplier * 100)}%`, multiplier, {
      annualBillSavingsThb: input.annualBillSavingsThb * multiplier
    });
  }

  for (const discountRate of uniqueNumbers([
    Math.max(0, input.assumptions.discountRatePercent - 2),
    input.assumptions.discountRatePercent,
    input.assumptions.discountRatePercent + 2
  ])) {
    addCase("discount_rate", `Discount ${discountRate}%`, discountRate, {
      assumptions: { discountRatePercent: discountRate }
    });
  }

  const ranges = new Map<SensitivityCaseResult["variable"], number>();
  for (const variable of ["capex", "electricity_escalation", "solar_generation", "self_consumption", "discount_rate"] as const) {
    const values = cases.filter((item) => item.variable === variable).map((item) => item.npvThb);
    if (values.length === 0) continue;
    ranges.set(variable, Math.max(...values) - Math.min(...values));
  }
  const mostImpactfulVariable =
    [...ranges.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    baseNpvThb: base.npvThb,
    cases,
    mostImpactfulVariable
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
  const limitations = input.intervalDays < 30 ? ["Load profile covers less than 30 days."] : [];
  const payback = input.financial.simplePaybackYears;

  if (input.financial.npvThb > 0 && payback !== null && payback <= input.financial.assumptionsSnapshot.projectLifeYears) {
    recommendations.push({
      type: "solar_worth_it",
      title: "Solar is financially attractive in this scenario",
      explanation: `NPV is ${formatMoney(input.financial.npvThb)} THB and simple payback is ${payback} years.`,
      supportingMetrics: { npvThb: input.financial.npvThb, paybackYears: payback },
      confidence: input.intervalDays >= 30 ? "high" : "medium",
      limitations,
      nextAction: "Confirm roof condition, shading, and verified tariff/export policy before investment."
    });
  } else {
    recommendations.push({
      type: "solar_not_worth_it",
      title: "Solar is not yet attractive under current assumptions",
      explanation: `NPV is ${formatMoney(input.financial.npvThb)} THB and annual net benefit is ${formatMoney(input.billComparison.netAnnualBenefit)} THB.`,
      supportingMetrics: { npvThb: input.financial.npvThb, annualNetBenefitThb: input.billComparison.netAnnualBenefit },
      confidence: input.intervalDays >= 30 ? "medium" : "low",
      limitations,
      nextAction: "Retest with verified CAPEX, export policy, and at least 30 days of interval load data."
    });
  }

  if (input.billComparison.selfConsumption.selfConsumptionRatio < 0.5) {
    recommendations.push({
      type: "low_self_consumption",
      title: "Self-consumption is low",
      explanation: "A large share of solar generation is exported instead of offsetting grid imports.",
      supportingMetrics: {
        selfConsumptionRatio: input.billComparison.selfConsumption.selfConsumptionRatio,
        exportRatio: input.billComparison.selfConsumption.exportRatio
      },
      confidence: "medium",
      limitations,
      nextAction: "Try a smaller system size or move controllable loads into daytime."
    });
  }

  if (input.billComparison.selfConsumption.exportRatio > 0.4) {
    recommendations.push({
      type: "reduce_system_size",
      title: "Consider reducing system size",
      explanation: "Export ratio is high, so additional panels may deliver lower value unless export policy is favorable.",
      supportingMetrics: { exportRatio: input.billComparison.selfConsumption.exportRatio },
      confidence: "medium",
      limitations,
      nextAction: "Compare the fastest-payback size with the maximum-savings size."
    });
  }

  if (input.billComparison.selfConsumption.daytimeSolarCoverage < 0.65 && input.billComparison.selfConsumption.exportRatio < 0.2) {
    recommendations.push({
      type: "increase_system_size",
      title: "Daytime load can absorb more solar",
      explanation: "Daytime solar coverage is still moderate while export ratio remains low.",
      supportingMetrics: {
        daytimeSolarCoverage: input.billComparison.selfConsumption.daytimeSolarCoverage,
        exportRatio: input.billComparison.selfConsumption.exportRatio
      },
      confidence: "medium",
      limitations,
      nextAction: "Review the next larger sizing options and roof constraints."
    });
  }

  if (input.billComparison.touWithSolar.netMonthlyCostThb < input.billComparison.normalWithSolar.netMonthlyCostThb) {
    recommendations.push({
      type: "tou_solar_better",
      title: "TOU + Solar is lower than Normal + Solar",
      explanation: "TOU has the lower net monthly cost after solar and export revenue.",
      supportingMetrics: {
        touSolarNetMonthlyThb: input.billComparison.touWithSolar.netMonthlyCostThb,
        normalSolarNetMonthlyThb: input.billComparison.normalWithSolar.netMonthlyCostThb
      },
      confidence: "medium",
      limitations,
      nextAction: "Check meter switching requirements and TOU eligibility."
    });
  } else {
    recommendations.push({
      type: "normal_solar_better",
      title: "Normal + Solar is lower than TOU + Solar",
      explanation: "Normal tariff has the lower net monthly cost after solar in this profile.",
      supportingMetrics: {
        normalSolarNetMonthlyThb: input.billComparison.normalWithSolar.netMonthlyCostThb,
        touSolarNetMonthlyThb: input.billComparison.touWithSolar.netMonthlyCostThb
      },
      confidence: "medium",
      limitations,
      nextAction: "Keep TOU as a comparison case if load behavior changes."
    });
  }

  if (input.intervalDays < 30) {
    recommendations.push({
      type: "insufficient_data",
      title: "More interval data is needed",
      explanation: `Current profile covers ${input.intervalDays} day(s), below the 30-day threshold.`,
      supportingMetrics: { intervalDays: input.intervalDays },
      confidence: "high",
      limitations,
      nextAction: "Import at least 30 days of 15, 30, or 60 minute load intervals."
    });
  }

  if (input.shadingLossPercent > 10) {
    recommendations.push({
      type: "check_roof_shading",
      title: "Check shading and roof layout before deciding",
      explanation: "Shading loss is material and can change payback, NPV, and best size.",
      supportingMetrics: { shadingLossPercent: input.shadingLossPercent },
      confidence: "medium",
      limitations,
      nextAction: "Verify shading, usable roof area, azimuth, and tilt with a site survey."
    });
  }

  if (
    input.sizing.fastestPayback &&
    input.sizing.highestAnnualSavings &&
    input.sizing.fastestPayback.systemSizeKwp !== input.sizing.highestAnnualSavings.systemSizeKwp
  ) {
    recommendations.push({
      type: "payback_vs_max_savings",
      title: "Fastest payback is not the maximum-savings size",
      explanation: "The best financial choice depends on whether the goal is quick payback or highest annual savings.",
      supportingMetrics: {
        fastestPaybackKwp: input.sizing.fastestPayback.systemSizeKwp,
        maxSavingsKwp: input.sizing.highestAnnualSavings.systemSizeKwp
      },
      confidence: "medium",
      limitations,
      nextAction: "Compare NPV, annual savings, and self-consumption before selecting size."
    });
  }

  return recommendations;
}

export function runSolarAnalysis(input: SolarAnalysisInput): SolarAnalysisResult {
  const loadIntervals = normalizeLoadIntervals(input.loadIntervals);
  const startDate = getBangkokDate(loadIntervals[0]?.timestamp ?? "2026-01-05");
  const intervalDays = countUniqueBangkokDates(loadIntervals);
  const solarProfile = input.solarProfile
    ? profileFromUploadedIntervals(input.solarProfile, input.solarAssumptions)
    : generateApproxSolarProfile({
        assumptions: input.solarAssumptions,
        startDate,
        days: intervalDays,
        profileName: `${input.solarAssumptions.systemSizeKwp} kWp demo profile`
      });
  const monthlyScaleFactor = input.monthlyScaleFactor ?? inferMonthlyScaleFactor(loadIntervals);
  const billComparison = calculateBillAfterSolar({
    loadIntervals,
    solarIntervals: solarProfile.intervals,
    normalTariff: input.normalTariff,
    touTariff: input.touTariff,
    exportPolicy: input.exportPolicy,
    billDate: input.billDate,
    monthlyScaleFactor
  });
  const annualBillSavings = new Decimal(billComparison.bestWithoutSolar.annualBillThb).minus(
    billComparison.bestWithSolar.annualBillThb
  );
  const annualGenerationKwh = new Decimal(billComparison.selfConsumption.totalSolarGenerationKwh).mul(monthlyScaleFactor).mul(12);
  const financial = calculateFinancials({
    annualBillSavingsThb: annualBillSavings.toNumber(),
    annualExportRevenueThb: billComparison.bestWithSolar.annualExportRevenueThb,
    annualGenerationKwh: annualGenerationKwh.toNumber(),
    assumptions: input.financialAssumptions
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
    roofAreaSqm: input.solarAssumptions.roofAreaSqm
  });
  const sensitivity = runSensitivityAnalysis({
    annualBillSavingsThb: annualBillSavings.toNumber(),
    annualExportRevenueThb: billComparison.bestWithSolar.annualExportRevenueThb,
    annualGenerationKwh: annualGenerationKwh.toNumber(),
    assumptions: input.financialAssumptions
  });
  const recommendations = buildSolarRecommendations({
    billComparison,
    financial,
    sizing,
    intervalDays,
    shadingLossPercent: input.solarAssumptions.shadingLossPercent
  });

  return {
    solarProfile,
    selfConsumption: billComparison.selfConsumption,
    billComparison,
    financial,
    sizing,
    sensitivity,
    recommendations
  };
}

export function createDemoSolarInput(
  profile: DemoSolarProfileKey = "evening_home",
  overrides: {
    systemSizeKwp?: number | undefined;
    capexThb?: number | undefined;
    exportRateThbPerKwh?: number | undefined;
    exportEnabled?: boolean | undefined;
    discountRatePercent?: number | undefined;
    projectLifeYears?: number | undefined;
  } = {}
): SolarAnalysisInput {
  const systemSizeKwp = overrides.systemSizeKwp ?? (profile === "daytime_shop" ? 8 : 5);
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
      roofAreaSqm: systemSizeKwp * 6,
      roofAzimuth: 180,
      roofTilt: 12,
      monthlySpecificYieldKwhPerKwp: [112, 118, 126, 124, 118, 108, 104, 106, 110, 112, 108, 106],
      systemLossPercent: 12,
      shadingLossPercent: profile === "evening_home" ? 8 : 4,
      degradationPercentPerYear: 0.5,
      intervalMinutes: 60,
      yieldSource: {
        status: "demo",
        sourceUrl: null,
        authority: "Thai Energy Planner demo",
        notes: "Synthetic monthly specific yield for Phase 5 demo only; not verified irradiance data."
      }
    },
    exportPolicy: {
      enabled: overrides.exportEnabled ?? true,
      exportRateThbPerKwh: overrides.exportRateThbPerKwh ?? 0.8,
      exportLimitKw: 10,
      status: "demo",
      sourceUrl: null,
      authority: "Thai Energy Planner demo",
      notes: "Synthetic demo export rate; not an official feed-in tariff."
    },
    financialAssumptions: {
      projectLifeYears: overrides.projectLifeYears ?? 20,
      discountRatePercent: overrides.discountRatePercent ?? 6,
      electricityEscalationRatePercent: 2,
      inflationRatePercent: 2,
      oAndMEscalationRatePercent: 2,
      degradationRatePercent: 0.5,
      capexThb,
      oAndMCostPerYear: capexThb * 0.01,
      inverterReplacementCostThb: systemSizeKwp * 5500,
      inverterReplacementYear: 10,
      subsidyAmountThb: 0,
      meterChangeCostThb: 0,
      otherInitialCostThb: 0
    }
  };
}

export function runDemoSolarAnalysis(
  profile: DemoSolarProfileKey = "evening_home",
  overrides: Parameters<typeof createDemoSolarInput>[1] = {}
): SolarAnalysisResult {
  return runSolarAnalysis(createDemoSolarInput(profile, overrides));
}

function profileFromUploadedIntervals(
  intervals: SolarGenerationIntervalInput[],
  assumptions: SolarAssumptions
): SolarGenerationProfileResult {
  const normalized = normalizeSolarIntervals(intervals, assumptions.intervalMinutes);
  const monthMap = new Map<string, Decimal>();
  for (const interval of normalized) {
    const month = getBangkokDate(interval.timestamp).slice(0, 7);
    monthMap.set(month, (monthMap.get(month) ?? zero).plus(interval.generationKwh));
  }
  const monthlyGenerationKwh = [...monthMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, generation]) => ({
    month,
    generationKwh: generation.toDecimalPlaces(3).toNumber()
  }));
  const annualGenerationKwh = monthlyGenerationKwh.reduce((sum, row) => sum.plus(row.generationKwh), zero);

  return {
    profileName: "Uploaded solar profile",
    intervals: normalized,
    monthlyGenerationKwh,
    annualGenerationKwh: annualGenerationKwh.toDecimalPlaces(3).toNumber(),
    source: assumptions.yieldSource,
    assumptionsSnapshot: assumptions,
    method: "uploaded_profile"
  };
}

function buildBillScenario(input: {
  id: SolarBillScenario["id"];
  label: string;
  bill: TariffCalculationResult;
  monthlyExportRevenue: Decimal;
  annualGridExportKwh: Decimal;
  baselineBill: TariffCalculationResult;
  usesSolar: boolean;
}): SolarBillScenario {
  const monthlyBill = new Decimal(input.bill.grandTotal);
  const baseline = new Decimal(input.baselineBill.grandTotal);
  const monthlyBillSavings = baseline.minus(monthlyBill);
  const annualBill = monthlyBill.mul(12);
  const annualExportRevenue = input.usesSolar ? input.monthlyExportRevenue.mul(12) : zero;
  const monthlyExportRevenue = input.usesSolar ? input.monthlyExportRevenue : zero;
  const netMonthlyCost = monthlyBill.minus(monthlyExportRevenue);

  return {
    id: input.id,
    label: input.label,
    meterMode: input.bill.mode,
    usesSolar: input.usesSolar,
    bill: input.bill,
    monthlyBillThb: round(monthlyBill, 2),
    annualBillThb: round(annualBill, 2),
    monthlyEnergyKwh: round(input.bill.energyKwh, 6),
    annualGridImportKwh: round(new Decimal(input.bill.energyKwh).mul(12), 6),
    annualGridExportKwh: input.usesSolar ? round(input.annualGridExportKwh, 6) : 0,
    monthlyExportRevenueThb: round(monthlyExportRevenue, 2),
    annualExportRevenueThb: round(annualExportRevenue, 2),
    monthlyBillSavingsThb: input.usesSolar ? round(monthlyBillSavings, 2) : 0,
    annualBillSavingsThb: input.usesSolar ? round(monthlyBillSavings.mul(12), 2) : 0,
    netMonthlyCostThb: round(netMonthlyCost, 2),
    netAnnualCostThb: round(netMonthlyCost.mul(12), 2),
    effectiveRatePerKwh: round(input.bill.effectiveRatePerKwh, 6)
  };
}

function normalizeLoadIntervals(intervals: LoadIntervalInput[]) {
  return intervals
    .map((interval) => LoadIntervalSchema.parse(interval))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function normalizeSolarIntervals(intervals: SolarGenerationIntervalInput[], fallbackIntervalMinutes?: number | undefined) {
  const sorted = [...intervals].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const intervalMinutes = detectSolarIntervalMinutes(sorted) ?? fallbackIntervalMinutes ?? 60;
  const intervalHours = intervalMinutes / 60;
  return sorted.map((interval) => {
    if (!Number.isFinite(new Date(interval.timestamp).getTime())) throw new Error(`Invalid solar timestamp ${interval.timestamp}`);
    if (interval.generationKwh < 0) throw new Error("Solar generation cannot be negative");
    if (interval.powerKw !== undefined && interval.powerKw < 0) throw new Error("Solar power cannot be negative");
    return {
      timestamp: new Date(interval.timestamp).toISOString(),
      generationKwh: new Decimal(interval.generationKwh).toDecimalPlaces(9).toNumber(),
      powerKw: new Decimal(interval.powerKw ?? interval.generationKwh / intervalHours).toDecimalPlaces(9).toNumber()
    };
  });
}

function detectSolarIntervalMinutes(intervals: SolarGenerationIntervalInput[]) {
  if (intervals.length < 2) return null;
  const sorted = [...intervals].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const minutes = sorted.slice(1).map((row, index) => {
    const previous = sorted[index];
    if (!previous) return 0;
    return (new Date(row.timestamp).getTime() - new Date(previous.timestamp).getTime()) / 60000;
  });
  const positive = minutes.filter((value) => value > 0);
  return positive.length === 0 ? null : mode(positive);
}

function scaleLoadIntervals(intervals: LoadIntervalInput[], factor: number): LoadIntervalInput[] {
  const intervalMinutes = detectIntervalMinutes(intervals) ?? 60;
  const intervalHours = intervalMinutes / 60;
  return intervals.map((interval) => {
    const energy = new Decimal(interval.energyKwh).mul(factor);
    return {
      timestamp: interval.timestamp,
      energyKwh: energy.toDecimalPlaces(6).toNumber(),
      powerKw: energy.div(intervalHours).toDecimalPlaces(6).toNumber()
    };
  });
}

function scaleGridImportIntervals(result: SolarSelfConsumptionResult, factor: number): LoadIntervalInput[] {
  const intervalHours = result.intervalMinutes / 60;
  return result.intervalResults.map((interval) => {
    const energy = new Decimal(interval.gridImportKwh).mul(factor);
    return {
      timestamp: interval.timestamp,
      energyKwh: energy.toDecimalPlaces(6).toNumber(),
      powerKw: energy.div(intervalHours).toDecimalPlaces(6).toNumber()
    };
  });
}

function toTariffInterval(interval: LoadIntervalInput) {
  return {
    timestamp: interval.timestamp,
    energyKwh: interval.energyKwh.toString(),
    ...(interval.powerKw === undefined ? {} : { powerKw: interval.powerKw.toString() })
  };
}

function inferMonthlyScaleFactor(intervals: LoadIntervalInput[]) {
  const days = countUniqueBangkokDates(intervals);
  return days > 0 ? new Decimal(30).div(days).toDecimalPlaces(6).toNumber() : 1;
}

function countUniqueBangkokDates(intervals: LoadIntervalInput[]) {
  return new Set(intervals.map((interval) => getBangkokDate(interval.timestamp))).size;
}

function sumLoadEnergy(intervals: LoadIntervalInput[]) {
  return intervals.reduce((sum, interval) => sum.plus(interval.energyKwh), zero);
}

function solarLossFactor(assumptions: SolarAssumptions) {
  const lossPercent = new Decimal(assumptions.systemLossPercent).plus(assumptions.shadingLossPercent);
  return Decimal.max(zero, new Decimal(1).minus(lossPercent.div(100)));
}

function buildDaylightShape(intervalMinutes: 15 | 30 | 60) {
  const points: Array<{ minuteOfDay: number; weight: Decimal }> = [];
  for (let minute = 0; minute < 24 * 60; minute += intervalMinutes) {
    if (minute < 6 * 60 || minute >= 18 * 60) {
      points.push({ minuteOfDay: minute, weight: zero });
      continue;
    }
    const daylightProgress = (minute - 6 * 60 + intervalMinutes / 2) / (12 * 60);
    const weight = new Decimal(Math.sin(Math.PI * daylightProgress)).toDecimalPlaces(9);
    points.push({ minuteOfDay: minute, weight });
  }
  return points;
}

function addLocalDays(date: string, days: number) {
  const [year = "2026", month = "01", day = "01"] = date.split("-");
  const utc = Date.UTC(Number(year), Number(month) - 1, Number(day) + days, 0, 0, 0);
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
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), hour - 7, minute, 0)).toISOString();
}

function getBangkokDate(timestamp: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) return timestamp;
  return getBangkokParts(timestamp).date;
}

function getBangkokParts(timestamp: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      weekday: "short"
    })
      .formatToParts(new Date(timestamp))
      .map((part) => [part.type, part.value])
  );
  const dayOfWeek = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[parts.weekday ?? ""] ?? 0;
  const hour = Number(parts.hour ?? 0);
  const minute = Number(parts.minute ?? 0);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
    minute,
    dayOfWeek,
    minuteOfDay: hour * 60 + minute
  };
}

function scaleFinancialAssumptions(input: FinancialAssumptions, systemSizeKwp: number, baseSystemSizeKwp: number): FinancialAssumptions {
  const scale = baseSystemSizeKwp > 0 ? new Decimal(systemSizeKwp).div(baseSystemSizeKwp) : new Decimal(1);
  return {
    ...input,
    capexThb: new Decimal(input.capexThb).mul(scale).toDecimalPlaces(2).toNumber(),
    oAndMCostPerYear: new Decimal(input.oAndMCostPerYear).mul(scale).toDecimalPlaces(2).toNumber(),
    inverterReplacementCostThb: new Decimal(input.inverterReplacementCostThb).mul(scale).toDecimalPlaces(2).toNumber()
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

function findPaybackYear(cashFlows: SolarCashFlow[], field: "cumulativeCashFlowThb" | "cumulativeDiscountedCashFlowThb") {
  for (let index = 1; index < cashFlows.length; index += 1) {
    const current = cashFlows[index];
    const previous = cashFlows[index - 1];
    if (!current || !previous) continue;
    if (current[field] >= 0) {
      const previousCumulative = new Decimal(previous[field]);
      const currentCashFlow = new Decimal(current[field]).minus(previousCumulative);
      if (currentCashFlow.lte(0)) return current.year;
      const fraction = previousCumulative.abs().div(currentCashFlow);
      return round(new Decimal(current.year - 1).plus(fraction), 2);
    }
  }
  return null;
}

function calculateIrr(cashFlows: Decimal[]) {
  const hasPositive = cashFlows.some((cashFlow) => cashFlow.gt(0));
  const hasNegative = cashFlows.some((cashFlow) => cashFlow.lt(0));
  if (!hasPositive || !hasNegative) return null;

  let low = new Decimal(-0.95);
  let high = new Decimal(1);
  let highNpv = npvAtRate(cashFlows, high);
  while (highNpv.gt(0) && high.lt(10)) {
    high = high.mul(2);
    highNpv = npvAtRate(cashFlows, high);
  }

  for (let index = 0; index < 80; index += 1) {
    const mid = low.plus(high).div(2);
    const value = npvAtRate(cashFlows, mid);
    if (value.gt(0)) low = mid;
    else high = mid;
  }

  return low.plus(high).div(2);
}

function npvAtRate(cashFlows: Decimal[], rate: Decimal) {
  return cashFlows.reduce((sum, cashFlow, year) => sum.plus(cashFlow.div(onePlus(rate).pow(year))), zero);
}

function onePlus(value: Decimal) {
  return new Decimal(1).plus(value);
}

function oneMinus(value: Decimal) {
  return Decimal.max(zero, new Decimal(1).minus(value));
}

function minBy<T>(items: T[], selector: (item: T) => number) {
  return items.reduce<T | null>((best, item) => (best === null || selector(item) < selector(best) ? item : best), null);
}

function maxBy<T>(items: T[], selector: (item: T) => number) {
  return items.reduce<T | null>((best, item) => (best === null || selector(item) > selector(best) ? item : best), null);
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values.map((value) => Number(value.toFixed(4))))].sort((a, b) => a - b);
}

function mode(values: number[]) {
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? values[0] ?? 0;
}

function ratio(numerator: Decimal, denominator: Decimal) {
  return denominator.gt(0) ? numerator.div(denominator).toDecimalPlaces(6).toNumber() : 0;
}

function round(value: Decimal.Value, places: number) {
  return new Decimal(value).toDecimalPlaces(places, Decimal.ROUND_HALF_UP).toNumber();
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function createDemoLoadProfile(profile: DemoSolarProfileKey, days: number): LoadIntervalInput[] {
  const intervals: LoadIntervalInput[] = [];
  const start = Date.UTC(2026, 0, 5, -7, 0, 0);
  for (let day = 0; day < days; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const timestamp = new Date(start + day * 24 * 60 * 60000 + hour * 60 * 60000).toISOString();
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
