import Decimal from "decimal.js";
import type {
  CanonicalLoadProfile,
  LoadIntervalInput,
} from "@thai-energy-planner/shared-types";
import { LoadIntervalSchema } from "@thai-energy-planner/shared-types";
import {
  calculateNormalBill,
  calculateTouBill,
  createTariffSnapshot,
  demoNormalTariff,
  demoTouTariff,
  selectTouPeriod,
  type TariffCalculationResult,
  type TariffVersionConfig,
} from "@thai-energy-planner/tariff-engine";
import { detectIntervalMinutes, summarizeLoadProfile } from "./load-data.js";
import { canonicalLoadProfileToLoadIntervals } from "./load-profile-adapters.js";
import {
  compareScenarios,
  type EnergyScenarioComparisonResult,
} from "./scenario.js";

export const scenarioEngineVersion = "0.4.0-scenario-engine";

export type ScenarioKind =
  | "CURRENT_NORMAL"
  | "CURRENT_TOU"
  | "SWITCH_TO_TOU_NO_BEHAVIOR_CHANGE"
  | "LOAD_SHIFT_TO_OFF_PEAK"
  | "CUSTOM_LOAD_SHIFT";

export type LoadShiftRuleInput = {
  name: string;
  enabled?: boolean | undefined;
  sourceStartTime?: string | undefined;
  sourceEndTime?: string | undefined;
  targetStartTime?: string | undefined;
  targetEndTime?: string | undefined;
  shiftKwhPerDay?: number | undefined;
  shiftKwhPerMonth?: number | undefined;
  shiftPercentOfPeak?: number | undefined;
  maxShiftKwh?: number | undefined;
  maxPostShiftPowerKw?: number | undefined;
};

export type ScenarioRecommendation = {
  type:
    | "stay_normal"
    | "switch_tou"
    | "shift_then_tou"
    | "insufficient_data"
    | "high_peak_load"
    | "future_solar_candidate"
    | "night_load_candidate";
  priority: 1 | 2 | 3;
  title: string;
  explanation: string;
  supportingMetrics: Record<string, number | string | null>;
  confidence: "low" | "medium" | "high";
  limitations: string[];
  nextAction: string;
};

export type DataQualityResult = {
  level: "HIGH" | "MEDIUM" | "LOW";
  score: number;
  reasons: string[];
  limitations: string[];
  metrics: {
    intervalDays: number;
    intervalCount: number;
    missingRatio: number;
    hasWeekday: boolean;
    hasWeekend: boolean;
    billMonthCount: number;
  };
};

export type LoadShiftResult = {
  intervals: LoadIntervalInput[];
  requestedShiftKwh: number;
  actualShiftKwh: number;
  sourcePeakKwhBefore: number;
  sourcePeakKwhAfter: number;
  targetOffPeakKwhBefore: number;
  targetOffPeakKwhAfter: number;
  totalKwhBefore: number;
  totalKwhAfter: number;
  rulesApplied: Array<{
    name: string;
    requestedKwh: number;
    actualKwh: number;
    sourceIntervalCount: number;
    targetIntervalCount: number;
  }>;
  warnings: string[];
};

export type ScenarioResult = {
  id: string;
  kind: ScenarioKind;
  name: string;
  tariffMode: "normal" | "tou";
  totalKwh: number;
  peakKwh: number;
  offPeakKwh: number;
  baseEnergyCharge: number;
  peakEnergyCharge: number;
  offPeakEnergyCharge: number;
  demandCharge: number;
  ftCharge: number;
  serviceCharge: number;
  vat: number;
  grandTotal: number;
  effectiveRatePerKwh: number;
  monthlyEstimatedBill: number;
  annualEstimatedBill: number;
  savingsMonthly: number;
  savingsAnnual: number;
  savingsPercent: number;
  paybackMonths: number | null;
  assumptions: Record<string, unknown>;
  calculationTrace: {
    tariffVersionId: string;
    tariffVersionLabel: string;
    tariffStatus: string;
    tariffEffectiveFrom: string;
    tariffEffectiveTo: string | null;
    tariffVerifiedAt: string | null;
    sourceUrl: string | null;
    tariffSnapshot: unknown;
    lineItems: TariffCalculationResult["lineItems"];
    intervalTraceCount: number;
    loadShift?: LoadShiftResult | undefined;
  };
};

export type TouBreakEvenAnalysis = {
  currentOffPeakRatio: number;
  requiredOffPeakRatio: number;
  requiredShiftKwhPerMonth: number;
  estimatedSavingsAfterShift: number;
  paybackMonths: number | null;
  explanation: string;
};

export type ScenarioComparisonResult = {
  baseline: ScenarioResult;
  scenarios: ScenarioResult[];
  bestScenario: ScenarioResult;
  breakEven: TouBreakEvenAnalysis;
  recommendations: ScenarioRecommendation[];
  dataQuality: DataQualityResult;
  financialComparison: EnergyScenarioComparisonResult;
};

export type ScenarioEngineInput = {
  intervals: LoadIntervalInput[];
  normalTariff: TariffVersionConfig;
  touTariff: TariffVersionConfig;
  billDate?: string | undefined;
  scenarioKinds?: ScenarioKind[] | undefined;
  loadShiftRules?: LoadShiftRuleInput[] | undefined;
  meterSwitchingCostThb?: number | undefined;
  monthlyScaleFactor?: number | undefined;
  billMonthCount?: number | undefined;
  dataSource?: "interval" | "bill" | "appliance" | "demo" | undefined;
};

export type CanonicalScenarioEngineInput = Omit<
  ScenarioEngineInput,
  "intervals" | "billDate" | "dataSource"
> & {
  profile: CanonicalLoadProfile;
  billDate?: string | undefined;
};

