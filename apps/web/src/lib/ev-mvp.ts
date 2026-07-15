import {
  batteryEvEngineVersion,
  calculateEvDailyEnergyNeeded,
  createEvScenarioComparisonInputFromCanonicalLoadProfile,
  generateApproxSolarProfile,
  runEvScenarioComparison,
  type EvChargingStrategy,
  type EvConfigInput,
  type EvScenarioComparisonResult,
  type EvScenarioResult,
  type SolarGenerationIntervalInput,
} from "@thai-energy-planner/calculation-engine";
import { getOfficialThaiTariffPair } from "@thai-energy-planner/tariff-engine";
import type {
  Authority,
  CanonicalLoadProfile,
  CustomerSegment,
} from "@thai-energy-planner/shared-types";

export type EvMvpVerdict = "ready" | "consider" | "adjust";

export type EvMvpSettings = {
  authority: Authority;
  customerSegment: Extract<CustomerSegment, "residential" | "small_business">;
  currentMeterMode: "normal" | "tou";
  dailyDistanceKm: number;
  weeklyDrivingDays: number;
  vehicleBatteryKwh: number;
  efficiencyKmPerKwh: number;
  chargerPowerKw: number;
  arrivalTime: string;
  departureTime: string;
  outsideChargingCostPerKwh: number;
  hasSolar: boolean;
  solarSystemSizeKwp: number;
};

export type EvMvpAlternative = {
  meterMode: "normal" | "tou";
  meterLabel: string;
  strategy: EvChargingStrategy;
  strategyLabel: string;
  monthlyChargingCostThb: number;
  monthlyBillIncreaseThb: number;
  costPer100Km: number | null;
  peakDemandIncreaseKw: number;
  chargingComplete: boolean;
};

export type EvMvpDecision = {
  verdict: EvMvpVerdict;
  verdictLabel: string;
  headline: string;
  selectedMeterMode: "normal" | "tou";
  meterRecommendationLabel: string;
  strategy: EvChargingStrategy;
  strategyLabel: string;
  configuredChargerPowerKw: number;
  minimumChargerPowerKw: number;
  recommendedChargerPowerKw: number;
  chargerRecommendationLabel: string;
  dailyChargingHours: number;
  dailyEnergyNeededKwh: number;
  monthlyDistanceKm: number;
  monthlyEvEnergyKwh: number;
  monthlyChargingCostThb: number;
  annualChargingCostThb: number;
  monthlyBillIncreaseThb: number;
  billBeforeEvThb: number;
  billAfterEvThb: number;
  costPerKm: number | null;
  costPer100Km: number | null;
  peakDemandIncreaseKw: number;
  homeChargingSharePercent: number;
  solarChargingSharePercent: number;
  outsideChargingKwh: number;
  touSavingsVsNormalThb: number;
  chargingComplete: boolean;
  confidence: "low" | "medium" | "high";
  confidenceLabel: string;
  batteryGuidance: string;
  reasons: string[];
  limitations: string[];
  nextAction: string;
  alternatives: EvMvpAlternative[];
  engineVersion: string;
  tariffVersionIds: string[];
  calculatedAt: string;
};

export type EvMvpInput = {
  profile: CanonicalLoadProfile;
  settings: EvMvpSettings;
  hasBills: boolean;
  hasCalibratedBills: boolean;
  isSample: boolean;
};

const standardChargerPowersKw = [2.3, 3.7, 7.4, 11, 22];
const defaultMonthlySpecificYieldKwhPerKwp = [
  112, 118, 126, 124, 118, 108, 104, 106, 110, 112, 108, 106,
];

export function defaultEvMvpSettings(): EvMvpSettings {
  return {
    authority: "PEA",
    customerSegment: "residential",
    currentMeterMode: "normal",
    dailyDistanceKm: 50,
    weeklyDrivingDays: 5,
    vehicleBatteryKwh: 60,
    efficiencyKmPerKwh: 6,
    chargerPowerKw: 7.4,
    arrivalTime: "18:00",
    departureTime: "07:00",
    outsideChargingCostPerKwh: 8,
    hasSolar: false,
    solarSystemSizeKwp: 5,
  };
}

