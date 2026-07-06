import Decimal from "decimal.js";
import type {
  Authority,
  CustomerSegment,
  LoadIntervalInput,
} from "@thai-energy-planner/shared-types";
import {
  calculateNormalBill,
  calculateTouBill,
  getOfficialThaiTariff,
  getOfficialThaiTariffPair,
  type OfficialVoltageLevel,
  type TariffCalculationResult,
} from "@thai-energy-planner/tariff-engine";
import {
  calculateBillAfterSolar,
  type ExportPolicy,
  type SolarGenerationIntervalInput,
} from "./solar-engine.js";
import { detectIntervalMinutes } from "./load-data.js";

export type ThaiBillingSegment = Extract<
  CustomerSegment,
  "residential" | "small_business"
>;
export type UsageShape = "day" | "night" | "both";

export type MonthlyBillCalculationInput = {
  authority: Authority;
  customerSegment: ThaiBillingSegment;
  billDate?: string | undefined;
  energyKwh: number;
  voltageLevel?: OfficialVoltageLevel | undefined;
};

export type TouBillCalculationInput = MonthlyBillCalculationInput & {
  peakKwh?: number | undefined;
  offPeakKwh?: number | undefined;
  intervals?: LoadIntervalInput[] | undefined;
};

export type NormalVsTouComparison = {
  normalBill: TariffCalculationResult;
  touBill: TariffCalculationResult;
  normalGrandTotalThb: number;
  touGrandTotalThb: number;
  touSavingsThb: number;
  touSavingsPercent: number;
  cheaperMode: "normal" | "tou";
};

export type IntervalSavingsSimulationInput = {
  authority: Authority;
  customerSegment: ThaiBillingSegment;
  billDate?: string | undefined;
  intervals: LoadIntervalInput[];
  offsetIntervals: Array<{ timestamp: string; energyKwh: number }>;
  voltageLevel?: OfficialVoltageLevel | undefined;
};

export type IntervalSavingsSimulationResult = {
  before: NormalVsTouComparison;
  after: NormalVsTouComparison;
  reducedIntervals: LoadIntervalInput[];
  totalOffsetKwh: number;
  normalSavingsThb: number;
  touSavingsThb: number;
  bestSavingsThb: number;
};

export type SolarRoiInput = {
  systemCostThb: number;
  annualSavingsThb: number;
  annualExportRevenueThb?: number | undefined;
  annualOperatingCostThb?: number | undefined;
};

export type SolarRoiResult = {
  annualSavingsThb: number;
  annualExportRevenueThb: number;
  annualNetBenefitThb: number;
  simplePaybackYears: number | null;
};

export type MonthlyBillSolarEstimateInput = {
  monthlyBillThb: number;
  authority: Authority;
  customerSegment: ThaiBillingSegment;
  billDate?: string | undefined;
  usageShape?: UsageShape | undefined;
  systemSizeKwp?: number | undefined;
  capexPerKwpThb?: number | undefined;
  voltageLevel?: OfficialVoltageLevel | undefined;
};

export type MonthlyBillSolarEstimateResult = {
  estimatedMonthlyKwh: number;
  recommendedSystemSizeKwp: number;
  estimatedPanelCount: { min: number; max: number };
  beforeSolar: NormalVsTouComparison;
  afterSolar: NormalVsTouComparison;
  annualSavingsThb: number;
  annualExportRevenueThb: number;
  paybackYears: number | null;
  capexThb: number;
};

const zero = new Decimal(0);

export function calculateMonthlyNormalBill(
  input: MonthlyBillCalculationInput,
): TariffCalculationResult {
  const tariffVersion = getOfficialThaiTariff({
    authority: input.authority,
    customerSegment: input.customerSegment,
    meterMode: "normal",
    billDate: input.billDate,
    monthlyEnergyKwh: input.energyKwh,
    voltageLevel: input.voltageLevel,
  });

  return calculateNormalBill({
    tariffVersion,
    billDate: input.billDate ?? "2026-07-01",
    energyKwh: input.energyKwh.toString(),
  });
}