/** Converts the versioned profile contract into ScenarioEngineInput without demo data. */
export function createScenarioInputFromCanonicalLoadProfile(
  input: CanonicalScenarioEngineInput,
): ScenarioEngineInput {
  const intervals = canonicalLoadProfileToLoadIntervals(input.profile);
  const source = input.profile.source.kind;
  const dataSource =
    source === "appliance"
      ? "appliance"
      : source === "bill_estimate"
        ? "bill"
        : source === "demo"
          ? "demo"
          : "interval";

  return {
    intervals,
    normalTariff: input.normalTariff,
    touTariff: input.touTariff,
    ...(input.billDate === undefined
      ? { billDate: getBangkokDate(intervals[0]!.timestamp) }
      : { billDate: input.billDate }),
    ...(input.scenarioKinds === undefined
      ? {}
      : { scenarioKinds: input.scenarioKinds }),
    ...(input.loadShiftRules === undefined
      ? {}
      : { loadShiftRules: input.loadShiftRules }),
    ...(input.meterSwitchingCostThb === undefined
      ? {}
      : { meterSwitchingCostThb: input.meterSwitchingCostThb }),
    ...(input.monthlyScaleFactor === undefined
      ? {}
      : { monthlyScaleFactor: input.monthlyScaleFactor }),
    ...(input.billMonthCount === undefined
      ? {}
      : { billMonthCount: input.billMonthCount }),
    dataSource,
  };
}

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
const defaultScenarioKinds: ScenarioKind[] = [
  "CURRENT_TOU",
  "SWITCH_TO_TOU_NO_BEHAVIOR_CHANGE",
  "LOAD_SHIFT_TO_OFF_PEAK",
];

export function runScenarioComparison(
  input: ScenarioEngineInput,
): ScenarioComparisonResult {
  validateScenarioEngineInput(input);
  const sourceIntervals = normalizeIntervals(input.intervals);
  const billDate =
    input.billDate ??
    getBangkokDate(
      sourceIntervals[0]?.timestamp ?? input.normalTariff.effectiveFrom,
    );
  const monthlyScaleFactor =
    input.monthlyScaleFactor ?? inferMonthlyScaleFactor(sourceIntervals);
  const dataQuality = scoreScenarioDataQuality({
    intervals: sourceIntervals,
    billMonthCount: input.billMonthCount ?? 0,
    source: input.dataSource,
  });
  const baseContext = {
    intervals: sourceIntervals,
    normalTariff: input.normalTariff,
    touTariff: input.touTariff,
    billDate,
    monthlyScaleFactor,
    meterSwitchingCostThb: input.meterSwitchingCostThb ?? 0,
  };
  const baseline = calculateScenario({
    ...baseContext,
    kind: "CURRENT_NORMAL",
    name: "Current Normal",
    baselineGrandTotal: null,
  });
  const scenarios = (input.scenarioKinds ?? defaultScenarioKinds).map(
    (kind) => {
      const shifted =
        kind === "LOAD_SHIFT_TO_OFF_PEAK" || kind === "CUSTOM_LOAD_SHIFT"
          ? applyLoadShiftRules(sourceIntervals, {
              tariffVersion: input.touTariff,
              rules: input.loadShiftRules ?? [defaultLoadShiftRule()],
              monthlyScaleFactor,
            })
          : undefined;

      return calculateScenario({
        ...baseContext,
        kind,
        name: scenarioName(kind),
        baselineGrandTotal: baseline.grandTotal,
        loadShift: shifted,
      });
    },
  );
  const breakEven = analyzeTouBreakEven({
    intervals: sourceIntervals,
    normalTariff: input.normalTariff,
    touTariff: input.touTariff,
    billDate,
    monthlyScaleFactor,
    meterSwitchingCostThb: input.meterSwitchingCostThb ?? 0,
  });
  const bestScenario = scenarios.reduce(
    (best, scenario) =>
      scenario.grandTotal < best.grandTotal ? scenario : best,
    baseline,
  );
  const recommendations = buildRecommendations({
    baseline,
    scenarios,
    breakEven,
    dataQuality,
    loadSummary: summarizeLoadProfile(
      scaleIntervalsForBilling(sourceIntervals, monthlyScaleFactor),
      {
        tariffVersion: input.touTariff,
      },
    ),
  });
  const financialComparison = compareScenarios({
    currentNormalAnnualCostThb: baseline.annualEstimatedBill,
    scenarios: scenarios.map((scenario) => ({
      scenarioName: scenario.name,
      annualCostThb: scenario.annualEstimatedBill,
      investmentThb:
        scenario.kind === "CURRENT_NORMAL"
          ? 0
          : (input.meterSwitchingCostThb ?? 0),
      simplePaybackYear:
        scenario.paybackMonths === null
          ? null
          : new Decimal(scenario.paybackMonths)
              .div(12)
              .toDecimalPlaces(2)
              .toNumber(),
    })),
  });

  return {
    baseline,
    scenarios,
    bestScenario,
    breakEven,
    recommendations,
    dataQuality,
    financialComparison,
  };
}

