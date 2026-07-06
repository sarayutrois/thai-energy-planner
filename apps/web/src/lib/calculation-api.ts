import { z } from "zod";
import {
  createDemoSolarInput,
  estimateSolarFromMonthlyBill,
  inferThaiAuthorityFromProvince,
  runSolarAnalysis,
  type DemoSolarProfileKey,
  type SolarAnalysisResult,
  type SolarGenerationIntervalInput,
  type SolarModelDetailLevel
} from "@thai-energy-planner/calculation-engine";
import { getOfficialThaiTariffPair } from "@thai-energy-planner/tariff-engine";
import type { Authority, CustomerSegment, LoadIntervalInput } from "@thai-energy-planner/shared-types";

const propertyTypeSchema = z.enum(["home", "business", "factory"]);
const usageShapeSchema = z.enum(["day", "night", "both"]);
const voltageLevelSchema = z.enum(["low_voltage", "medium_voltage"]);
const solarProfileSchema = z.enum(["evening_home", "daytime_home", "daytime_shop"]);
const modelModeSchema = z.enum(["easy", "advanced", "xhigh"]);

export const estimateRequestSchema = z.object({
  monthlyBillThb: z.number().positive().max(1_000_000),
  province: z.string().min(1).default("bangkok"),
  propertyType: propertyTypeSchema.default("home"),
  usageShape: usageShapeSchema.default("both"),
  billDate: z.string().date().default("2026-07-01"),
  systemSizeKwp: z.number().positive().max(100).optional(),
  capexPerKwpThb: z.number().positive().max(1_000_000).optional(),
  voltageLevel: voltageLevelSchema.default("low_voltage")
});

export type EstimateApiRequest = z.infer<typeof estimateRequestSchema>;

export type EstimateApiResult = {
  estimatedMonthlyKwh: number;
  recommendedSystemSizeKwp: number;
  estimatedPanelCount: { min: number; max: number };
  monthlySavingsThb: number;
  annualSavingsThb: number;
  annualExportRevenueThb: number;
  paybackYears: number | null;
  capexThb: number;
  beforeSolar: {
    cheaperMode: "normal" | "tou";
    normalGrandTotalThb: number;
    touGrandTotalThb: number;
    touSavingsThb: number;
  };
  afterSolar: {
    cheaperMode: "normal" | "tou";
    normalGrandTotalThb: number;
    touGrandTotalThb: number;
    touSavingsThb: number;
  };
};

export type EstimateApiPayload = {
  result: EstimateApiResult;
  trace: {
    authority: Authority;
    customerSegment: Extract<CustomerSegment, "residential" | "small_business">;
    billDate: string;
    supportedTariffScope: "residential_small_business";
    tariffVersionIds: string[];
  };
  warnings: string[];
};

export const solarAnalyzeRequestSchema = z.object({
  province: z.string().min(1).default("Bangkok"),
  customerSegment: z.enum(["residential", "small_business"]).optional(),
  profile: solarProfileSchema.default("evening_home"),
  modelMode: modelModeSchema.default("xhigh"),
  billDate: z.string().date().default("2026-07-01"),
  voltageLevel: voltageLevelSchema.default("low_voltage"),
  systemSizeKwp: z.number().positive().max(100).optional(),
  roofAreaSqm: z.number().nonnegative().max(20_000).optional(),
  roofAzimuth: z.number().min(0).max(360).optional(),
  roofTilt: z.number().min(0).max(60).optional(),
  systemLossPercent: z.number().min(0).max(100).optional(),
  shadingLossPercent: z.number().min(0).max(100).optional(),
  degradationPercentPerYear: z.number().min(0).max(100).optional(),
  capexThb: z.number().nonnegative().max(100_000_000).optional(),
  oAndMCostPerYear: z.number().nonnegative().max(10_000_000).optional(),
  projectLifeYears: z.number().int().positive().max(40).optional(),
  discountRatePercent: z.number().min(0).max(30).optional(),
  electricityEscalationRatePercent: z.number().min(0).max(30).optional(),
  inverterReplacementCostThb: z.number().nonnegative().max(20_000_000).optional(),
  inverterReplacementYear: z.number().int().min(0).max(40).optional(),
  exportEnabled: z.boolean().optional(),
  exportRateThbPerKwh: z.number().nonnegative().max(20).optional(),
  exportLimitKw: z.number().nonnegative().max(10_000).optional(),
  loadIntervals: z
    .array(
      z.object({
        timestamp: z.string().datetime({ offset: true }),
        energyKwh: z.number().nonnegative(),
        powerKw: z.number().nonnegative().optional()
      })
    )
    .min(1)
    .max(50_000)
    .optional(),
  solarProfile: z
    .array(
      z.object({
        timestamp: z.string().datetime({ offset: true }),
        generationKwh: z.number().nonnegative(),
        powerKw: z.number().nonnegative().optional()
      })
    )
    .max(50_000)
    .optional()
});

