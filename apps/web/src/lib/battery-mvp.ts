import {
  batteryEvEngineVersion,
  calculateFinancials,
  createBatteryAnalysisInputFromCanonicalLoadProfile,
  generateApproxSolarProfile,
  runBatteryAnalysis,
  type BatteryAnalysisResult,
  type BatteryConfigInput,
  type BatteryDispatchResult,
  type BatteryDispatchStrategy,
  type FinancialAssumptions,
  type FinancialResult,
  type SolarGenerationIntervalInput,
} from "@thai-energy-planner/calculation-engine";
import { getOfficialThaiTariffPair } from "@thai-energy-planner/tariff-engine";
import type {
  Authority,
  CanonicalLoadProfile,
  CustomerSegment,
} from "@thai-energy-planner/shared-types";

export type BatteryGoal = "bill_savings" | "backup" | "solar_storage";
export type BatteryVerdict = "recommend" | "consider" | "not_recommended";

export type BatteryMvpSettings = {
  goal: BatteryGoal;
  authority: Authority;
  customerSegment: Extract<CustomerSegment, "residential" | "small_business">;
  meterMode: "normal" | "tou";
  criticalLoadKw: number;
  backupHours: number;
  batteryCostPerKwhThb: number;
  solarSystemSizeKwp: number;
  useSolarForBackup: boolean;
  projectLifeYears: number;
  degradationPercentPerYear: number;
  discountRatePercent: number;
  electricityEscalationRatePercent: number;
  replacementYear: number;
  replacementCostPercent: number;
};

export type BatteryMvpDecision = {
  verdict: BatteryVerdict;
  verdictLabel: string;
  headline: string;
  strategy: BatteryDispatchStrategy;
  strategyLabel: string;
  capacityKwh: number;
  usableCapacityKwh: number;
  chargePowerKw: number;
  dischargePowerKw: number;
  estimatedBackupHours: number | null;
  budgetLowThb: number;
  budgetHighThb: number;
  billBeforeBatteryThb: number;
  billAfterBatteryThb: number;
  monthlySavingsThb: number;
  annualSavingsThb: number;
  simplePaybackYears: number | null;
  npvThb: number;
  peakDemandBeforeKw: number;
  peakDemandAfterKw: number;
  gridImportBeforeKwh: number;
  gridImportAfterKwh: number;
  confidence: "low" | "medium" | "high";
  confidenceLabel: string;
  sourceLabel: string;
  reasons: string[];
  limitations: string[];
  nextAction: string;
  engineVersion: string;
  tariffVersionIds: string[];
  calculatedAt: string;
  optimization: BatteryOptimizationResult;
  lifecycle: BatteryLifecycleResult;
  sensitivity: BatterySensitivityResult;
  operation: BatteryOperationResult;
  resilience: BatteryResilienceResult;
};

export type BatteryOperationHour = {
  hour: number;
  label: string;
  loadKw: number;
  solarKw: number;
  gridBeforeKw: number;
  gridAfterKw: number;
  chargeKw: number;
  dischargeKw: number;
  socPercent: number;
  periodType: "peak" | "off_peak" | "unknown";
};

export type BatteryOperationResult = {
  intervalMinutes: number;
  intervalCount: number;
  profileDayCount: number;
  totalChargedKwh: number;
  totalDischargedKwh: number;
  chargedFromSolarKwh: number;
  chargedFromGridKwh: number;
  equivalentCycles: number;
  minimumSocPercent: number;
  maximumSocPercent: number;
  peakChangeKw: number;
  chargingHours: string[];
  dischargingHours: string[];
  typicalDay: BatteryOperationHour[];
};

export type BatteryOutageScenario = {
  id: "overnight" | "midday" | "evening";
  label: string;
  startHour: number;
  startSocPercent: number;
  availableEnergyKwh: number;
  estimatedCoverageHours: number;
  powerSufficient: boolean;
  targetMet: boolean;
};

export type BatteryResilienceResult = {
  criticalLoadKw: number;
  targetHours: number;
  rating: "low" | "medium" | "high";
  ratingLabel: string;
  worstCoverageHours: number;
  bestCoverageHours: number;
  scenarios: BatteryOutageScenario[];
};

export type BatteryLifecycleYear = {
  year: number;
  remainingCapacityKwh: number;
  remainingCapacityPercent: number;
  netCashFlowThb: number;
  cumulativeDiscountedCashFlowThb: number;
  replacementCostThb: number;
  replacement: boolean;
};

export type BatteryLifecycleResult = {
  projectLifeYears: number;
  degradationPercentPerYear: number;
  replacementYear: number;
  replacementCostThb: number;
  endOfProjectCapacityKwh: number;
  endOfProjectCapacityPercent: number;
  years: BatteryLifecycleYear[];
};

export type BatterySensitivityCase = {
  id: "downside" | "base" | "upside";
  label: string;
  capexMultiplier: number;
  savingsMultiplier: number;
  degradationPercentPerYear: number;
  discountRatePercent: number;
  npvThb: number;
  simplePaybackYears: number | null;
  annualNetBenefitYear1: number;
};

export type BatterySensitivityResult = {
  cases: BatterySensitivityCase[];
  npvLowThb: number;
  npvHighThb: number;
  breakEvenCapexThb: number | null;
  staysViableInDownside: boolean;
};