export function evaluateEvMvp(input: EvMvpInput): EvMvpDecision {
  const { profile, settings } = input;
  const monthlyEnergyKwh = estimateMonthlyEnergy(profile);
  const billDate = profile.period.startInclusive.slice(0, 10);
  const tariffs = getOfficialThaiTariffPair({
    authority: settings.authority,
    customerSegment: settings.customerSegment,
    billDate,
    monthlyEnergyKwh,
    voltageLevel: "low_voltage",
  });
  const config = buildEvConfig(settings);
  const solarIntervals = buildSolarIntervals(profile, settings);
  const comparisonInput = {
    profile,
    solarIntervals,
    normalTariff: tariffs.normalTariff,
    touTariff: tariffs.touTariff,
    config,
  };
  const normalComparison = runEvScenarioComparison(
    createEvScenarioComparisonInputFromCanonicalLoadProfile({
      ...comparisonInput,
      meterMode: "normal",
    }),
  );
  const touComparison = runEvScenarioComparison(
    createEvScenarioComparisonInputFromCanonicalLoadProfile({
      ...comparisonInput,
      meterMode: "tou",
    }),
  );
  const normalBest = selectBestScenario(normalComparison, settings.hasSolar);
  const touBest = selectBestScenario(touComparison, settings.hasSolar);
  const touSavingsVsNormalThb = Math.max(
    0,
    normalBest.chargingCostThb - touBest.chargingCostThb,
  );
  const touThresholdThb = Math.max(100, normalBest.chargingCostThb * 0.05);
  const shouldUseTou =
    settings.currentMeterMode === "tou" ||
    (touBest.chargingCompletionStatus === "complete" &&
      (normalBest.chargingCompletionStatus === "incomplete" ||
        touSavingsVsNormalThb >= touThresholdThb));
  const selected = shouldUseTou ? touBest : normalBest;
  const selectedMeterMode = shouldUseTou ? "tou" : "normal";
  const dailyEnergyNeededKwh = calculateEvDailyEnergyNeeded(config);
  const availableHours = chargingWindowHours(
    settings.arrivalTime,
    settings.departureTime,
  );
  const minimumChargerPowerKw = dailyEnergyNeededKwh / availableHours;
  const dailyChargingHours = dailyEnergyNeededKwh / settings.chargerPowerKw;
  const recommendedChargerPowerKw = selectStandardChargerPower(
    minimumChargerPowerKw,
  );
  const chargingComplete = selected.chargingCompletionStatus === "complete";
  const confidence = decisionConfidence(input);
  const verdict: EvMvpVerdict = !chargingComplete
    ? "adjust"
    : confidence === "low"
      ? "consider"
      : "ready";
  const monthlyDistanceKm =
    (settings.dailyDistanceKm * settings.weeklyDrivingDays * 52) / 12;
  const totalProfileEnergy = selected.profile.totalEvKwh;
  const profileScale =
    totalProfileEnergy > 0 ? selected.addedEvKwh / totalProfileEnergy : 0;
  const outsideChargingKwh = selected.profile.outsideChargingKwh * profileScale;
  const solarChargingKwh = selected.profile.solarSurplusUsedKwh * profileScale;
  const homeChargingKwh = selected.profile.homeChargingKwh * profileScale;
  const homeChargingSharePercent =
    selected.addedEvKwh > 0 ? (homeChargingKwh / selected.addedEvKwh) * 100 : 0;
  const solarChargingSharePercent =
    selected.addedEvKwh > 0
      ? (solarChargingKwh / selected.addedEvKwh) * 100
      : 0;
  const alternatives = [
    toAlternative("normal", normalBest),
    toAlternative("tou", touBest),
  ];

  return {
    verdict,
    verdictLabel:
      verdict === "ready"
        ? "พร้อมชาร์จที่บ้าน"
        : verdict === "consider"
          ? "ใช้เป็นกรอบเบื้องต้น"
          : "ควรปรับแผนก่อน",
    headline: decisionHeadline({ verdict, selectedMeterMode, selected }),
    selectedMeterMode,
    meterRecommendationLabel: meterRecommendation({
      currentMeterMode: settings.currentMeterMode,
      selectedMeterMode,
      touSavingsVsNormalThb,
    }),
    strategy: selected.strategy,
    strategyLabel: strategyLabel(selected.strategy),
    configuredChargerPowerKw: settings.chargerPowerKw,
    minimumChargerPowerKw,
    recommendedChargerPowerKw,
    chargerRecommendationLabel:
      settings.chargerPowerKw + 0.001 >= minimumChargerPowerKw
        ? `${formatNumber(settings.chargerPowerKw)} kW เพียงพอ · ใช้ประมาณ ${formatNumber(dailyChargingHours)} ชั่วโมง/วันที่ขับ`
        : `ควรอย่างน้อย ${formatNumber(recommendedChargerPowerKw)} kW หรือเพิ่มเวลาจอด · ขนาดที่กรอกใช้ ${formatNumber(dailyChargingHours)} ชั่วโมง/วันที่ขับ`,
    dailyChargingHours,
    dailyEnergyNeededKwh,
    monthlyDistanceKm,
    monthlyEvEnergyKwh: selected.addedEvKwh,
    monthlyChargingCostThb: selected.chargingCostThb,
    annualChargingCostThb: selected.chargingCostThb * 12,
    monthlyBillIncreaseThb: selected.monthlyBillIncreaseThb,
    billBeforeEvThb: Number(selected.billBeforeEv.grandTotal),
    billAfterEvThb: Number(selected.billAfterEv.grandTotal),
    costPerKm: selected.averageCostPerKm,
    costPer100Km: selected.costPer100Km,
    peakDemandIncreaseKw: selected.peakDemandIncreaseKw,
    homeChargingSharePercent,
    solarChargingSharePercent,
    outsideChargingKwh,
    touSavingsVsNormalThb,
    chargingComplete,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    batteryGuidance: batteryGuidance(settings, selected),
    reasons: buildReasons({
      settings,
      selected,
      selectedMeterMode,
      dailyEnergyNeededKwh,
      touSavingsVsNormalThb,
      solarChargingSharePercent,
    }),
    limitations: buildLimitations(input),
    nextAction: nextActionFor({ verdict, selectedMeterMode }),
    alternatives,
    engineVersion: batteryEvEngineVersion,
    tariffVersionIds: Array.from(
      new Set([
        normalBest.billBeforeEv.tariffVersionId,
        normalBest.billAfterEv.tariffVersionId,
        touBest.billBeforeEv.tariffVersionId,
        touBest.billAfterEv.tariffVersionId,
      ]),
    ),
    calculatedAt: new Date().toISOString(),
  };
}