export function calculateScenario(input: {
  kind: ScenarioKind;
  name: string;
  intervals: LoadIntervalInput[];
  normalTariff: TariffVersionConfig;
  touTariff: TariffVersionConfig;
  billDate: string;
  monthlyScaleFactor: number;
  meterSwitchingCostThb: number;
  baselineGrandTotal: number | null;
  loadShift?: LoadShiftResult | undefined;
}): ScenarioResult {
  const workingIntervals = input.loadShift?.intervals ?? input.intervals;
  const billingIntervals = scaleIntervalsForBilling(
    workingIntervals,
    input.monthlyScaleFactor,
  );
  const monthlyKwh = sumEnergy(billingIntervals);
  const touSummary = summarizeLoadProfile(billingIntervals, {
    tariffVersion: input.touTariff,
  });
  const tariffResult =
    input.kind === "CURRENT_NORMAL"
      ? calculateNormalBill({
          tariffVersion: input.normalTariff,
          billDate: input.billDate,
          energyKwh: monthlyKwh.toString(),
        })
      : calculateTouBill({
          tariffVersion: input.touTariff,
          intervals: billingIntervals.map((interval) => ({
            timestamp: interval.timestamp,
            energyKwh: interval.energyKwh.toString(),
            ...(interval.powerKw === undefined
              ? {}
              : { powerKw: interval.powerKw.toString() }),
          })),
        });
  const grandTotal = toNumber(tariffResult.grandTotal);
  const baselineTotal = input.baselineGrandTotal ?? grandTotal;
  const savingsMonthly = new Decimal(baselineTotal).minus(grandTotal);
  const savingsPercent =
    baselineTotal > 0 ? savingsMonthly.div(baselineTotal).mul(100) : zero;
  const paybackMonths =
    input.meterSwitchingCostThb > 0 && savingsMonthly.gt(0)
      ? new Decimal(input.meterSwitchingCostThb)
          .div(savingsMonthly)
          .toDecimalPlaces(2)
          .toNumber()
      : null;

  return {
    id: scenarioId(input.kind),
    kind: input.kind,
    name: input.name,
    tariffMode: tariffResult.mode,
    totalKwh: toNumber(tariffResult.energyKwh),
    peakKwh:
      input.kind === "CURRENT_NORMAL"
        ? touSummary.peakPeriodKwh
        : toNumber(tariffResult.peakEnergyKwh),
    offPeakKwh:
      input.kind === "CURRENT_NORMAL"
        ? touSummary.offPeakPeriodKwh
        : toNumber(tariffResult.offPeakEnergyKwh),
    baseEnergyCharge: toNumber(tariffResult.baseEnergyCharge),
    peakEnergyCharge: toNumber(tariffResult.peakEnergyCharge),
    offPeakEnergyCharge: toNumber(tariffResult.offPeakEnergyCharge),
    demandCharge: toNumber(tariffResult.demandCharge),
    ftCharge: toNumber(tariffResult.ftCharge),
    serviceCharge: toNumber(tariffResult.serviceCharge),
    vat: toNumber(tariffResult.vat),
    grandTotal,
    effectiveRatePerKwh: toNumber(tariffResult.effectiveRatePerKwh),
    monthlyEstimatedBill: grandTotal,
    annualEstimatedBill: new Decimal(grandTotal)
      .mul(12)
      .toDecimalPlaces(2)
      .toNumber(),
    savingsMonthly: savingsMonthly.toDecimalPlaces(2).toNumber(),
    savingsAnnual: savingsMonthly.mul(12).toDecimalPlaces(2).toNumber(),
    savingsPercent: savingsPercent.toDecimalPlaces(2).toNumber(),
    paybackMonths,
    assumptions: {
      engineVersion: scenarioEngineVersion,
      monthlyScaleFactor: input.monthlyScaleFactor,
      billDate: input.billDate,
      meterSwitchingCostThb: input.meterSwitchingCostThb,
      totalKwhPreservedAfterShift: input.loadShift
        ? nearlyEqual(
            input.loadShift.totalKwhBefore,
            input.loadShift.totalKwhAfter,
          )
        : true,
    },
    calculationTrace: {
      tariffVersionId: tariffResult.tariffVersionId,
      tariffVersionLabel: tariffResult.tariffVersionLabel,
      tariffStatus: tariffResult.tariffStatus,
      tariffEffectiveFrom: tariffResult.tariffSnapshot.effectiveFrom,
      tariffEffectiveTo: tariffResult.tariffSnapshot.effectiveTo,
      tariffVerifiedAt: tariffResult.verifiedAt,
      sourceUrl: tariffResult.sourceUrl,
      tariffSnapshot: tariffResult.tariffSnapshot,
      lineItems: tariffResult.lineItems,
      intervalTraceCount: tariffResult.intervalTraces.length,
      loadShift: input.loadShift,
    },
  };
}

export function applyLoadShiftRules(
  intervals: LoadIntervalInput[],
  options: {
    tariffVersion: TariffVersionConfig;
    rules: LoadShiftRuleInput[];
    monthlyScaleFactor?: number | undefined;
  },
): LoadShiftResult {
  const normalized = normalizeIntervals(intervals);
  const intervalMinutes = detectIntervalMinutes(normalized) ?? 60;
  const intervalHours = intervalMinutes / 60;
  const working = normalized.map((interval) => ({ ...interval }));
  const totalBefore = sumEnergy(working);
  const monthlyScaleFactor =
    options.monthlyScaleFactor ?? inferMonthlyScaleFactor(normalized);
  const rulesApplied: LoadShiftResult["rulesApplied"] = [];
  const warnings: string[] = [];

  for (const rule of options.rules) {
    const validationErrors = validateLoadShiftRule(rule);
    if (validationErrors.length > 0) {
      throw new Error(
        `Invalid load shift rule ${rule.name}: ${validationErrors.join(", ")}`,
      );
    }
    if (rule.enabled === false) continue;

    const sourceIndexes = findShiftCandidateIndexes(working, {
      tariffVersion: options.tariffVersion,
      periodType: "peak",
      startTime: rule.sourceStartTime,
      endTime: rule.sourceEndTime,
    });
    const targetIndexes = findShiftCandidateIndexes(working, {
      tariffVersion: options.tariffVersion,
      periodType: "off_peak",
      startTime: rule.targetStartTime,
      endTime: rule.targetEndTime,
    });
    const sourceEnergy = sumIndexedEnergy(working, sourceIndexes);
    const targetEnergyBefore = sumIndexedEnergy(working, targetIndexes);
    const requestedShift = resolveRequestedShiftKwh(rule, {
      sourcePeakKwh: sourceEnergy,
      profileDayCount: countUniqueBangkokDates(working),
      monthlyScaleFactor,
    });
    const actualShift = Decimal.min(requestedShift, sourceEnergy);

    if (
      sourceIndexes.length === 0 ||
      targetIndexes.length === 0 ||
      actualShift.lte(0)
    ) {
      warnings.push(
        `Rule ${rule.name} could not shift load because source or target intervals were unavailable.`,
      );
      rulesApplied.push({
        name: rule.name,
        requestedKwh: requestedShift.toDecimalPlaces(6).toNumber(),
        actualKwh: 0,
        sourceIntervalCount: sourceIndexes.length,
        targetIntervalCount: targetIndexes.length,
      });
      continue;
    }

    removeEnergyProportionally(working, sourceIndexes, actualShift);
    const shiftedToTargets = addEnergyToTargets(
      working,
      targetIndexes,
      actualShift,
      {
        intervalHours,
        maxPostShiftPowerKw: rule.maxPostShiftPowerKw,
      },
    );

    if (shiftedToTargets.lt(actualShift)) {
      addEnergyToTargets(
        working,
        sourceIndexes,
        actualShift.minus(shiftedToTargets),
        { intervalHours },
      );
      warnings.push(
        `Rule ${rule.name} was capped by target interval capacity.`,
      );
    }

    rulesApplied.push({
      name: rule.name,
      requestedKwh: requestedShift.toDecimalPlaces(6).toNumber(),
      actualKwh: shiftedToTargets.toDecimalPlaces(6).toNumber(),
      sourceIntervalCount: sourceIndexes.length,
      targetIntervalCount: targetIndexes.length,
    });

    const targetEnergyAfter = sumIndexedEnergy(working, targetIndexes);
    if (targetEnergyAfter.lt(targetEnergyBefore)) {
      warnings.push(
        `Rule ${rule.name} did not increase target off-peak energy as expected.`,
      );
    }
  }

  restoreTotalEnergy(working, totalBefore, intervalMinutes);
  const totalAfter = sumEnergy(working);
  return {
    intervals: working,
    requestedShiftKwh: rulesApplied.reduce(
      (sum, rule) => sum + rule.requestedKwh,
      0,
    ),
    actualShiftKwh: rulesApplied.reduce((sum, rule) => sum + rule.actualKwh, 0),
    sourcePeakKwhBefore: summarizeLoadProfile(normalized, {
      tariffVersion: options.tariffVersion,
    }).peakPeriodKwh,
    sourcePeakKwhAfter: summarizeLoadProfile(working, {
      tariffVersion: options.tariffVersion,
    }).peakPeriodKwh,
    targetOffPeakKwhBefore: summarizeLoadProfile(normalized, {
      tariffVersion: options.tariffVersion,
    }).offPeakPeriodKwh,
    targetOffPeakKwhAfter: summarizeLoadProfile(working, {
      tariffVersion: options.tariffVersion,
    }).offPeakPeriodKwh,
    totalKwhBefore: totalBefore.toDecimalPlaces(6).toNumber(),
    totalKwhAfter: totalAfter.toDecimalPlaces(6).toNumber(),
    rulesApplied,
    warnings,
  };
}