export type BatteryCandidateComparison = {
  rank: number;
  capacityKwh: number;
  strategy: BatteryDispatchStrategy;
  strategyLabel: string;
  capexThb: number;
  annualSavingsThb: number;
  simplePaybackYears: number | null;
  npvThb: number;
  estimatedBackupHours: number | null;
  peakDemandAfterKw: number;
  gridImportAfterKwh: number;
  financiallyViable: boolean;
  selected: boolean;
};

export type BatteryOptimizationResult = {
  evaluatedCandidateCount: number;
  evaluatedCapacitiesKwh: number[];
  evaluatedStrategies: BatteryDispatchStrategy[];
  candidates: BatteryCandidateComparison[];
};

export type BatteryMvpInput = {
  profile: CanonicalLoadProfile;
  settings: BatteryMvpSettings;
  hasBills: boolean;
  hasCalibratedBills: boolean;
  isSample: boolean;
};

const candidateCapacitiesKwh = [2.5, 5, 10, 15, 20];
const defaultMonthlySpecificYieldKwhPerKwp = [
  112, 118, 126, 124, 118, 108, 104, 106, 110, 112, 108, 106,
];

export function defaultBatteryMvpSettings(): BatteryMvpSettings {
  return {
    goal: "bill_savings",
    authority: "PEA",
    customerSegment: "residential",
    meterMode: "normal",
    criticalLoadKw: 0.8,
    backupHours: 4,
    batteryCostPerKwhThb: 35_000,
    solarSystemSizeKwp: 5,
    useSolarForBackup: false,
    projectLifeYears: 15,
    degradationPercentPerYear: 2,
    discountRatePercent: 6,
    electricityEscalationRatePercent: 2,
    replacementYear: 10,
    replacementCostPercent: 50,
  };
}

export function evaluateBatteryMvp(input: BatteryMvpInput): BatteryMvpDecision {
  const { profile, settings } = input;
  validateBatteryMvpSettings(settings);
  const monthlyEnergyKwh = estimateMonthlyEnergy(profile);
  const billDate = profile.period.startInclusive.slice(0, 10);
  const tariffs = getOfficialThaiTariffPair({
    authority: settings.authority,
    customerSegment: settings.customerSegment,
    billDate,
    monthlyEnergyKwh,
    voltageLevel: "low_voltage",
  });
  const solarIntervals = buildSolarIntervals(profile, settings);
  const capacities =
    settings.goal === "backup"
      ? [
          selectBatteryCapacity(
            (settings.criticalLoadKw * settings.backupHours) / 0.8,
          ),
        ]
      : candidateCapacitiesKwh;
  const strategies = strategiesForGoal(settings.goal);
  const evaluations = capacities.flatMap((capacityKwh) =>
    strategies.map((strategy) => {
      const config = buildBatteryConfig(capacityKwh, settings, strategy);
      const analysis = runBatteryAnalysis(
        createBatteryAnalysisInputFromCanonicalLoadProfile({
          profile,
          solarIntervals,
          normalTariff: tariffs.normalTariff,
          touTariff: tariffs.touTariff,
          config,
          financialAssumptions: buildFinancialAssumptions(config, settings),
          meterMode:
            settings.goal === "bill_savings" ? "tou" : settings.meterMode,
        }),
      );
      return { config, analysis };
    }),
  );
  const ranked = rankEvaluations(evaluations, settings.goal);
  const selected = ranked[0]!;
  const strategy = selected.config.dispatchStrategy;
  const confidence = decisionConfidence(input);
  const financiallyViable =
    selected.analysis.financial.npvThb > 0 &&
    selected.analysis.financial.simplePaybackYears !== null &&
    selected.analysis.financial.simplePaybackYears <= 15;
  const verdict = resolveVerdict({
    goal: settings.goal,
    financiallyViable,
    confidence,
  });
  const monthlySavingsThb =
    selected.analysis.financial.annualBillSavingsThb / 12;
  const budgetLowThb = roundMoney(selected.config.capexThb * 0.9);
  const budgetHighThb = roundMoney(selected.config.capexThb * 1.15);
  const lifecycle = buildBatteryLifecycle({
    config: selected.config,
    financial: selected.analysis.financial.financialTrace,
  });
  const sensitivity = buildBatterySensitivity({
    config: selected.config,
    financial: selected.analysis.financial.financialTrace,
    annualBillSavingsThb: selected.analysis.financial.annualBillSavingsThb,
  });
  const operation = buildBatteryOperation({
    config: selected.config,
    dispatch: selected.analysis.dispatch,
  });
  const resilience = buildBatteryResilience({
    config: selected.config,
    operation,
    settings,
  });

  return {
    verdict,
    verdictLabel:
      verdict === "recommend"
        ? "ควรติด"
        : verdict === "consider"
          ? "ควรพิจารณา"
          : "ยังไม่แนะนำ",
    headline: decisionHeadline({
      goal: settings.goal,
      verdict,
      capacityKwh: selected.config.capacityKwh,
    }),
    strategy,
    strategyLabel: strategyLabel(strategy),
    capacityKwh: selected.config.capacityKwh,
    usableCapacityKwh: selected.config.usableCapacityKwh,
    chargePowerKw: selected.config.chargePowerKw,
    dischargePowerKw: selected.config.dischargePowerKw,
    estimatedBackupHours:
      settings.goal === "backup"
        ? selected.analysis.dispatch.estimatedBackupHours
        : null,
    budgetLowThb,
    budgetHighThb,
    billBeforeBatteryThb: selected.analysis.financial.billBeforeBatteryThb,
    billAfterBatteryThb: selected.analysis.financial.billAfterBatteryThb,
    monthlySavingsThb,
    annualSavingsThb: selected.analysis.financial.annualBillSavingsThb,
    simplePaybackYears: selected.analysis.financial.simplePaybackYears,
    npvThb: selected.analysis.financial.npvThb,
    peakDemandBeforeKw: selected.analysis.dispatch.peakDemandBeforeKw,
    peakDemandAfterKw: selected.analysis.dispatch.peakDemandAfterKw,
    gridImportBeforeKwh: selected.analysis.dispatch.gridImportBeforeKwh,
    gridImportAfterKwh: selected.analysis.dispatch.gridImportAfterKwh,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    sourceLabel: sourceLabel(settings),
    reasons: buildReasons({
      settings,
      config: selected.config,
      analysis: selected.analysis,
      verdict,
    }),
    limitations: buildLimitations(input),
    nextAction: nextActionFor({ goal: settings.goal, verdict }),
    engineVersion: batteryEvEngineVersion,
    tariffVersionIds: [
      selected.analysis.billBeforeBattery.tariffVersionId,
      selected.analysis.billAfterBattery.tariffVersionId,
    ],
    calculatedAt: new Date().toISOString(),
    optimization: {
      evaluatedCandidateCount: ranked.length,
      evaluatedCapacitiesKwh: [...new Set(capacities)],
      evaluatedStrategies: [...new Set(strategies)],
      candidates: ranked.map((candidate, index) =>
        summarizeCandidate(candidate, index, selected),
      ),
    },
    lifecycle,
    sensitivity,
    operation,
    resilience,
  };
}