export type SolarAnalyzeApiRequest = z.infer<typeof solarAnalyzeRequestSchema>;

export type SolarAnalyzeApiPayload = {
  analysis: SolarAnalysisResult;
  trace: {
    authority: Authority;
    customerSegment: Extract<CustomerSegment, "residential" | "small_business">;
    billDate: string;
    inputIntervalCount: number;
    uploadedSolarIntervalCount: number;
    tariffVersionIds: string[];
  };
  warnings: string[];
};

export function runEstimateApiCalculation(request: EstimateApiRequest): EstimateApiPayload {
  const { authority, customerSegment, warnings } = resolveTariffScope(request.province, request.propertyType);
  const calculation = estimateSolarFromMonthlyBill({
    monthlyBillThb: request.monthlyBillThb,
    authority,
    customerSegment,
    usageShape: request.usageShape,
    billDate: request.billDate,
    voltageLevel: request.voltageLevel,
    ...(request.systemSizeKwp === undefined ? {} : { systemSizeKwp: request.systemSizeKwp }),
    ...(request.capexPerKwpThb === undefined ? {} : { capexPerKwpThb: request.capexPerKwpThb })
  });

  return {
    result: {
      estimatedMonthlyKwh: calculation.estimatedMonthlyKwh,
      recommendedSystemSizeKwp: calculation.recommendedSystemSizeKwp,
      estimatedPanelCount: calculation.estimatedPanelCount,
      monthlySavingsThb: round(calculation.annualSavingsThb / 12, 2),
      annualSavingsThb: calculation.annualSavingsThb,
      annualExportRevenueThb: calculation.annualExportRevenueThb,
      paybackYears: calculation.paybackYears,
      capexThb: calculation.capexThb,
      beforeSolar: compactComparison(calculation.beforeSolar),
      afterSolar: compactComparison(calculation.afterSolar)
    },
    trace: {
      authority,
      customerSegment,
      billDate: request.billDate,
      supportedTariffScope: "residential_small_business",
      tariffVersionIds: [
        calculation.beforeSolar.normalBill.tariffVersionId,
        calculation.beforeSolar.touBill.tariffVersionId,
        calculation.afterSolar.normalBill.tariffVersionId,
        calculation.afterSolar.touBill.tariffVersionId
      ]
    },
    warnings
  };
}

export function runSolarAnalyzeApiCalculation(request: SolarAnalyzeApiRequest): SolarAnalyzeApiPayload {
  const authority = inferThaiAuthorityFromProvince(request.province);
  const customerSegment = request.customerSegment ?? (request.profile === "daytime_shop" ? "small_business" : "residential");
  const demoInput = createDemoSolarInput(request.profile as DemoSolarProfileKey, buildSolarOverrides(request));
  const tariffs = getOfficialThaiTariffPair({
    authority,
    customerSegment,
    billDate: request.billDate,
    monthlyEnergyKwh: request.loadIntervals ? sumEnergy(request.loadIntervals) : undefined,
    voltageLevel: request.voltageLevel
  });
  demoInput.normalTariff = tariffs.normalTariff;
  demoInput.touTariff = tariffs.touTariff;
  demoInput.billDate = request.billDate;
  demoInput.modelDetailLevel = request.modelMode as SolarModelDetailLevel;
  demoInput.solarAssumptions = {
    ...demoInput.solarAssumptions,
    province: request.province,
    ...(request.roofAreaSqm === undefined ? {} : { roofAreaSqm: request.roofAreaSqm }),
    ...(request.roofAzimuth === undefined ? {} : { roofAzimuth: request.roofAzimuth }),
    ...(request.roofTilt === undefined ? {} : { roofTilt: request.roofTilt })
  };

  if (request.loadIntervals) {
    demoInput.loadIntervals = request.loadIntervals.map((interval) => ({ ...interval })) as LoadIntervalInput[];
  } else {
    demoInput.loadIntervals = shiftIntervalsToBillDate(demoInput.loadIntervals, request.billDate);
  }
  if (request.solarProfile) {
    demoInput.solarProfile = request.solarProfile.map((interval) => ({ ...interval })) as SolarGenerationIntervalInput[];
  }
  if (request.exportEnabled !== undefined) demoInput.exportPolicy.enabled = request.exportEnabled;
  if (request.exportRateThbPerKwh !== undefined) demoInput.exportPolicy.exportRateThbPerKwh = request.exportRateThbPerKwh;
  if (request.exportLimitKw !== undefined) demoInput.exportPolicy.exportLimitKw = request.exportLimitKw;

  const analysis = runSolarAnalysis(demoInput);

  return {
    analysis,
    trace: {
      authority,
      customerSegment,
      billDate: request.billDate,
      inputIntervalCount: demoInput.loadIntervals.length,
      uploadedSolarIntervalCount: request.solarProfile?.length ?? 0,
      tariffVersionIds: analysis.billComparison.calculationTrace.tariffVersionIds
    },
    warnings: request.loadIntervals ? [] : ["No uploaded load intervals were provided; the API used a sample screening profile."]
  };
}