export function analyzeTouBreakEven(input: {
  intervals: LoadIntervalInput[];
  normalTariff: TariffVersionConfig;
  touTariff: TariffVersionConfig;
  billDate?: string | undefined;
  monthlyScaleFactor?: number | undefined;
  meterSwitchingCostThb?: number | undefined;
}): TouBreakEvenAnalysis {
  const intervals = normalizeIntervals(input.intervals);
  const billDate =
    input.billDate ??
    getBangkokDate(intervals[0]?.timestamp ?? input.normalTariff.effectiveFrom);
  const monthlyScaleFactor =
    input.monthlyScaleFactor ?? inferMonthlyScaleFactor(intervals);
  const normalResult = calculateScenario({
    kind: "CURRENT_NORMAL",
    name: "Current Normal",
    intervals,
    normalTariff: input.normalTariff,
    touTariff: input.touTariff,
    billDate,
    monthlyScaleFactor,
    meterSwitchingCostThb: input.meterSwitchingCostThb ?? 0,
    baselineGrandTotal: null,
  });
  const currentTou = calculateScenario({
    kind: "CURRENT_TOU",
    name: "Current TOU",
    intervals,
    normalTariff: input.normalTariff,
    touTariff: input.touTariff,
    billDate,
    monthlyScaleFactor,
    meterSwitchingCostThb: input.meterSwitchingCostThb ?? 0,
    baselineGrandTotal: normalResult.grandTotal,
  });
  const totalKwh = new Decimal(currentTou.totalKwh);
  const currentOffPeakRatio = totalKwh.gt(0)
    ? new Decimal(currentTou.offPeakKwh).div(totalKwh).mul(100)
    : zero;

  if (currentTou.grandTotal <= normalResult.grandTotal) {
    const savings = new Decimal(normalResult.grandTotal).minus(
      currentTou.grandTotal,
    );
    return {
      currentOffPeakRatio: currentOffPeakRatio.toDecimalPlaces(2).toNumber(),
      requiredOffPeakRatio: currentOffPeakRatio.toDecimalPlaces(2).toNumber(),
      requiredShiftKwhPerMonth: 0,
      estimatedSavingsAfterShift: savings.toDecimalPlaces(2).toNumber(),
      paybackMonths: paybackMonths(input.meterSwitchingCostThb ?? 0, savings),
      explanation: `Current TOU is already lower by ${savings.toDecimalPlaces(2).toString()} THB/month.`,
    };
  }

  const currentPeakKwh = new Decimal(currentTou.peakKwh);
  const stepCount = 24;
  let bestShift = currentPeakKwh;
  let bestTou = currentTou;

  for (let step = 1; step <= stepCount; step += 1) {
    const requestedShiftPerMonth = currentPeakKwh.mul(step).div(stepCount);
    const loadShift = applyLoadShiftRules(intervals, {
      tariffVersion: input.touTariff,
      monthlyScaleFactor,
      rules: [
        {
          name: "Break-even scan",
          shiftKwhPerMonth: requestedShiftPerMonth.toNumber(),
        },
      ],
    });
    const candidate = calculateScenario({
      kind: "LOAD_SHIFT_TO_OFF_PEAK",
      name: "Break-even TOU",
      intervals,
      normalTariff: input.normalTariff,
      touTariff: input.touTariff,
      billDate,
      monthlyScaleFactor,
      meterSwitchingCostThb: input.meterSwitchingCostThb ?? 0,
      baselineGrandTotal: normalResult.grandTotal,
      loadShift,
    });
    if (candidate.grandTotal <= normalResult.grandTotal) {
      bestShift = requestedShiftPerMonth;
      bestTou = candidate;
      break;
    }
    bestTou = candidate;
  }

  const requiredOffPeakRatio = totalKwh.gt(0)
    ? new Decimal(bestTou.offPeakKwh).div(totalKwh).mul(100)
    : currentOffPeakRatio;
  const estimatedSavings = new Decimal(normalResult.grandTotal).minus(
    bestTou.grandTotal,
  );

  return {
    currentOffPeakRatio: currentOffPeakRatio.toDecimalPlaces(2).toNumber(),
    requiredOffPeakRatio: requiredOffPeakRatio.toDecimalPlaces(2).toNumber(),
    requiredShiftKwhPerMonth: bestShift.toDecimalPlaces(2).toNumber(),
    estimatedSavingsAfterShift: estimatedSavings.toDecimalPlaces(2).toNumber(),
    paybackMonths: paybackMonths(
      input.meterSwitchingCostThb ?? 0,
      estimatedSavings,
    ),
    explanation: `Current Off-Peak ratio is ${currentOffPeakRatio.toDecimalPlaces(2).toString()}%. TOU is estimated to break even around ${requiredOffPeakRatio.toDecimalPlaces(2).toString()}% Off-Peak.`,
  };
}

