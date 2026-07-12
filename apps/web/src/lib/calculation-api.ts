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

export const estimateRequestSchema = z
  .object({
    monthlyBillThb: z.number().positive().max(1_000_000).optional(),
    monthlyBills: z
      .array(
        z.object({
          month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Invalid month format. Expected YYYY-MM"),
          billThb: z.number().positive().max(1_000_000)
        })
      )
      .min(1)
      .max(12)
      .optional(),
    province: z.string().min(1).default("bangkok"),
    propertyType: propertyTypeSchema.default("home"),
    usageShape: usageShapeSchema.default("both"),
    billDate: z.string().date().default("2026-07-01"),
    systemSizeKwp: z.number().positive().max(100).optional(),
    capexPerKwpThb: z.number().positive().max(1_000_000).optional(),
    voltageLevel: voltageLevelSchema.default("low_voltage")
  })
  .refine(
    (data) => data.monthlyBillThb !== undefined || (data.monthlyBills !== undefined && data.monthlyBills.length > 0),
    {
      message: "Either monthlyBillThb or monthlyBills must be provided and non-empty",
      path: ["monthlyBillThb"]
    }
  )
  .refine(
    (data) => {
      if (data.monthlyBills) {
        const months = data.monthlyBills.map((b) => b.month);
        const uniqueMonths = new Set(months);
        return uniqueMonths.size === months.length;
      }
      return true;
    },
    {
      message: "monthlyBills cannot contain duplicate months",
      path: ["monthlyBills"]
    }
  );

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
    processedMonths: string[];
    filledBills: Array<{ month: string; billThb: number }>;
  };
  warnings: string[];
};

export const solarAnalyzeRequestSchema = z
  .object({
    province: z.string().min(1).default("Bangkok"),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
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
      .optional(),
    monthlyBills: z
      .array(
        z.object({
          month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Invalid month format. Expected YYYY-MM"),
          billThb: z.number().positive().max(1_000_000)
        })
      )
      .min(1)
      .max(12)
      .optional()
  })
  .refine(
    (data) => {
      if (data.monthlyBills) {
        const months = data.monthlyBills.map((b) => b.month);
        const uniqueMonths = new Set(months);
        return uniqueMonths.size === months.length;
      }
      return true;
    },
    {
      message: "monthlyBills cannot contain duplicate months",
      path: ["monthlyBills"]
    }
  );

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

function processMonthlyBills(monthlyBills: { month: string; billThb: number }[]) {
  const sorted = [...monthlyBills].sort((a, b) => a.month.localeCompare(b.month));
  const total = sorted.reduce((sum, b) => sum + b.billThb, 0);
  const average = total / sorted.length;

  const [startYear, startMonth] = sorted[0]!.month.split("-").map(Number);
  const filledBills: { month: string; billThb: number }[] = [];
  const processedMonths: string[] = [];

  for (let i = 0; i < 12; i++) {
    let year = startYear!;
    let month = startMonth! + i;
    while (month > 12) {
      month -= 12;
      year += 1;
    }
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    const existing = sorted.find((b) => b.month === monthStr);
    if (existing) {
      filledBills.push({ month: monthStr, billThb: existing.billThb });
    } else {
      filledBills.push({ month: monthStr, billThb: average });
    }
    processedMonths.push(monthStr);
  }

  return { filledBills, processedMonths, average };
}

export function runEstimateApiCalculation(request: EstimateApiRequest): EstimateApiPayload {
  const { authority, customerSegment, warnings } = resolveTariffScope(request.province, request.propertyType);

  const inputBills = request.monthlyBills && request.monthlyBills.length > 0
    ? request.monthlyBills
    : [{ month: request.billDate.slice(0, 7), billThb: request.monthlyBillThb! }];

  const { filledBills, processedMonths, average } = processMonthlyBills(inputBills);

  const finalWarnings = [...warnings];
  if (request.monthlyBills && request.monthlyBills.length < 12) {
    finalWarnings.push("Missing months in monthlyBills were averaged and padded to complete a 12-month period.");
  }

  const scaleFactors = Array(12).fill(1.0);
  for (const bill of filledBills) {
    const monthNum = Number(bill.month.split("-")[1]);
    scaleFactors[monthNum - 1] = bill.billThb / (average || 1);
  }

  const calculation = estimateSolarFromMonthlyBill({
    monthlyBillThb: average,
    authority,
    customerSegment,
    usageShape: request.usageShape,
    billDate: request.billDate,
    voltageLevel: request.voltageLevel,
    monthlyScaleFactors: scaleFactors,
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
      ],
      processedMonths,
      filledBills
    },
    warnings: finalWarnings
  };
}

export type SolarResourceOverride = {
  monthlySpecificYieldKwhPerKwp: number[];
  source: {
    status: "published";
    sourceUrl: string;
    authority: string;
    notes: string;
    verifiedAt: string;
  };
};

export function runSolarAnalyzeApiCalculation(
  request: SolarAnalyzeApiRequest,
  solarResource?: SolarResourceOverride,
): SolarAnalyzeApiPayload {
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
  if (solarResource) {
    demoInput.solarAssumptions = {
      ...demoInput.solarAssumptions,
      monthlySpecificYieldKwhPerKwp: solarResource.monthlySpecificYieldKwhPerKwp,
      yieldSource: solarResource.source,
    };
  }

  const scaleFactors: number[] | undefined = (() => {
    if (request.monthlyBills && request.monthlyBills.length > 0) {
      const { filledBills, average } = processMonthlyBills(request.monthlyBills);
      const sf = Array(12).fill(1.0);
      for (const bill of filledBills) {
        const monthNum = Number(bill.month.split("-")[1]);
        sf[monthNum - 1] = bill.billThb / (average || 1);
      }
      return sf;
    }
    return undefined;
  })();

  if (scaleFactors) {
    demoInput.monthlyScaleFactors = scaleFactors;
  }

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
    warnings: [
      ...(request.loadIntervals ? [] : ["No uploaded load intervals were provided; the API used a sample screening profile."]),
      ...(solarResource
        ? []
        : request.latitude !== undefined && request.longitude !== undefined
          ? ["PVGIS site data was unavailable, so the calculation used the screening yield profile instead."]
          : ["Solar yield is using the screening profile. Add latitude and longitude to use PVGIS site data."]),
    ]
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