export function zodIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
}

function resolveTariffScope(province: string, propertyType: z.infer<typeof propertyTypeSchema>) {
  const authority = inferThaiAuthorityFromProvince(province);
  const warnings: string[] = [];
  if (propertyType === "factory") {
    warnings.push("Factory/large-building tariffs are not implemented yet; this screening estimate uses small business low-voltage rates.");
  }

  return {
    authority,
    customerSegment: propertyType === "home" ? ("residential" as const) : ("small_business" as const),
    warnings
  };
}

function buildSolarOverrides(request: SolarAnalyzeApiRequest): NonNullable<Parameters<typeof createDemoSolarInput>[1]> {
  const overrides: NonNullable<Parameters<typeof createDemoSolarInput>[1]> = {};
  if (request.systemSizeKwp !== undefined) overrides.systemSizeKwp = request.systemSizeKwp;
  if (request.capexThb !== undefined) overrides.capexThb = request.capexThb;
  if (request.roofAreaSqm !== undefined) overrides.roofAreaSqm = request.roofAreaSqm;
  if (request.roofAzimuth !== undefined) overrides.roofAzimuth = request.roofAzimuth;
  if (request.roofTilt !== undefined) overrides.roofTilt = request.roofTilt;
  if (request.systemLossPercent !== undefined) overrides.systemLossPercent = request.systemLossPercent;
  if (request.shadingLossPercent !== undefined) overrides.shadingLossPercent = request.shadingLossPercent;
  if (request.degradationPercentPerYear !== undefined) overrides.degradationPercentPerYear = request.degradationPercentPerYear;
  if (request.oAndMCostPerYear !== undefined) overrides.oAndMCostPerYear = request.oAndMCostPerYear;
  if (request.projectLifeYears !== undefined) overrides.projectLifeYears = request.projectLifeYears;
  if (request.discountRatePercent !== undefined) overrides.discountRatePercent = request.discountRatePercent;
  if (request.electricityEscalationRatePercent !== undefined) {
    overrides.electricityEscalationRatePercent = request.electricityEscalationRatePercent;
  }
  if (request.inverterReplacementCostThb !== undefined) overrides.inverterReplacementCostThb = request.inverterReplacementCostThb;
  if (request.inverterReplacementYear !== undefined) {
    overrides.inverterReplacementYear = request.inverterReplacementYear === 0 ? null : request.inverterReplacementYear;
  }
  if (request.exportEnabled !== undefined) overrides.exportEnabled = request.exportEnabled;
  if (request.exportRateThbPerKwh !== undefined) overrides.exportRateThbPerKwh = request.exportRateThbPerKwh;
  if (request.exportLimitKw !== undefined) overrides.exportLimitKw = request.exportLimitKw;
  overrides.modelDetailLevel = request.modelMode;
  return overrides;
}

function compactComparison(comparison: ReturnType<typeof estimateSolarFromMonthlyBill>["beforeSolar"]): EstimateApiResult["beforeSolar"] {
  return {
    cheaperMode: comparison.cheaperMode,
    normalGrandTotalThb: comparison.normalGrandTotalThb,
    touGrandTotalThb: comparison.touGrandTotalThb,
    touSavingsThb: comparison.touSavingsThb
  };
}

function sumEnergy(intervals: Array<{ energyKwh: number }>) {
  return intervals.reduce((sum, interval) => sum + interval.energyKwh, 0);
}

function shiftIntervalsToBillDate(intervals: LoadIntervalInput[], billDate: string): LoadIntervalInput[] {
  if (intervals.length === 0) return intervals;

  const [year = "2026", month = "07"] = billDate.split("-");
  const sorted = [...intervals].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const stepMs =
    sorted.length > 1
      ? new Date(sorted[1]!.timestamp).getTime() - new Date(sorted[0]!.timestamp).getTime()
      : 60 * 60 * 1000;
  const startMs = Date.UTC(Number(year), Number(month) - 1, 1, -7, 0, 0);

  return sorted.map((interval, index) => ({
    ...interval,
    timestamp: new Date(startMs + index * stepMs).toISOString()
  }));
}

function round(value: number, places: number) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