export function scoreScenarioDataQuality(input: {
  intervals?: LoadIntervalInput[] | undefined;
  billMonthCount?: number | undefined;
  source?: "interval" | "bill" | "appliance" | "demo" | undefined;
}): DataQualityResult {
  const intervals = input.intervals ? normalizeIntervals(input.intervals) : [];
  const billMonthCount = input.billMonthCount ?? 0;
  const intervalDays = countUniqueBangkokDates(intervals);
  const intervalCount = intervals.length;
  const detectedInterval = detectIntervalMinutes(intervals);
  const missingRatio = detectedInterval
    ? estimateMissingRatio(intervals, detectedInterval)
    : intervalCount > 0
      ? 0
      : 1;
  const dayTypes = intervals.reduce(
    (acc, interval) => {
      const dayOfWeek = getBangkokParts(interval.timestamp).dayOfWeek;
      if (dayOfWeek === 0 || dayOfWeek === 6) acc.hasWeekend = true;
      else acc.hasWeekday = true;
      return acc;
    },
    { hasWeekday: false, hasWeekend: false },
  );
  const reasons: string[] = [];
  const limitations: string[] = [];

  if (
    intervalDays >= 30 &&
    missingRatio <= 0.01 &&
    dayTypes.hasWeekday &&
    dayTypes.hasWeekend
  ) {
    reasons.push(
      "Interval load profile covers at least 30 days with low missing data.",
    );
    return {
      level: "HIGH",
      score: 90,
      reasons,
      limitations,
      metrics: {
        intervalDays,
        intervalCount,
        missingRatio,
        hasWeekday: dayTypes.hasWeekday,
        hasWeekend: dayTypes.hasWeekend,
        billMonthCount,
      },
    };
  }

  if (intervalDays >= 7 || billMonthCount >= 3) {
    reasons.push(
      intervalDays >= 7
        ? "Interval load profile covers at least 7 days."
        : "Multiple historical bills are available.",
    );
    if (intervalDays < 30)
      limitations.push(
        "Interval data is shorter than 30 days, so monthly behavior is estimated.",
      );
    if (missingRatio > 0.01)
      limitations.push(
        "Some missing or irregular intervals may affect scenario accuracy.",
      );
    return {
      level: "MEDIUM",
      score: 65,
      reasons,
      limitations,
      metrics: {
        intervalDays,
        intervalCount,
        missingRatio,
        hasWeekday: dayTypes.hasWeekday,
        hasWeekend: dayTypes.hasWeekend,
        billMonthCount,
      },
    };
  }

  reasons.push(
    input.source === "appliance"
      ? "Data comes from appliance estimates."
      : "Load profile is too short for a reliable comparison.",
  );
  limitations.push(
    "Use at least 30 days of interval data for a high-confidence recommendation.",
  );
  return {
    level: "LOW",
    score: 35,
    reasons,
    limitations,
    metrics: {
      intervalDays,
      intervalCount,
      missingRatio,
      hasWeekday: dayTypes.hasWeekday,
      hasWeekend: dayTypes.hasWeekend,
      billMonthCount,
    },
  };
}

export function validateLoadShiftRule(rule: LoadShiftRuleInput): string[] {
  const errors: string[] = [];
  for (const [field, value] of Object.entries({
    shiftKwhPerDay: rule.shiftKwhPerDay,
    shiftKwhPerMonth: rule.shiftKwhPerMonth,
    maxShiftKwh: rule.maxShiftKwh,
    maxPostShiftPowerKw: rule.maxPostShiftPowerKw,
  })) {
    if (value !== undefined && value < 0)
      errors.push(`${field} must be non-negative`);
  }
  if (
    rule.shiftPercentOfPeak !== undefined &&
    (rule.shiftPercentOfPeak < 0 || rule.shiftPercentOfPeak > 100)
  ) {
    errors.push("shiftPercentOfPeak must be between 0 and 100");
  }
  for (const [field, value] of Object.entries({
    sourceStartTime: rule.sourceStartTime,
    sourceEndTime: rule.sourceEndTime,
    targetStartTime: rule.targetStartTime,
    targetEndTime: rule.targetEndTime,
  })) {
    if (value !== undefined && !isValidTime(value))
      errors.push(`${field} is invalid`);
  }
  if (
    (rule.sourceStartTime && !rule.sourceEndTime) ||
    (!rule.sourceStartTime && rule.sourceEndTime)
  ) {
    errors.push("source time window must include start and end");
  }
  if (
    (rule.targetStartTime && !rule.targetEndTime) ||
    (!rule.targetStartTime && rule.targetEndTime)
  ) {
    errors.push("target time window must include start and end");
  }
  return errors;
}

export function createDemoScenarioInput(
  profile: "evening_home" | "night_home" | "daytime_shop" = "evening_home",
  options: { meterSwitchingCostThb?: number | undefined } = {},
): ScenarioEngineInput {
  return {
    intervals: createDemoLoadProfile(profile, 7),
    normalTariff: demoNormalTariff,
    touTariff: demoTouTariff,
    billDate: "2026-02-01",
    dataSource: "demo",
    meterSwitchingCostThb: options.meterSwitchingCostThb ?? 0,
    loadShiftRules: [
      {
        name: "Move evening controllable load",
        sourceStartTime: "18:00",
        sourceEndTime: "22:00",
        targetStartTime: "22:00",
        targetEndTime: "06:00",
        shiftPercentOfPeak: profile === "night_home" ? 10 : 25,
      },
    ],
  };
}