export function calculateMonthlyTouBill(
  input: TouBillCalculationInput,
): TariffCalculationResult {
  const tariffVersion = getOfficialThaiTariff({
    authority: input.authority,
    customerSegment: input.customerSegment,
    meterMode: "tou",
    billDate: input.billDate,
    monthlyEnergyKwh: input.energyKwh,
    voltageLevel: input.voltageLevel,
  });
  const intervals =
    input.intervals?.map(toTariffInterval) ??
    buildTouBucketIntervals({
      billDate: input.billDate ?? "2026-07-01",
      peakKwh: input.peakKwh ?? input.energyKwh * 0.55,
      offPeakKwh: input.offPeakKwh ?? input.energyKwh * 0.45,
    });

  return calculateTouBill({ tariffVersion, intervals });
}

export function compareNormalVsTou(
  input: TouBillCalculationInput,
): NormalVsTouComparison {
  const normalBill = calculateMonthlyNormalBill(input);
  const touBill = calculateMonthlyTouBill(input);
  const normalGrandTotalThb = Number(normalBill.grandTotal);
  const touGrandTotalThb = Number(touBill.grandTotal);
  const touSavingsThb = round(
    new Decimal(normalGrandTotalThb).minus(touGrandTotalThb),
    2,
  );
  const touSavingsPercent =
    normalGrandTotalThb > 0
      ? round(new Decimal(touSavingsThb).div(normalGrandTotalThb).mul(100), 2)
      : 0;

  return {
    normalBill,
    touBill,
    normalGrandTotalThb,
    touGrandTotalThb,
    touSavingsThb,
    touSavingsPercent,
    cheaperMode: touGrandTotalThb < normalGrandTotalThb ? "tou" : "normal",
  };
}