export function validateBatteryMvpSettings(settings: BatteryMvpSettings) {
  const errors: string[] = [];
  if (
    !Number.isFinite(settings.batteryCostPerKwhThb) ||
    settings.batteryCostPerKwhThb <= 0
  )
    errors.push("ต้นทุน Battery ต้องมากกว่า 0 บาท/kWh");
  if (!Number.isFinite(settings.criticalLoadKw) || settings.criticalLoadKw <= 0)
    errors.push("โหลดจำเป็นต้องมากกว่า 0 kW");
  if (!Number.isFinite(settings.backupHours) || settings.backupHours <= 0)
    errors.push("ระยะเวลาสำรองต้องมากกว่า 0 ชั่วโมง");
  if (
    (settings.goal === "solar_storage" || settings.useSolarForBackup) &&
    (!Number.isFinite(settings.solarSystemSizeKwp) ||
      settings.solarSystemSizeKwp <= 0)
  )
    errors.push("ขนาด Solar ต้องมากกว่า 0 kWp");
  if (
    !Number.isInteger(settings.projectLifeYears) ||
    settings.projectLifeYears < 5 ||
    settings.projectLifeYears > 25
  )
    errors.push("อายุโครงการต้องเป็นจำนวนเต็มระหว่าง 5–25 ปี");
  if (
    !Number.isFinite(settings.degradationPercentPerYear) ||
    settings.degradationPercentPerYear < 0 ||
    settings.degradationPercentPerYear > 10
  )
    errors.push("อัตราเสื่อมต้องอยู่ระหว่าง 0–10% ต่อปี");
  if (
    !Number.isFinite(settings.discountRatePercent) ||
    settings.discountRatePercent < 0 ||
    settings.discountRatePercent > 20
  )
    errors.push("Discount rate ต้องอยู่ระหว่าง 0–20%");
  if (
    !Number.isFinite(settings.electricityEscalationRatePercent) ||
    settings.electricityEscalationRatePercent < 0 ||
    settings.electricityEscalationRatePercent > 10
  )
    errors.push("อัตราค่าไฟเพิ่มต้องอยู่ระหว่าง 0–10% ต่อปี");
  if (
    !Number.isInteger(settings.replacementYear) ||
    settings.replacementYear < 1 ||
    settings.replacementYear > settings.projectLifeYears
  )
    errors.push("ปีเปลี่ยน Battery ต้องอยู่ภายในอายุโครงการ");
  if (
    !Number.isFinite(settings.replacementCostPercent) ||
    settings.replacementCostPercent < 0 ||
    settings.replacementCostPercent > 100
  )
    errors.push("ค่าเปลี่ยน Battery ต้องอยู่ระหว่าง 0–100% ของ CAPEX");
  if (errors.length > 0) throw new Error(errors.join(" · "));
}

export function selectBatteryCapacity(requiredCapacityKwh: number) {
  const normalized = Math.max(2.5, requiredCapacityKwh);
  return (
    candidateCapacitiesKwh.find((capacity) => capacity >= normalized) ??
    Math.ceil(normalized / 5) * 5
  );
}

