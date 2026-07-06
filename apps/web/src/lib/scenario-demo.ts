import {
  createDemoScenarioInput,
  runScenarioComparison,
  type LoadShiftRuleInput,
  type ScenarioComparisonResult
} from "@thai-energy-planner/calculation-engine";
import { getOfficialThaiTariffPair } from "@thai-energy-planner/tariff-engine";

export type ScenarioProfileKey = "evening_home" | "night_home" | "daytime_shop";

export const scenarioProfileOptions: Array<{
  value: ScenarioProfileKey;
  label: string;
  description: string;
}> = [
  {
    value: "evening_home",
    label: "บ้านใช้ไฟเย็นเยอะ",
    description: "Peak สูงและ Off-Peak ต่ำ เหมาะสำหรับดูความเสี่ยงของ TOU"
  },
  {
    value: "night_home",
    label: "บ้านมีโหลดกลางคืน",
    description: "Off-Peak สูงกว่า เหมาะสำหรับทดสอบโอกาสเปลี่ยนเป็น TOU"
  },
  {
    value: "daytime_shop",
    label: "ร้านค้าใช้ไฟกลางวัน",
    description: "โหลดกลางวันสูงและมีสัญญาณสำหรับ Phase 5 Solar analysis"
  }
];

export function normalizeScenarioProfile(value: string | undefined): ScenarioProfileKey {
  return scenarioProfileOptions.some((option) => option.value === value) ? (value as ScenarioProfileKey) : "evening_home";
}

export function getScenarioDemo(
  profile: ScenarioProfileKey,
  meterSwitchingCostThb: number,
  loadShiftRule?: LoadShiftRuleInput,
  context: { billMonthCount?: number | undefined; monthlyKwh?: number | undefined; source?: "bill" | "demo" | undefined } = {}
): ScenarioComparisonResult {
  const input = createDemoScenarioInput(profile, { meterSwitchingCostThb });
  const billDate = "2026-07-01";
  const customerSegment = profile === "daytime_shop" ? "small_business" : "residential";
  const demoProfileKwh = input.intervals.reduce((sum, interval) => sum + interval.energyKwh, 0);
  const monthlyEnergyKwh = context.monthlyKwh && context.monthlyKwh > 0 ? context.monthlyKwh : demoProfileKwh * (30 / 7);
  const tariffs = getOfficialThaiTariffPair({
    authority: "PEA",
    billDate,
    customerSegment,
    monthlyEnergyKwh,
    voltageLevel: "low_voltage"
  });

  input.billDate = billDate;
  input.normalTariff = tariffs.normalTariff;
  input.touTariff = tariffs.touTariff;
  input.dataSource = context.source ?? "demo";
  if (context.billMonthCount !== undefined) input.billMonthCount = context.billMonthCount;
  if (context.monthlyKwh && context.monthlyKwh > 0 && demoProfileKwh > 0) {
    input.monthlyScaleFactor = context.monthlyKwh / demoProfileKwh;
  }
  if (loadShiftRule) input.loadShiftRules = [loadShiftRule];
  return runScenarioComparison(input);
}