export function selectStandardChargerPower(requiredPowerKw: number) {
  const normalized = Math.max(0, requiredPowerKw);
  return (
    standardChargerPowersKw.find((power) => power >= normalized) ??
    Math.ceil(normalized)
  );
}

function buildEvConfig(settings: EvMvpSettings): EvConfigInput {
  return {
    vehicleName: "User EV screening",
    batteryCapacityKwh: settings.vehicleBatteryKwh,
    efficiencyKmPerKwh: settings.efficiencyKmPerKwh,
    dailyDistanceKm: settings.dailyDistanceKm,
    weeklyDrivingDays: settings.weeklyDrivingDays,
    chargerPowerKw: settings.chargerPowerKw,
    chargerEfficiency: 0.9,
    arrivalTime: settings.arrivalTime,
    departureTime: settings.departureTime,
    targetSocPercent: 80,
    initialSocPercent: 30,
    minSocPercent: 20,
    chargingDays: chargingDays(settings.weeklyDrivingDays),
    outsideChargingCostPerKwh: settings.outsideChargingCostPerKwh,
    allowSolarCharging: settings.hasSolar,
    allowOffPeakCharging: true,
    allowSmartCharging: true,
    chargingStrategy: "SMART",
    costSource: {
      status: "draft",
      sourceUrl: null,
      authority: "User input / Thai Energy Planner screening assumption",
      notes:
        "Vehicle, charger and public charging inputs are editable screening assumptions.",
    },
  };
}

function buildSolarIntervals(
  profile: CanonicalLoadProfile,
  settings: EvMvpSettings,
): SolarGenerationIntervalInput[] {
  if (!settings.hasSolar) return [];
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
    profileName: "Solar screening profile for EV",
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
          "Uses a standard Solar shape until location and actual system data are available.",
      },
    },
  }).intervals;
}

function selectBestScenario(
  comparison: EvScenarioComparisonResult,
  hasSolar: boolean,
) {
  const eligible = comparison.scenarios.filter(
    (scenario) => hasSolar || scenario.strategy !== "SOLAR_SURPLUS",
  );
  const complete = eligible.filter(
    (scenario) => scenario.chargingCompletionStatus === "complete",
  );
  const pool = complete.length > 0 ? complete : eligible;
  return [...pool].sort(compareScenarios)[0]!;
}

function compareScenarios(a: EvScenarioResult, b: EvScenarioResult) {
  return (
    a.chargingCostThb - b.chargingCostThb ||
    a.peakDemandIncreaseKw - b.peakDemandIncreaseKw ||
    strategyPriority(a.strategy) - strategyPriority(b.strategy)
  );
}