function buildBatteryConfig(
  capacityKwh: number,
  settings: BatteryMvpSettings,
  strategy: BatteryDispatchStrategy,
): BatteryConfigInput {
  const powerKw = capacityKwh <= 5 ? 2.5 : Math.min(10, capacityKwh / 2);
  const capexThb = roundMoney(capacityKwh * settings.batteryCostPerKwhThb);
  return {
    capacityKwh,
    usableCapacityKwh: capacityKwh * 0.9,
    initialSocPercent: settings.goal === "backup" ? 90 : 20,
    minSocPercent: 10,
    maxSocPercent: 95,
    chargePowerKw: powerKw,
    dischargePowerKw: powerKw,
    chargeEfficiency: 0.95,
    dischargeEfficiency: 0.95,
    roundTripEfficiency: 0.9025,
    degradationPercentPerYear: settings.degradationPercentPerYear,
    cycleLife: 5_000,
    capexThb,
    oAndMCostPerYear: capexThb * 0.01,
    replacementCostThb: capexThb * (settings.replacementCostPercent / 100),
    replacementYear: settings.replacementYear,
    backupReservePercent:
      strategy === "BACKUP_RESERVE" ? 80 : strategy === "HYBRID" ? 20 : 0,
    dispatchStrategy: strategy,
    peakShavingThresholdKw: Math.max(1, powerKw * 0.5),
    allowGridCharging:
      strategy === "TOU_ARBITRAGE" || strategy === "PEAK_SHAVING",
    criticalLoadKw: settings.criticalLoadKw,
    costSource: {
      status: "draft",
      sourceUrl: null,
      authority: "User input / Thai Energy Planner screening assumption",
      notes:
        "ต้นทุนต่อ kWh เป็นสมมติฐานที่ผู้ใช้แก้ไขได้และยังไม่ใช่ใบเสนอราคา",
    },
  };
}