export function createDemoScenarioComparison(
  profile: "evening_home" | "night_home" | "daytime_shop" = "evening_home",
) {
  return runScenarioComparison(
    createDemoScenarioInput(profile, { meterSwitchingCostThb: 2500 }),
  );
}

function validateScenarioEngineInput(input: ScenarioEngineInput) {
  if (input.intervals.length === 0)
    throw new Error("Scenario requires a load profile.");
  if (input.normalTariff.meterMode !== "normal")
    throw new Error("normalTariff must use normal meter mode.");
  if (input.touTariff.meterMode !== "tou")
    throw new Error("touTariff must use TOU meter mode.");
  if (
    input.meterSwitchingCostThb !== undefined &&
    input.meterSwitchingCostThb < 0
  ) {
    throw new Error("Meter switching cost must be non-negative.");
  }
  input.loadShiftRules?.forEach((rule) => {
    const errors = validateLoadShiftRule(rule);
    if (errors.length > 0)
      throw new Error(
        `Invalid load shift rule ${rule.name}: ${errors.join(", ")}`,
      );
  });
  normalizeIntervals(input.intervals);
}

function buildRecommendations(input: {
  baseline: ScenarioResult;
  scenarios: ScenarioResult[];
  breakEven: TouBreakEvenAnalysis;
  dataQuality: DataQualityResult;
  loadSummary: ReturnType<typeof summarizeLoadProfile>;
}): ScenarioRecommendation[] {
  const recommendations: ScenarioRecommendation[] = [];
  const currentTou = input.scenarios.find(
    (scenario) => scenario.kind === "CURRENT_TOU",
  );
  const shiftedTou = input.scenarios.find(
    (scenario) => scenario.kind === "LOAD_SHIFT_TO_OFF_PEAK",
  );
  const best = input.scenarios.reduce(
    (candidate, scenario) =>
      scenario.grandTotal < candidate.grandTotal ? scenario : candidate,
    input.baseline,
  );

  if (input.dataQuality.level === "LOW") {
    recommendations.push({
      type: "insufficient_data",
      priority: 1,
      title: "ข้อมูลยังไม่พอสำหรับตัดสินใจแบบมั่นใจ",
      explanation: `Data quality score is ${input.dataQuality.score}/100 with ${input.dataQuality.metrics.intervalDays} interval days.`,
      supportingMetrics: {
        dataQualityScore: input.dataQuality.score,
        intervalDays: input.dataQuality.metrics.intervalDays,
      },
      confidence: "low",
      limitations: input.dataQuality.limitations,
      nextAction:
        "เพิ่ม Load Profile อย่างน้อย 30 วันก่อนตัดสินใจลงทุนหรือเปลี่ยนมิเตอร์",
    });
  }

  if (currentTou && currentTou.savingsMonthly > 0) {
    recommendations.push({
      type: "switch_tou",
      priority: 1,
      title: "เปลี่ยนเป็น TOU ได้ทันทีจากรูปแบบโหลดปัจจุบัน",
      explanation: `TOU is lower by ${formatMoney(currentTou.savingsMonthly)} THB/month and ${formatMoney(currentTou.savingsAnnual)} THB/year.`,
      supportingMetrics: {
        monthlySavingsThb: currentTou.savingsMonthly,
        annualSavingsThb: currentTou.savingsAnnual,
        offPeakRatioPercent: input.breakEven.currentOffPeakRatio,
      },
      confidence: input.dataQuality.level === "HIGH" ? "high" : "medium",
      limitations: input.dataQuality.limitations,
      nextAction: "ตรวจสอบเงื่อนไขการเปลี่ยนมิเตอร์ TOU กับหน่วยงานไฟฟ้า",
    });
  } else if (shiftedTou && shiftedTou.savingsMonthly > 0) {
    recommendations.push({
      type: "shift_then_tou",
      priority: 1,
      title: "TOU จะคุ้มเมื่อย้ายโหลดบางส่วนไป Off-Peak",
      explanation: `Shifted TOU saves ${formatMoney(shiftedTou.savingsMonthly)} THB/month after moving about ${input.breakEven.requiredShiftKwhPerMonth} kWh/month.`,
      supportingMetrics: {
        requiredShiftKwhPerMonth: input.breakEven.requiredShiftKwhPerMonth,
        shiftedMonthlySavingsThb: shiftedTou.savingsMonthly,
        requiredOffPeakRatioPercent: input.breakEven.requiredOffPeakRatio,
      },
      confidence: input.dataQuality.level === "LOW" ? "low" : "medium",
      limitations: input.dataQuality.limitations,
      nextAction:
        "เลือกโหลดที่เลื่อนเวลาได้ เช่น ซักผ้า ปั๊มน้ำ หรือชาร์จอุปกรณ์หลัง 22:00",
    });
  } else {
    recommendations.push({
      type: "stay_normal",
      priority: 1,
      title: "อยู่มิเตอร์ปกติยังเหมาะกว่าในข้อมูลชุดนี้",
      explanation: `Best scenario is ${best.name} with estimated bill ${formatMoney(best.grandTotal)} THB/month.`,
      supportingMetrics: {
        normalMonthlyBillThb: input.baseline.grandTotal,
        bestMonthlyBillThb: best.grandTotal,
        requiredShiftKwhPerMonth: input.breakEven.requiredShiftKwhPerMonth,
      },
      confidence: input.dataQuality.level === "HIGH" ? "high" : "medium",
      limitations: input.dataQuality.limitations,
      nextAction:
        "เก็บข้อมูลโหลดเพิ่มหรือทดสอบ load shifting ก่อนเปลี่ยนมิเตอร์",
    });
  }

  if (input.loadSummary.peakPeriodKwh > input.loadSummary.totalKwh * 0.45) {
    recommendations.push({
      type: "high_peak_load",
      priority: 2,
      title: "โหลดช่วง Peak สูง ควรหาอุปกรณ์ที่เลื่อนได้",
      explanation: `Peak energy is ${formatEnergy(input.loadSummary.peakPeriodKwh)} kWh/month from total ${formatEnergy(input.loadSummary.totalKwh)} kWh/month.`,
      supportingMetrics: {
        peakKwh: input.loadSummary.peakPeriodKwh,
        totalKwh: input.loadSummary.totalKwh,
      },
      confidence: "medium",
      limitations: input.dataQuality.limitations,
      nextAction: "ดูกราฟรายชั่วโมงเพื่อหาโหลดช่วง 09:00-22:00 ที่ควบคุมได้",
    });
  }

  if (input.loadSummary.daytimeKwh > input.loadSummary.totalKwh * 0.45) {
    recommendations.push({
      type: "future_solar_candidate",
      priority: 3,
      title: "โหลดกลางวันสูง เหมาะสำหรับประเมิน Solar เพิ่มเติม",
      explanation: `Daytime energy is ${formatEnergy(input.loadSummary.daytimeKwh)} kWh/month, but this phase does not calculate solar generation.`,
      supportingMetrics: {
        daytimeKwh: input.loadSummary.daytimeKwh,
        totalKwh: input.loadSummary.totalKwh,
      },
      confidence: "medium",
      limitations: [
        "ผลเปรียบเทียบนี้บอกความเหมาะสมเบื้องต้นเท่านั้น ยังไม่ใช่การจำลองขนาดระบบหรือผลประหยัดจาก Solar.",
      ],
      nextAction: "ไปที่การประเมิน Solar เพื่อดูขนาดระบบและผลจำลองจากข้อมูลนี้",
    });
  }

  if (input.loadSummary.nighttimeKwh > input.loadSummary.totalKwh * 0.5) {
    recommendations.push({
      type: "night_load_candidate",
      priority: 3,
      title: "โหลดกลางคืนสูง เป็นสัญญาณที่ดีสำหรับ TOU",
      explanation: `Nighttime energy is ${formatEnergy(input.loadSummary.nighttimeKwh)} kWh/month, which tends to align with Off-Peak periods.`,
      supportingMetrics: {
        nighttimeKwh: input.loadSummary.nighttimeKwh,
        offPeakKwh: input.loadSummary.offPeakPeriodKwh,
      },
      confidence: "medium",
      limitations: input.dataQuality.limitations,
      nextAction: "ตรวจสอบว่าพฤติกรรมนี้ต่อเนื่องอย่างน้อย 30 วัน",
    });
  }

  return recommendations.sort((a, b) => a.priority - b.priority);
}

