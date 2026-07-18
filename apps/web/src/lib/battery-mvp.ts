import {
  batteryEvEngineVersion,
  createBatteryAnalysisInputFromCanonicalLoadProfile,
  generateApproxSolarProfile,
  runBatteryAnalysis,
  type BatteryAnalysisResult,
  type BatteryConfigInput,
  type BatteryDispatchStrategy,
  type FinancialAssumptions,
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
          financialAssumptions: buildFinancialAssumptions(config),
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
    degradationPercentPerYear: 2,
    cycleLife: 5_000,
    capexThb,
    oAndMCostPerYear: capexThb * 0.01,
    replacementCostThb: capexThb * 0.5,
    replacementYear: 10,
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