function buildFinancialAssumptions(
  config: BatteryConfigInput,
  settings: BatteryMvpSettings,
): FinancialAssumptions {
  return {
    projectLifeYears: settings.projectLifeYears,
    discountRatePercent: settings.discountRatePercent,
    electricityEscalationRatePercent: settings.electricityEscalationRatePercent,
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

function buildBatteryLifecycle(input: {
  config: BatteryConfigInput;
  financial: FinancialResult;
}): BatteryLifecycleResult {
  const degradationRate = input.config.degradationPercentPerYear / 100;
  const replacementYear = input.config.replacementYear ?? 0;
  const years = input.financial.cashFlows.map((cashFlow) => {
    const batteryAge =
      replacementYear > 0 && cashFlow.year >= replacementYear
        ? cashFlow.year - replacementYear
        : cashFlow.year;
    const remainingCapacityPercent =
      Math.pow(1 - degradationRate, batteryAge) * 100;
    return {
      year: cashFlow.year,
      remainingCapacityKwh:
        input.config.capacityKwh * (remainingCapacityPercent / 100),
      remainingCapacityPercent,
      netCashFlowThb: cashFlow.netCashFlowThb,
      cumulativeDiscountedCashFlowThb: cashFlow.cumulativeDiscountedCashFlowThb,
      replacementCostThb: cashFlow.replacementCostThb,
      replacement: replacementYear > 0 && cashFlow.year === replacementYear,
    };
  });
  const finalYear = years.at(-1)!;
  return {
    projectLifeYears: input.financial.assumptionsSnapshot.projectLifeYears,
    degradationPercentPerYear: input.config.degradationPercentPerYear,
    replacementYear,
    replacementCostThb: input.config.replacementCostThb,
    endOfProjectCapacityKwh: finalYear.remainingCapacityKwh,
    endOfProjectCapacityPercent: finalYear.remainingCapacityPercent,
    years,
  };
}

function buildBatterySensitivity(input: {
  config: BatteryConfigInput;
  financial: FinancialResult;
  annualBillSavingsThb: number;
}): BatterySensitivityResult {
  const assumptions = input.financial.assumptionsSnapshot;
  const yearOneGenerationKwh = input.financial.cashFlows[1]?.generationKwh ?? 0;
  const definitions: Array<
    Pick<
      BatterySensitivityCase,
      | "id"
      | "label"
      | "capexMultiplier"
      | "savingsMultiplier"
      | "degradationPercentPerYear"
      | "discountRatePercent"
    >
  > = [
    {
      id: "downside",
      label: "กรณีระมัดระวัง",
      capexMultiplier: 1.2,
      savingsMultiplier: 0.85,
      degradationPercentPerYear: Math.min(
        10,
        input.config.degradationPercentPerYear + 1,
      ),
      discountRatePercent: Math.min(20, assumptions.discountRatePercent + 2),
    },
    {
      id: "base",
      label: "สมมติฐานปัจจุบัน",
      capexMultiplier: 1,
      savingsMultiplier: 1,
      degradationPercentPerYear: input.config.degradationPercentPerYear,
      discountRatePercent: assumptions.discountRatePercent,
    },
    {
      id: "upside",
      label: "กรณีเป็นผลดี",
      capexMultiplier: 0.9,
      savingsMultiplier: 1.1,
      degradationPercentPerYear: Math.max(
        0,
        input.config.degradationPercentPerYear - 0.5,
      ),
      discountRatePercent: Math.max(0, assumptions.discountRatePercent - 1),
    },
  ];
  const cases = definitions.map((definition) => {
    const capexThb = assumptions.capexThb * definition.capexMultiplier;
    const financial = calculateFinancials({
      annualBillSavingsThb:
        input.annualBillSavingsThb * definition.savingsMultiplier,
      annualExportRevenueThb: 0,
      annualGenerationKwh: yearOneGenerationKwh * definition.savingsMultiplier,
      assumptions: {
        ...assumptions,
        capexThb,
        discountRatePercent: definition.discountRatePercent,
        degradationRatePercent: definition.degradationPercentPerYear,
        oAndMCostPerYear:
          assumptions.oAndMCostPerYear * definition.capexMultiplier,
        inverterReplacementCostThb:
          assumptions.inverterReplacementCostThb * definition.capexMultiplier,
      },
    });
    return {
      ...definition,
      npvThb: financial.npvThb,
      simplePaybackYears: financial.simplePaybackYears,
      annualNetBenefitYear1: financial.annualNetBenefitYear1,
    };
  });
  const npvs = cases.map((item) => item.npvThb);
  const downside = cases.find((item) => item.id === "downside")!;
  const breakEvenCapex = assumptions.capexThb + input.financial.npvThb;
  return {
    cases,
    npvLowThb: Math.min(...npvs),
    npvHighThb: Math.max(...npvs),
    breakEvenCapexThb: breakEvenCapex >= 0 ? breakEvenCapex : null,
    staysViableInDownside:
      downside.npvThb > 0 && downside.simplePaybackYears !== null,
  };
}

function buildBatteryOperation(input: {
  config: BatteryConfigInput;
  dispatch: BatteryDispatchResult;
}): BatteryOperationResult {
  const intervalHours = input.dispatch.intervalMinutes / 60;
  const groups = new Map<
    number,
    {
      count: number;
      loadKwh: number;
      solarKwh: number;
      gridBeforeKwh: number;
      gridAfterKwh: number;
      chargeKwh: number;
      dischargeKwh: number;
      socKwh: number;
      periods: Record<"peak" | "off_peak" | "unknown", number>;
    }
  >();
  for (const interval of input.dispatch.intervals) {
    const hour = bangkokHour(interval.timestamp);
    const current = groups.get(hour) ?? {
      count: 0,
      loadKwh: 0,
      solarKwh: 0,
      gridBeforeKwh: 0,
      gridAfterKwh: 0,
      chargeKwh: 0,
      dischargeKwh: 0,
      socKwh: 0,
      periods: { peak: 0, off_peak: 0, unknown: 0 },
    };
    current.count += 1;
    current.loadKwh += interval.loadKwh;
    current.solarKwh += interval.solarKwh;
    current.gridBeforeKwh += interval.gridImportBeforeKwh;
    current.gridAfterKwh += interval.gridImportAfterKwh;
    current.chargeKwh += interval.chargeKwh;
    current.dischargeKwh += interval.dischargeKwh;
    current.socKwh += interval.socAfterKwh;
    current.periods[interval.periodType] += 1;
    groups.set(hour, current);
  }
  const typicalDay = Array.from({ length: 24 }, (_, hour) => {
    const group = groups.get(hour);
    const divisor = Math.max(1, (group?.count ?? 0) * intervalHours);
    const periodType = group
      ? (Object.entries(group.periods).sort((a, b) => b[1] - a[1])[0]?.[0] as
          "peak" | "off_peak" | "unknown")
      : "unknown";
    return {
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      loadKw: roundOperational((group?.loadKwh ?? 0) / divisor),
      solarKw: roundOperational((group?.solarKwh ?? 0) / divisor),
      gridBeforeKw: roundOperational((group?.gridBeforeKwh ?? 0) / divisor),
      gridAfterKw: roundOperational((group?.gridAfterKwh ?? 0) / divisor),
      chargeKw: roundOperational((group?.chargeKwh ?? 0) / divisor),
      dischargeKw: roundOperational((group?.dischargeKwh ?? 0) / divisor),
      socPercent: roundOperational(
        group && input.config.capacityKwh > 0
          ? (group.socKwh / group.count / input.config.capacityKwh) * 100
          : 0,
      ),
      periodType,
    };
  });
  const socValues = input.dispatch.intervals.map(
    (interval) => (interval.socAfterKwh / input.config.capacityKwh) * 100,
  );
  return {
    intervalMinutes: input.dispatch.intervalMinutes,
    intervalCount: input.dispatch.intervals.length,
    profileDayCount: roundOperational(
      (input.dispatch.intervals.length * intervalHours) / 24,
    ),
    totalChargedKwh: input.dispatch.totalChargedKwh,
    totalDischargedKwh: input.dispatch.totalDischargedKwh,
    chargedFromSolarKwh: input.dispatch.chargedFromSolarKwh,
    chargedFromGridKwh: input.dispatch.chargedFromGridKwh,
    equivalentCycles: roundOperational(
      input.config.usableCapacityKwh > 0
        ? input.dispatch.totalDischargedKwh / input.config.usableCapacityKwh
        : 0,
    ),
    minimumSocPercent: roundOperational(
      socValues.length > 0 ? Math.min(...socValues) : 0,
    ),
    maximumSocPercent: roundOperational(Math.max(...socValues, 0)),
    peakChangeKw: roundOperational(
      input.dispatch.peakDemandAfterKw - input.dispatch.peakDemandBeforeKw,
    ),
    chargingHours: typicalDay
      .filter((item) => item.chargeKw > 0.01)
      .map((item) => item.label),
    dischargingHours: typicalDay
      .filter((item) => item.dischargeKw > 0.01)
      .map((item) => item.label),
    typicalDay,
  };
}

function buildBatteryResilience(input: {
  config: BatteryConfigInput;
  operation: BatteryOperationResult;
  settings: BatteryMvpSettings;
}): BatteryResilienceResult {
  const definitions: Array<
    Pick<BatteryOutageScenario, "id" | "label" | "startHour">
  > = [
    { id: "overnight", label: "ไฟดับกลางคืน", startHour: 2 },
    { id: "midday", label: "ไฟดับกลางวัน", startHour: 12 },
    { id: "evening", label: "ไฟดับช่วงเย็น", startHour: 18 },
  ];
  const minimumSocKwh =
    input.config.capacityKwh * (input.config.minSocPercent / 100);
  const criticalLoadKw = input.settings.criticalLoadKw;
  const powerSufficient = input.config.dischargePowerKw >= criticalLoadKw;
  const scenarios = definitions.map((definition) => {
    const hour = input.operation.typicalDay[definition.startHour]!;
    const storedEnergyKwh = input.config.capacityKwh * (hour.socPercent / 100);
    const availableEnergyKwh = Math.max(
      0,
      (storedEnergyKwh - minimumSocKwh) * input.config.dischargeEfficiency,
    );
    const estimatedCoverageHours =
      powerSufficient && criticalLoadKw > 0
        ? availableEnergyKwh / criticalLoadKw
        : 0;
    return {
      ...definition,
      startSocPercent: hour.socPercent,
      availableEnergyKwh: roundOperational(availableEnergyKwh),
      estimatedCoverageHours: roundOperational(estimatedCoverageHours),
      powerSufficient,
      targetMet: estimatedCoverageHours >= input.settings.backupHours,
    };
  });
  const coverage = scenarios.map((scenario) => scenario.estimatedCoverageHours);
  const targetMetCount = scenarios.filter(
    (scenario) => scenario.targetMet,
  ).length;
  const rating =
    targetMetCount === scenarios.length
      ? "high"
      : targetMetCount > 0
        ? "medium"
        : "low";
  return {
    criticalLoadKw,
    targetHours: input.settings.backupHours,
    rating,
    ratingLabel:
      rating === "high"
        ? "พร้อมรับไฟดับตามเป้าหมาย"
        : rating === "medium"
          ? "พร้อมบางช่วงเวลา"
          : "พลังงานสำรองยังไม่ถึงเป้าหมาย",
    worstCoverageHours: Math.min(...coverage),
    bestCoverageHours: Math.max(...coverage),
    scenarios,
  };
}

const bangkokHourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  hour: "2-digit",
  hourCycle: "h23",
});