function strategyPriority(strategy: EvChargingStrategy) {
  if (strategy === "SMART") return 0;
  if (strategy === "OFF_PEAK") return 1;
  if (strategy === "SOLAR_SURPLUS") return 2;
  return 3;
}

function toAlternative(
  meterMode: "normal" | "tou",
  scenario: EvScenarioResult,
): EvMvpAlternative {
  return {
    meterMode,
    meterLabel: meterMode === "tou" ? "มิเตอร์ TOU" : "มิเตอร์ปกติ",
    strategy: scenario.strategy,
    strategyLabel: strategyLabel(scenario.strategy),
    monthlyChargingCostThb: scenario.chargingCostThb,
    monthlyBillIncreaseThb: scenario.monthlyBillIncreaseThb,
    costPer100Km: scenario.costPer100Km,
    peakDemandIncreaseKw: scenario.peakDemandIncreaseKw,
    chargingComplete: scenario.chargingCompletionStatus === "complete",
  };
}

function decisionHeadline(input: {
  verdict: EvMvpVerdict;
  selectedMeterMode: "normal" | "tou";
  selected: EvScenarioResult;
}) {
  if (input.verdict === "adjust")
    return "แผนชาร์จ EV ยังไม่ครบตามระยะทาง ควรเพิ่มเวลาจอดหรือกำลังชาร์จ";
  const meter = input.selectedMeterMode === "tou" ? "TOU" : "มิเตอร์ปกติ";
  return `บ้านนี้รองรับแผนชาร์จ EV ได้ โดยใช้ ${meter} และ${strategyLabel(input.selected.strategy)}`;
}

function meterRecommendation(input: {
  currentMeterMode: "normal" | "tou";
  selectedMeterMode: "normal" | "tou";
  touSavingsVsNormalThb: number;
}) {
  if (input.selectedMeterMode === "tou") {
    if (input.currentMeterMode === "tou")
      return "ใช้ TOU ต่อและตั้งเวลาชาร์จตามคำแนะนำ";
    return `ควรพิจารณา TOU — ลดต้นทุนชาร์จได้ประมาณ ${formatMoney(input.touSavingsVsNormalThb)} บาท/เดือน`;
  }
  return input.currentMeterMode === "normal"
    ? "ยังไม่จำเป็นต้องเปลี่ยนเป็น TOU จากการใช้ EV เพียงอย่างเดียว"
    : "คง TOU เดิมไว้ แต่ผลประหยัดจาก EV ยังไม่เด่นชัด";
}

function strategyLabel(strategy: EvChargingStrategy) {
  if (strategy === "OFF_PEAK") return "ชาร์จช่วง Off-Peak";
  if (strategy === "SOLAR_SURPLUS") return "ชาร์จจาก Solar ส่วนเกิน";
  if (strategy === "SMART") return "ชาร์จแบบ Smart Scheduling";
  return "ชาร์จทันทีเมื่อถึงบ้าน";
}

function batteryGuidance(settings: EvMvpSettings, selected: EvScenarioResult) {
  if (settings.hasSolar && selected.profile.solarSurplusUsedKwh > 0)
    return "ยังไม่ควรเพิ่ม Battery เพียงเพื่อชาร์จ EV — ให้ตั้งเวลาชาร์จตรงกับ Solar ส่วนเกินก่อน เพราะลดการสูญเสียจากการชาร์จผ่าน Battery อีกทอด";
  return "ไม่จำเป็นต้องมี Battery เพื่อเริ่มใช้ EV — ให้จัดวงจรชาร์จและตั้งเวลาก่อน ส่วน Battery ควรพิจารณาแยกเมื่อมีเป้าหมายไฟสำรองหรือเก็บ Solar ส่วนเกิน";
}