function findShiftCandidateIndexes(
  intervals: LoadIntervalInput[],
  input: {
    tariffVersion: TariffVersionConfig;
    periodType: "peak" | "off_peak";
    startTime?: string | undefined;
    endTime?: string | undefined;
  },
) {
  return intervals.flatMap((interval, index) => {
    const isHoliday = input.tariffVersion.holidays.some(
      (holiday) =>
        getBangkokDate(holiday.date) === getBangkokDate(interval.timestamp),
    );
    const period = selectTouPeriod(
      input.tariffVersion.touPeriods,
      interval.timestamp,
      isHoliday,
    );
    const local = getBangkokParts(interval.timestamp);
    const timeMatches =
      input.startTime && input.endTime
        ? isMinuteInRange(local.minuteOfDay, input.startTime, input.endTime)
        : true;
    return period.periodType === input.periodType && timeMatches ? [index] : [];
  });
}

function resolveRequestedShiftKwh(
  rule: LoadShiftRuleInput,
  input: {
    sourcePeakKwh: Decimal;
    profileDayCount: number;
    monthlyScaleFactor: number;
  },
) {
  let requested = zero;
  if (rule.shiftKwhPerDay !== undefined)
    requested = requested.plus(
      new Decimal(rule.shiftKwhPerDay).mul(input.profileDayCount),
    );
  if (rule.shiftKwhPerMonth !== undefined)
    requested = requested.plus(
      new Decimal(rule.shiftKwhPerMonth).div(input.monthlyScaleFactor),
    );
  if (rule.shiftPercentOfPeak !== undefined)
    requested = requested.plus(
      input.sourcePeakKwh.mul(rule.shiftPercentOfPeak).div(100),
    );
  if (rule.maxShiftKwh !== undefined)
    requested = Decimal.min(requested, new Decimal(rule.maxShiftKwh));
  return requested;
}

function removeEnergyProportionally(
  intervals: LoadIntervalInput[],
  indexes: number[],
  amount: Decimal,
) {
  const sourceEnergy = sumIndexedEnergy(intervals, indexes);
  if (sourceEnergy.lte(0)) return;
  const intervalMinutes = detectIntervalMinutes(intervals) ?? 60;
  indexes.forEach((index) => {
    const interval = intervals[index];
    if (!interval) return;
    const originalEnergy = new Decimal(interval.energyKwh);
    const removal = amount.mul(originalEnergy).div(sourceEnergy);
    const nextEnergy = Decimal.max(zero, originalEnergy.minus(removal));
    updateIntervalEnergy(interval, nextEnergy, intervalMinutes);
  });
}

function addEnergyToTargets(
  intervals: LoadIntervalInput[],
  indexes: number[],
  amount: Decimal,
  options: { intervalHours: number; maxPostShiftPowerKw?: number | undefined },
) {
  if (indexes.length === 0 || amount.lte(0)) return zero;
  let remaining = amount;
  const addedByIndex = new Map<number, Decimal>();

  for (const index of indexes) {
    if (remaining.lte(0)) break;
    const interval = intervals[index];
    if (!interval) continue;
    const equalShare = remaining.div(indexes.length - addedByIndex.size);
    const capacity =
      options.maxPostShiftPowerKw === undefined
        ? equalShare
        : Decimal.max(
            zero,
            new Decimal(options.maxPostShiftPowerKw)
              .mul(options.intervalHours)
              .minus(interval.energyKwh),
          );
    const addition = Decimal.min(equalShare, capacity, remaining);
    if (addition.lte(0)) continue;
    addedByIndex.set(index, addition);
    remaining = remaining.minus(addition);
  }

  const intervalMinutes = detectIntervalMinutes(intervals) ?? 60;
  for (const [index, addition] of addedByIndex.entries()) {
    const interval = intervals[index];
    if (!interval) continue;
    updateIntervalEnergy(
      interval,
      new Decimal(interval.energyKwh).plus(addition),
      intervalMinutes,
    );
  }

  return amount.minus(remaining);
}