function bangkokHour(timestamp: string) {
  return Number(bangkokHourFormatter.format(new Date(timestamp))) % 24;
}

function roundOperational(value: number) {
  return Math.round(value * 1_000) / 1_000;
}

function buildSolarIntervals(
  profile: CanonicalLoadProfile,
  settings: BatteryMvpSettings,
): SolarGenerationIntervalInput[] {
  const shouldUseSolar =
    settings.goal === "solar_storage" ||
    (settings.goal === "backup" && settings.useSolarForBackup);
  if (!shouldUseSolar) return [];
  const periodDays = Math.max(
    1,
    Math.min(
      366,
      Math.ceil(
        (new Date(profile.period.endExclusive).getTime() -
          new Date(profile.period.startInclusive).getTime()) /
          86_400_000,
      ),
    ),
  );
  return generateApproxSolarProfile({
    startDate: profile.period.startInclusive.slice(0, 10),
    days: periodDays,
    profileName: "Solar screening profile for Battery",
    assumptions: {
      province: "Thailand screening",
      systemSizeKwp: settings.solarSystemSizeKwp,
      inverterSizeKw: settings.solarSystemSizeKwp,
      monthlySpecificYieldKwhPerKwp: defaultMonthlySpecificYieldKwhPerKwp,
      systemLossPercent: 12,
      shadingLossPercent: 6,
      degradationPercentPerYear: 0.5,
      intervalMinutes: profile.intervalMinutes,
      yieldSource: {
        status: "draft",
        sourceUrl: null,
        authority: "Thai Energy Planner screening assumption",
        notes:
          "ใช้รูปแบบผลผลิต Solar มาตรฐานเพื่อคัดกรอง Battery จนกว่าจะมีข้อมูลตำแหน่งและระบบจริง",
      },
    },
  }).intervals;
}

type BatteryEvaluation = {
  config: BatteryConfigInput;
  analysis: BatteryAnalysisResult;
};

function rankEvaluations(
  evaluations: Array<{
    config: BatteryConfigInput;
    analysis: BatteryAnalysisResult;
  }>,
  goal: BatteryGoal,
) {
  if (goal === "backup")
    return [...evaluations].sort(
      (a, b) =>
        (b.analysis.dispatch.estimatedBackupHours ?? 0) -
          (a.analysis.dispatch.estimatedBackupHours ?? 0) ||
        a.config.capexThb - b.config.capexThb,
    );
  return [...evaluations].sort((a, b) => {
    const viableDifference =
      Number(isFinanciallyViable(b)) - Number(isFinanciallyViable(a));
    if (viableDifference !== 0) return viableDifference;
    const npvDifference =
      b.analysis.financial.npvThb - a.analysis.financial.npvThb;
    if (Math.abs(npvDifference) > 0.01) return npvDifference;
    return a.config.capexThb - b.config.capexThb;
  });
}