function buildReasons(input: {
  settings: EvMvpSettings;
  selected: EvScenarioResult;
  selectedMeterMode: "normal" | "tou";
  dailyEnergyNeededKwh: number;
  touSavingsVsNormalThb: number;
  solarChargingSharePercent: number;
}) {
  const reasons = [
    `ระยะทางที่กรอกต้องใช้ไฟประมาณ ${formatNumber(input.dailyEnergyNeededKwh)} kWh ในวันที่ขับรถ`,
    `${strategyLabel(input.selected.strategy)} ทำให้ต้นทุนชาร์จรวมประมาณ ${formatMoney(input.selected.chargingCostThb)} บาท/เดือน`,
  ];
  if (input.selectedMeterMode === "tou")
    reasons.push(
      `TOU ลดต้นทุนชาร์จได้ประมาณ ${formatMoney(input.touSavingsVsNormalThb)} บาท/เดือนเมื่อเทียบแผนที่ดีที่สุดบนมิเตอร์ปกติ`,
    );
  if (input.settings.hasSolar)
    reasons.push(
      input.solarChargingSharePercent > 0
        ? `Solar ส่วนเกินรองรับไฟชาร์จได้ประมาณ ${formatNumber(input.solarChargingSharePercent)}% ในช่วงที่รถจอดบ้าน`
        : "เวลาจอดรถที่กรอกยังไม่ตรงกับช่วง Solar จึงไม่ควรนับผลประหยัดจาก Solar",
    );
  return reasons;
}

function buildLimitations(input: EvMvpInput) {
  const limitations = [
    "ผลนี้ประเมินแผนชาร์จและผลต่อค่าไฟบ้าน ไม่ใช่การตัดสินความคุ้มค่าซื้อ EV เทียบรถน้ำมัน เพราะยังไม่มีราคารถ ค่าน้ำมัน ค่าบำรุงรักษา และมูลค่าขายต่อ",
    `ค่าชาร์จนอกบ้านใช้สมมติฐาน ${formatMoney(input.settings.outsideChargingCostPerKwh)} บาท/kWh และควรแก้ให้ตรงกับสถานีที่ใช้จริง`,
    "ต้องให้ช่างตรวจขนาดมิเตอร์ สายเมน เบรกเกอร์ ระบบสายดิน ตำแหน่งติดตั้ง และโหลดพร้อมกันก่อนติดตั้งเครื่องชาร์จ",
    "การกระจายวันขับรถใช้วันจันทร์เป็นวันแรกตามจำนวนวันที่กรอก หากตารางเดินทางต่างกันควรใช้เป็นผลคัดกรองเบื้องต้น",
  ];
  if (
    input.settings.currentMeterMode === "normal" &&
    input.settings.dailyDistanceKm > 0
  )
    limitations.push(
      "ผล TOU ยังไม่รวมค่าธรรมเนียม ค่าเปลี่ยนมิเตอร์ หรือเงื่อนไขการไฟฟ้า",
    );
  if (!input.hasCalibratedBills)
    limitations.push(
      "Load Profile ยังไม่ได้ปรับเทียบด้วยบิลอย่างน้อย 3 เดือน ผลค่าไฟและ Peak อาจเปลี่ยนเมื่อมีข้อมูลจริงเพิ่ม",
    );
  if (input.isSample)
    limitations.push("ข้อมูลชุดนี้เป็นข้อมูลตัวอย่าง ห้ามใช้ตัดสินใจลงทุนจริง");
  if (input.settings.hasSolar)
    limitations.push(
      "ผล Solar ใช้รูปแบบแสงอาทิตย์มาตรฐาน และยังไม่คิดรายได้ที่อาจเสียไปจากการส่งไฟกลับ",
    );
  return limitations;
}

function nextActionFor(input: {
  verdict: EvMvpVerdict;
  selectedMeterMode: "normal" | "tou";
}) {
  if (input.verdict === "adjust")
    return "ลองเพิ่มกำลังเครื่องชาร์จหรือขยายช่วงเวลาจอด แล้วคำนวณใหม่ก่อนขอใบเสนอราคา";
  return input.selectedMeterMode === "tou"
    ? "ให้ช่างตรวจระบบไฟและสอบถามค่าเปลี่ยน TOU จากการไฟฟ้า ก่อนตั้งเวลาชาร์จช่วง Off-Peak"
    : "ให้ช่างตรวจระบบไฟและขอราคาเครื่องชาร์จตามกำลังที่แนะนำ โดยตั้งเวลาเลี่ยงช่วงโหลดบ้านสูง";
}

function chargingDays(weeklyDrivingDays: number) {
  const orderedDays = [1, 2, 3, 4, 5, 6, 0];
  return orderedDays.slice(0, Math.max(0, Math.min(7, weeklyDrivingDays)));
}

function chargingWindowHours(arrivalTime: string, departureTime: string) {
  const start = timeToMinutes(arrivalTime);
  const end = timeToMinutes(departureTime);
  if (start === end) return 24;
  return ((end - start + 24 * 60) % (24 * 60)) / 60;
}

function timeToMinutes(value: string) {
  const [hour = "0", minute = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

function decisionConfidence(input: EvMvpInput) {
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(
    value,
  );
}