function updateIntervalEnergy(
  interval: LoadIntervalInput,
  energy: Decimal,
  intervalMinutes: number,
) {
  const energyNumber = energy.toDecimalPlaces(9).toNumber();
  interval.energyKwh = energyNumber;
  interval.powerKw = energy
    .div(intervalMinutes / 60)
    .toDecimalPlaces(9)
    .toNumber();
}

function restoreTotalEnergy(
  intervals: LoadIntervalInput[],
  expectedTotal: Decimal,
  intervalMinutes: number,
) {
  const delta = expectedTotal.minus(sumEnergy(intervals));
  if (delta.abs().lte(0.000000001)) return;
  const target = intervals.find((interval) =>
    new Decimal(interval.energyKwh).plus(delta).gte(0),
  );
  if (!target) return;
  updateIntervalEnergy(
    target,
    new Decimal(target.energyKwh).plus(delta),
    intervalMinutes,
  );
}

function normalizeIntervals(intervals: LoadIntervalInput[]) {
  return intervals
    .map((interval) => LoadIntervalSchema.parse(interval))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function scaleIntervalsForBilling(
  intervals: LoadIntervalInput[],
  monthlyScaleFactor: number,
): LoadIntervalInput[] {
  return intervals.map((interval) => {
    const energy = new Decimal(interval.energyKwh).mul(monthlyScaleFactor);
    return {
      ...interval,
      energyKwh: energy.toDecimalPlaces(6).toNumber(),
      ...(interval.powerKw === undefined ? {} : { powerKw: interval.powerKw }),
    };
  });
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

function estimateMissingRatio(
  intervals: LoadIntervalInput[],
  intervalMinutes: number,
) {
  if (intervals.length < 2) return 0;
  const first = new Date(intervals[0]?.timestamp ?? "").getTime();
  const last = new Date(intervals.at(-1)?.timestamp ?? "").getTime();
  if (!Number.isFinite(first) || !Number.isFinite(last) || last <= first)
    return 0;
  const expected = Math.floor((last - first) / (intervalMinutes * 60000)) + 1;
  return expected > 0 ? Math.max(0, expected - intervals.length) / expected : 0;
}

function sumEnergy(intervals: LoadIntervalInput[]) {
  return intervals.reduce(
    (sum, interval) => sum.plus(interval.energyKwh),
    zero,
  );
}

function sumIndexedEnergy(intervals: LoadIntervalInput[], indexes: number[]) {
  return indexes.reduce(
    (sum, index) => sum.plus(intervals[index]?.energyKwh ?? 0),
    zero,
  );
}

function countUniqueBangkokDates(intervals: LoadIntervalInput[]) {
  return new Set(
    intervals.map((interval) => getBangkokDate(interval.timestamp)),
  ).size;
}

function getBangkokDate(timestamp: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) return timestamp;
  return getBangkokParts(timestamp).date;
}

function daysInMonth(date: string) {
  const [year = "2026", month = "01"] = date.split("-");
  return new Date(Number(year), Number(month), 0).getDate();
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

function timeToMinute(time: string) {
  if (time === "24:00") return 24 * 60;
  const [hour = "0", minute = "0"] = time.split(":");
  return Number(hour) * 60 + Number(minute);
}

function isValidTime(time: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) || time === "24:00";
}

function defaultLoadShiftRule(): LoadShiftRuleInput {
  return {
    name: "Move 20% of peak load to off-peak",
    shiftPercentOfPeak: 20,
    sourceStartTime: "18:00",
    sourceEndTime: "22:00",
    targetStartTime: "22:00",
    targetEndTime: "06:00",
  };
}

function scenarioId(kind: ScenarioKind) {
  return kind.toLowerCase().replaceAll("_", "-");
}

function scenarioName(kind: ScenarioKind) {
  return {
    CURRENT_NORMAL: "Current Normal",
    CURRENT_TOU: "Current TOU",
    SWITCH_TO_TOU_NO_BEHAVIOR_CHANGE: "Switch to TOU - no behavior change",
    LOAD_SHIFT_TO_OFF_PEAK: "Load Shift to Off-Peak",
    CUSTOM_LOAD_SHIFT: "Custom Load Shift",
  }[kind];
}

function paybackMonths(cost: number, monthlySavings: Decimal) {
  return cost > 0 && monthlySavings.gt(0)
    ? new Decimal(cost).div(monthlySavings).toDecimalPlaces(2).toNumber()
    : null;
}

function toNumber(value: string | number) {
  return new Decimal(value).toNumber();
}

function nearlyEqual(a: number, b: number) {
  return Math.abs(a - b) < 0.000001;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function formatEnergy(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function createDemoLoadProfile(
  profile: "evening_home" | "night_home" | "daytime_shop",
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

function demoHourlyEnergy(
  profile: "evening_home" | "night_home" | "daytime_shop",
  hour: number,
) {
  if (profile === "evening_home") {
    if (hour >= 18 && hour < 22) return 2.4;
    if (hour >= 22 || hour < 6) return 0.45;
    return 0.85;
  }
  if (profile === "night_home") {
    if (hour >= 22 || hour < 6) return 1.8;
    if (hour >= 9 && hour < 22) return 0.55;
    return 0.75;
  }
  if (hour >= 9 && hour < 18) return 2.1;
  if (hour >= 18 && hour < 22) return 1.1;
  return 0.4;
}

export function createScenarioInputSnapshot(input: ScenarioEngineInput) {
  return {
    engineVersion: scenarioEngineVersion,
    loadProfileSnapshot: {
      intervalCount: input.intervals.length,
      totalKwh: sumEnergy(normalizeIntervals(input.intervals))
        .toDecimalPlaces(6)
        .toNumber(),
      detectedIntervalMinutes: detectIntervalMinutes(input.intervals),
    },
    tariffSnapshot: {
      normal: createTariffSnapshot(input.normalTariff),
      tou: createTariffSnapshot(input.touTariff),
    },
    assumptions: {
      billDate: input.billDate,
      meterSwitchingCostThb: input.meterSwitchingCostThb,
      monthlyScaleFactor: input.monthlyScaleFactor,
      scenarioKinds: input.scenarioKinds,
    },
  };
}