function isFinanciallyViable(evaluation: BatteryEvaluation) {
  return (
    evaluation.analysis.financial.npvThb > 0 &&
    evaluation.analysis.financial.simplePaybackYears !== null &&
    evaluation.analysis.financial.simplePaybackYears <= 15
  );
}

function summarizeCandidate(
  evaluation: BatteryEvaluation,
  index: number,
  selected: BatteryEvaluation,
): BatteryCandidateComparison {
  return {
    rank: index + 1,
    capacityKwh: evaluation.config.capacityKwh,
    strategy: evaluation.config.dispatchStrategy,
    strategyLabel: strategyLabel(evaluation.config.dispatchStrategy),
    capexThb: evaluation.config.capexThb,
    annualSavingsThb: evaluation.analysis.financial.annualBillSavingsThb,
    simplePaybackYears: evaluation.analysis.financial.simplePaybackYears,
    npvThb: evaluation.analysis.financial.npvThb,
    estimatedBackupHours: evaluation.analysis.dispatch.estimatedBackupHours,
    peakDemandAfterKw: evaluation.analysis.dispatch.peakDemandAfterKw,
    gridImportAfterKwh: evaluation.analysis.dispatch.gridImportAfterKwh,
    financiallyViable: isFinanciallyViable(evaluation),
    selected: evaluation === selected,
  };
}

function resolveVerdict(input: {
  goal: BatteryGoal;
  financiallyViable: boolean;
  confidence: "low" | "medium" | "high";
}): BatteryVerdict {
  if (input.goal === "backup") return "consider";
  if (!input.financiallyViable) return "not_recommended";
  return input.confidence === "high" ? "recommend" : "consider";
}

function strategiesForGoal(goal: BatteryGoal): BatteryDispatchStrategy[] {
  if (goal === "backup") return ["BACKUP_RESERVE"];
  if (goal === "solar_storage") return ["SOLAR_SELF_CONSUMPTION", "HYBRID"];
  return ["TOU_ARBITRAGE", "PEAK_SHAVING"];
}

function strategyLabel(strategy: BatteryDispatchStrategy) {
  if (strategy === "BACKUP_RESERVE") return "Backup — กันพลังงานไว้เวลาไฟดับ";
  if (strategy === "HYBRID") return "Solar + Battery — เก็บไฟส่วนเกินไว้ใช้";
  if (strategy === "SOLAR_SELF_CONSUMPTION")
    return "Solar Self-consumption — เก็บไฟกลางวันไว้ใช้ภายหลัง";
  if (strategy === "PEAK_SHAVING") return "Peak Shaving — ลดกำลังไฟสูงสุด";
  return "TOU Arbitrage — ชาร์จ Off-Peak และใช้ช่วง Peak";
}

function sourceLabel(settings: BatteryMvpSettings) {
  if (settings.goal === "solar_storage") return "Solar ส่วนเกิน";
  if (settings.goal === "backup" && settings.useSolarForBackup)
    return "Solar และโครงข่ายไฟฟ้า";
  return "โครงข่ายไฟฟ้า";
}

function decisionHeadline(input: {
  goal: BatteryGoal;
  verdict: BatteryVerdict;
  capacityKwh: number;
}) {
  if (input.goal === "backup")
    return `ควรพิจารณา Battery ${formatNumber(input.capacityKwh)} kWh หากไฟสำรองมีความสำคัญ`;
  if (input.verdict === "recommend")
    return `ควรติด Battery ${formatNumber(input.capacityKwh)} kWh จากข้อมูลชุดนี้`;
  if (input.verdict === "consider")
    return `Battery ${formatNumber(input.capacityKwh)} kWh มีแนวโน้มเหมาะ แต่ควรยืนยันข้อมูลก่อนลงทุน`;
  return "ยังไม่ควรติด Battery เพื่อหวังผลประหยัดค่าไฟ";
}

