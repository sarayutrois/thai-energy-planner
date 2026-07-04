import {
  createDemoScenarioInput,
  runScenarioComparison,
  type LoadShiftRuleInput,
  type ScenarioComparisonResult
} from "@thai-energy-planner/calculation-engine";

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
  loadShiftRule?: LoadShiftRuleInput
): ScenarioComparisonResult {
  const input = createDemoScenarioInput(profile, { meterSwitchingCostThb });
  if (loadShiftRule) input.loadShiftRules = [loadShiftRule];
  return runScenarioComparison(input);
}