export function simulateIntervalSavings(
  input: IntervalSavingsSimulationInput,
): IntervalSavingsSimulationResult {
  const intervals = input.intervals
    .map((interval) => ({
      ...interval,
      timestamp: normalizeTimestamp(interval.timestamp),
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const offsets = new Map(
    input.offsetIntervals.map((interval) => [
      normalizeTimestamp(interval.timestamp),
      new Decimal(interval.energyKwh),
    ]),
  );
  const intervalHours = new Decimal(detectIntervalMinutes(intervals) ?? 60).div(
    60,
  );
  const reducedIntervals = intervals.map((interval) => {
    const offsetKwh = offsets.get(interval.timestamp) ?? zero;
    const reducedEnergy = Decimal.max(
      new Decimal(interval.energyKwh).minus(offsetKwh),
      zero,
    );
    return {
      ...interval,
      energyKwh: round(reducedEnergy, 6),
      powerKw:
        interval.powerKw === undefined
          ? undefined
          : round(
              Decimal.max(
                new Decimal(interval.powerKw).minus(
                  offsetKwh.div(intervalHours),
                ),
                zero,
              ),
              6,
            ),
    };
  });
  const beforeEnergy = sumEnergy(intervals);
  const afterEnergy = sumEnergy(reducedIntervals);
  const before = compareNormalVsTou({
    authority: input.authority,
    customerSegment: input.customerSegment,
    billDate: input.billDate,
    energyKwh: beforeEnergy,
    intervals,
    voltageLevel: input.voltageLevel,
  });
  const after = compareNormalVsTou({
    authority: input.authority,
    customerSegment: input.customerSegment,
    billDate: input.billDate,
    energyKwh: afterEnergy,
    intervals: reducedIntervals,
    voltageLevel: input.voltageLevel,
  });
  const normalSavingsThb = round(
    new Decimal(before.normalGrandTotalThb).minus(after.normalGrandTotalThb),
    2,
  );
  const touSavingsThb = round(
    new Decimal(before.touGrandTotalThb).minus(after.touGrandTotalThb),
    2,
  );

  return {
    before,
    after,
    reducedIntervals,
    totalOffsetKwh: round(new Decimal(beforeEnergy).minus(afterEnergy), 6),
    normalSavingsThb,
    touSavingsThb,
    bestSavingsThb: Math.max(normalSavingsThb, touSavingsThb),
  };
}

export function calculateSolarROI(input: SolarRoiInput): SolarRoiResult {
  const annualSavings = new Decimal(input.annualSavingsThb);
  const annualExportRevenue = new Decimal(input.annualExportRevenueThb ?? 0);
  const annualOperatingCost = new Decimal(input.annualOperatingCostThb ?? 0);
  const annualNetBenefit = annualSavings
    .plus(annualExportRevenue)
    .minus(annualOperatingCost);

  return {
    annualSavingsThb: round(annualSavings, 2),
    annualExportRevenueThb: round(annualExportRevenue, 2),
    annualNetBenefitThb: round(annualNetBenefit, 2),
    simplePaybackYears: annualNetBenefit.gt(0)
      ? round(new Decimal(input.systemCostThb).div(annualNetBenefit), 2)
      : null,
  };
}

export function estimateMonthlyKwhFromBill(
  input: MonthlyBillCalculationInput & { monthlyBillThb: number },
): number {
  if (input.monthlyBillThb <= 0) return 0;

  let low = 0;
  let high = Math.max(200, input.monthlyBillThb / 2);
  while (
    Number(
      calculateMonthlyNormalBill({
        ...input,
        energyKwh: high,
      }).grandTotal,
    ) < input.monthlyBillThb &&
    high < 100000
  ) {
    high *= 2;
  }

  for (let index = 0; index < 48; index += 1) {
    const mid = (low + high) / 2;
    const bill = Number(
      calculateMonthlyNormalBill({ ...input, energyKwh: mid }).grandTotal,
    );
    if (bill < input.monthlyBillThb) low = mid;
    else high = mid;
  }

  return round(high, 2);
}

export function estimateSolarFromMonthlyBill(
  input: MonthlyBillSolarEstimateInput,
): MonthlyBillSolarEstimateResult {
  const billDate = input.billDate ?? "2026-07-01";
  const estimatedMonthlyKwh = estimateMonthlyKwhFromBill({
    authority: input.authority,
    customerSegment: input.customerSegment,
    billDate,
    energyKwh: 0,
    monthlyBillThb: input.monthlyBillThb,
    voltageLevel: input.voltageLevel,
  });
  const recommendedSystemSizeKwp = round(
    input.systemSizeKwp ?? clamp(estimatedMonthlyKwh / 115, 1, 20),
    1,
  );
  const capexThb = round(
    new Decimal(recommendedSystemSizeKwp).mul(input.capexPerKwpThb ?? 42000),
    2,
  );
  const intervals = buildEstimatedMonthlyLoadProfile({
    monthlyKwh: estimatedMonthlyKwh,
    billDate,
    usageShape: input.usageShape ?? "both",
    intervalMinutes: 30,
  });
  const solarIntervals = buildEstimatedMonthlySolarProfile({
    systemSizeKwp: recommendedSystemSizeKwp,
    billDate,
    intervalMinutes: 30,
  });
  const { normalTariff, touTariff } = getOfficialThaiTariffPair({
    authority: input.authority,
    customerSegment: input.customerSegment,
    billDate,
    monthlyEnergyKwh: estimatedMonthlyKwh,
    voltageLevel: input.voltageLevel,
  });
  const exportPolicy: ExportPolicy = {
    enabled: false,
    exportRateThbPerKwh: 0,
    status: "published",
    sourceUrl: null,
    authority: "Thai Energy Planner",
    notes:
      "Screening estimate assumes no export revenue unless the detailed solar analysis enables it.",
  };
  const comparison = calculateBillAfterSolar({
    loadIntervals: intervals,
    solarIntervals,
    normalTariff,
    touTariff,
    exportPolicy,
    billDate,
    monthlyScaleFactor: 1,
  });
  const roi = calculateSolarROI({
    systemCostThb: capexThb,
    annualSavingsThb: comparison.billSavings,
    annualExportRevenueThb: comparison.exportRevenue,
  });

  return {
    estimatedMonthlyKwh,
    recommendedSystemSizeKwp,
    estimatedPanelCount: {
      min: Math.max(1, Math.floor((recommendedSystemSizeKwp * 1000) / 600)),
      max: Math.max(1, Math.ceil((recommendedSystemSizeKwp * 1000) / 500)),
    },
    beforeSolar: compareNormalVsTou({
      authority: input.authority,
      customerSegment: input.customerSegment,
      billDate,
      energyKwh: estimatedMonthlyKwh,
      intervals,
      voltageLevel: input.voltageLevel,
    }),
    afterSolar: compareNormalVsTou({
      authority: input.authority,
      customerSegment: input.customerSegment,
      billDate,
      energyKwh: comparison.selfConsumption.gridImportKwh,
      intervals: comparison.selfConsumption.intervalResults.map((row) => ({
        timestamp: row.timestamp,
        energyKwh: row.gridImportKwh,
        powerKw: row.gridImportPowerKw,
      })),
      voltageLevel: input.voltageLevel,
    }),
    annualSavingsThb: roi.annualSavingsThb,
    annualExportRevenueThb: roi.annualExportRevenueThb,
    paybackYears: roi.simplePaybackYears,
    capexThb,
  };
}

export function inferThaiAuthorityFromProvince(province: string): Authority {
  const normalized = province.toLowerCase();
  return normalized.includes("bangkok") ||
    normalized.includes("กรุงเทพ") ||
    normalized.includes("นนทบุรี") ||
    normalized.includes("สมุทรปราการ")
    ? "MEA"
    : "PEA";
}

export function buildEstimatedMonthlyLoadProfile(input: {
  monthlyKwh: number;
  billDate?: string | undefined;
  usageShape: UsageShape;
  intervalMinutes: 15 | 30 | 60;
}): LoadIntervalInput[] {
  const billDate = input.billDate ?? "2026-07-01";
  const [year = "2026", month = "07"] = billDate.split("-");
  const days = new Date(Number(year), Number(month), 0).getDate();
  const weights = buildUsageWeights(input.usageShape, input.intervalMinutes);
  const dailyWeight = weights.reduce(
    (sum, item) => sum.plus(item.weight),
    zero,
  );
  const dailyKwh = new Decimal(input.monthlyKwh).div(days);
  const intervals: LoadIntervalInput[] = [];

  for (let day = 1; day <= days; day += 1) {
    const date = `${year}-${month}-${String(day).padStart(2, "0")}`;
    for (const item of weights) {
      const energy = dailyWeight.gt(0)
        ? dailyKwh.mul(item.weight).div(dailyWeight)
        : zero;
      const intervalHours = input.intervalMinutes / 60;
      intervals.push({
        timestamp: localDateMinuteToIso(date, item.minuteOfDay),
        energyKwh: round(energy, 6),
        powerKw: round(energy.div(intervalHours), 6),
      });
    }
  }

  return intervals;
}

export function buildEstimatedMonthlySolarProfile(input: {
  systemSizeKwp: number;
  billDate?: string | undefined;
  intervalMinutes: 15 | 30 | 60;
}): SolarGenerationIntervalInput[] {
  const billDate = input.billDate ?? "2026-07-01";
  const [year = "2026", month = "07"] = billDate.split("-");
  const days = new Date(Number(year), Number(month), 0).getDate();
  const monthlySpecificYield =
    [112, 118, 126, 124, 118, 108, 104, 106, 110, 112, 108, 106][
      Number(month) - 1
    ] ?? 110;
  const monthlyGeneration = new Decimal(input.systemSizeKwp)
    .mul(monthlySpecificYield)
    .mul(0.88);
  const dailyGeneration = monthlyGeneration.div(days);
  const shape = buildSolarWeights(input.intervalMinutes);
  const totalWeight = shape.reduce((sum, item) => sum.plus(item.weight), zero);
  const intervals: SolarGenerationIntervalInput[] = [];

  for (let day = 1; day <= days; day += 1) {
    const date = `${year}-${month}-${String(day).padStart(2, "0")}`;
    for (const item of shape) {
      const generation = totalWeight.gt(0)
        ? dailyGeneration.mul(item.weight).div(totalWeight)
        : zero;
      intervals.push({
        timestamp: localDateMinuteToIso(date, item.minuteOfDay),
        generationKwh: round(generation, 6),
        powerKw: round(generation.div(input.intervalMinutes / 60), 6),
      });
    }
  }

  return intervals;
}

function buildTouBucketIntervals(input: {
  billDate: string;
  peakKwh: number;
  offPeakKwh: number;
}) {
  const peakDate = findWeekdayDate(input.billDate);
  return [
    {
      timestamp: `${peakDate}T10:00:00+07:00`,
      energyKwh: String(Math.max(0, input.peakKwh)),
    },
    {
      timestamp: `${peakDate}T23:00:00+07:00`,
      energyKwh: String(Math.max(0, input.offPeakKwh)),
    },
  ];
}

function findWeekdayDate(date: string) {
  const [year = "2026", month = "07"] = date.split("-");
  for (let day = 1; day <= 7; day += 1) {
    const candidate = new Date(
      Date.UTC(Number(year), Number(month) - 1, day, 12, 0, 0),
    );
    const weekday = candidate.getUTCDay();
    if (weekday >= 1 && weekday <= 5)
      return `${year}-${month}-${String(day).padStart(2, "0")}`;
  }
  return `${year}-${month}-01`;
}

function buildUsageWeights(shape: UsageShape, intervalMinutes: 15 | 30 | 60) {
  const weights: Array<{ minuteOfDay: number; weight: Decimal }> = [];
  for (let minute = 0; minute < 24 * 60; minute += intervalMinutes) {
    const hour = Math.floor((minute + intervalMinutes / 2) / 60);
    let weight = new Decimal(0.7);
    if (shape === "day")
      weight = hour >= 8 && hour < 18 ? new Decimal(1.7) : new Decimal(0.45);
    if (shape === "night")
      weight =
        hour >= 18 && hour < 23
          ? new Decimal(2.2)
          : hour < 6
            ? new Decimal(0.8)
            : new Decimal(0.45);
    if (shape === "both")
      weight = hour >= 9 && hour < 22 ? new Decimal(1.25) : new Decimal(0.65);
    weights.push({ minuteOfDay: minute, weight });
  }
  return weights;
}

function buildSolarWeights(intervalMinutes: 15 | 30 | 60) {
  const weights: Array<{ minuteOfDay: number; weight: Decimal }> = [];
  for (let minute = 0; minute < 24 * 60; minute += intervalMinutes) {
    if (minute < 6 * 60 || minute >= 18 * 60) {
      weights.push({ minuteOfDay: minute, weight: zero });
      continue;
    }
    const progress = (minute - 6 * 60 + intervalMinutes / 2) / (12 * 60);
    weights.push({
      minuteOfDay: minute,
      weight: new Decimal(Math.sin(Math.PI * progress)).toDecimalPlaces(9),
    });
  }
  return weights;
}

function localDateMinuteToIso(date: string, minuteOfDay: number) {
  const [year = "2026", month = "07", day = "01"] = date.split("-");
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), hour - 7, minute, 0),
  ).toISOString();
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

function sumEnergy(intervals: LoadIntervalInput[]) {
  return round(
    intervals.reduce((sum, interval) => sum.plus(interval.energyKwh), zero),
    6,
  );
}

function normalizeTimestamp(timestamp: string) {
  const parsed = new Date(timestamp);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : timestamp;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: Decimal.Value, places: number) {
  return new Decimal(value)
    .toDecimalPlaces(places, Decimal.ROUND_HALF_UP)
    .toNumber();
}