function buildReasons(input: {
  settings: BatteryMvpSettings;
  config: BatteryConfigInput;
  analysis: BatteryAnalysisResult;
  verdict: BatteryVerdict;
}) {
  const reasons: string[] = [];
  if (input.settings.goal === "backup") {
    reasons.push(
      `ขนาด ${formatNumber(input.config.capacityKwh)} kWh รองรับโหลดจำเป็น ${formatNumber(input.settings.criticalLoadKw)} kW ได้ประมาณ ${formatNumber(input.analysis.dispatch.estimatedBackupHours ?? 0)} ชั่วโมงตามสมมติฐาน`,
    );
    reasons.push(
      "ระบบกันพลังงานสำรองไว้ 80% จึงไม่ได้ตั้งเป้าคายประจุเพื่อลดค่าไฟทุกวัน",
    );
  } else {
    if (input.settings.goal === "bill_savings") {
      reasons.push(
        input.config.dispatchStrategy === "PEAK_SHAVING"
          ? "กรณีลดค่าไฟนี้ชาร์จ Battery ช่วง Off-Peak แล้วคายประจุเฉพาะโหลดที่สูงกว่าเกณฑ์ Peak Shaving"
          : "กรณีลดค่าไฟจำลอง Battery บนมิเตอร์ TOU เพื่อใช้ส่วนต่างราคา Off-Peak และ Peak",
      );
    }
    reasons.push(
      `คาดว่าค่าไฟเปลี่ยนจาก ${formatMoney(input.analysis.financial.billBeforeBatteryThb)} เป็น ${formatMoney(input.analysis.financial.billAfterBatteryThb)} บาท/เดือน`,
    );
    reasons.push(
      input.verdict === "not_recommended"
        ? `ประหยัดได้ประมาณ ${formatMoney(input.analysis.financial.annualBillSavingsThb)} บาท/ปี แต่ NPV ยังอยู่ที่ ${formatMoney(input.analysis.financial.npvThb)} บาท`
        : `ขนาดนี้ให้ NPV ประมาณ ${formatMoney(input.analysis.financial.npvThb)} บาท และผ่านเกณฑ์อายุโครงการ 15 ปี`,
    );
  }
  reasons.push(
    `ระบบเปรียบเทียบขนาดและกลยุทธ์ที่เข้ากับเป้าหมาย แล้วจัดอันดับจากความคุ้มค่าและข้อกำหนดสำรองไฟ`,
  );
  return reasons;
}

function buildLimitations(input: BatteryMvpInput) {
  const limitations = [
    `ต้นทุน Battery ใช้สมมติฐาน ${formatMoney(input.settings.batteryCostPerKwhThb)} บาท/kWh และยังไม่ใช่ใบเสนอราคา`,
    "ต้องตรวจชนิด Inverter, ระบบไฟ 1/3 เฟส, วงจรโหลดจำเป็น, พื้นที่ติดตั้ง, การระบายอากาศ และเงื่อนไขรับประกันก่อนซื้อ",
  ];
  if (!input.hasCalibratedBills)
    limitations.push(
      "Load Profile ยังไม่ได้ปรับเทียบด้วยบิลอย่างน้อย 3 เดือน ผลประหยัดอาจเปลี่ยนเมื่อมีข้อมูลจริงเพิ่ม",
    );
  if (input.isSample)
    limitations.push("ข้อมูลชุดนี้เป็นข้อมูลตัวอย่าง ห้ามใช้ตัดสินใจลงทุนจริง");
  if (
    input.settings.goal === "solar_storage" ||
    (input.settings.goal === "backup" && input.settings.useSolarForBackup)
  )
    limitations.push(
      "ผล Solar ใช้รูปแบบแสงอาทิตย์มาตรฐานและยังไม่หักรายได้ที่อาจเสียไปจากการส่งไฟกลับ",
    );
  if (input.settings.goal === "backup")
    limitations.push(
      "ระยะคืนทุนไม่ได้รวมมูลค่าความเสียหายที่หลีกเลี่ยงได้จากไฟดับ จึงใช้ตัดสินใจด้านความต่อเนื่องของไฟมากกว่าผลตอบแทน",
    );
  if (input.settings.goal === "bill_savings")
    limitations.push(
      "การจำลองลดค่าไฟใช้มิเตอร์ TOU และยังไม่รวมค่าธรรมเนียมหรือค่าใช้จ่ายในการเปลี่ยนมิเตอร์",
    );
  return limitations;
}

function nextActionFor(input: { goal: BatteryGoal; verdict: BatteryVerdict }) {
  if (input.goal === "backup")
    return "ทำรายการอุปกรณ์จำเป็นและให้ผู้ติดตั้งตรวจโหลดกระชาก ก่อนขอราคา Battery และวงจรสำรอง";
  if (input.verdict === "not_recommended")
    return "ขอราคาจริงแล้วลองปรับต้นทุน หรือเริ่มจาก TOU / Solar โดยยังไม่เพิ่ม Battery";
  return "ใช้ขนาดนี้เป็นจุดเริ่มต้นขอใบเสนอราคา และยืนยันการรับประกันกับรูปแบบชาร์จ–คายประจุจริง";
}

function decisionConfidence(input: BatteryMvpInput) {
  if (input.isSample) return "low" as const;
  if (input.hasCalibratedBills && input.profile.quality.level === "measured")
    return "high" as const;
  if (input.hasBills || input.hasCalibratedBills) return "medium" as const;
  return "low" as const;
}

function confidenceLabel(value: "low" | "medium" | "high") {
  if (value === "high") return "ความมั่นใจสูง";
  if (value === "medium") return "ความมั่นใจปานกลาง";
  return "ความมั่นใจต่ำ";
}

function estimateMonthlyEnergy(profile: CanonicalLoadProfile) {
  const totalKwh = profile.intervals.reduce(
    (sum, interval) => sum + interval.energyKwh,
    0,
  );
  const durationDays = Math.max(
    1,
    (new Date(profile.period.endExclusive).getTime() -
      new Date(profile.period.startInclusive).getTime()) /
      86_400_000,
  );
  return (totalKwh / durationDays) * 30.4375;
}

function roundMoney(value: number) {
  return Math.round(value / 1_000) * 1_000;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 }).format(
    value,
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(
    value,
  );
}
