import {
  createDemoSolarInput,
  runSolarAnalysis,
  type DemoSolarProfileKey,
  type SolarAnalysisResult,
  type SolarAnalysisInput
} from "@thai-energy-planner/calculation-engine";

export type SolarSearchParams = Record<string, string | string[] | undefined>;

export type SolarDemoSettings = {
  profile: DemoSolarProfileKey;
  baseline: "normal" | "tou";
  systemSizeKwp: number;
  roofAreaSqm: number;
  province: string;
  capexThb: number;
  oAndMCostPerYear: number;
  projectLifeYears: number;
  discountRatePercent: number;
  exportEnabled: boolean;
  exportRateThbPerKwh: number;
  validationMessages: string[];
};

export const solarProfileOptions: Array<{ value: DemoSolarProfileKey; label: string; description: string }> = [
  {
    value: "evening_home",
    label: "บ้านใช้ไฟเย็นเยอะ",
    description: "โหลดกลางวันต่ำ ทำให้ self-consumption ต่ำกว่าแบบอื่น"
  },
  {
    value: "daytime_home",
    label: "บ้านมีโหลดกลางวัน",
    description: "ใช้ไฟกลางวันมากขึ้น จับคู่กับ Solar ได้ดีขึ้น"
  },
  {
    value: "daytime_shop",
    label: "ร้านค้าใช้ไฟกลางวัน",
    description: "โหลดกลางวันสูง เหมาะสำหรับทดสอบ self-consumption สูง"
  }
];

export function getSolarDemo(params: SolarSearchParams): {
  input: SolarAnalysisInput;
  analysis: SolarAnalysisResult;
  settings: SolarDemoSettings;
  queryString: string;
} {
  const validationMessages: string[] = [];
  const profile = normalizeSolarProfile(getSingleParam(params.profile));
  const systemSizeKwp = getNumberParam(params.systemSizeKwp, profile === "daytime_shop" ? 8 : 5, 0.1, "ขนาด Solar", validationMessages);
  const capexThb = getNumberParam(params.capexThb, systemSizeKwp * 42000, 0, "CAPEX", validationMessages);
  const exportEnabled = getBooleanParam(params.exportEnabled, true);
  const settings: SolarDemoSettings = {
    profile,
    baseline: normalizeBaseline(getSingleParam(params.baseline)),
    systemSizeKwp,
    roofAreaSqm: getNumberParam(params.roofAreaSqm, systemSizeKwp * 6, 0, "พื้นที่หลังคา", validationMessages),
    province: getSingleParam(params.province) ?? "Bangkok demo",
    capexThb,
    oAndMCostPerYear: getNumberParam(params.oAndMCostPerYear, capexThb * 0.01, 0, "O&M", validationMessages),
    projectLifeYears: getNumberParam(params.projectLifeYears, 20, 1, "อายุโครงการ", validationMessages),
    discountRatePercent: getNumberParam(params.discountRatePercent, 6, 0, "discount rate", validationMessages),
    exportEnabled,
    exportRateThbPerKwh: getNumberParam(params.exportRateThbPerKwh, 0.8, 0, "อัตรารับซื้อไฟ", validationMessages),
    validationMessages
  };
  const input = createDemoSolarInput(profile, {
    systemSizeKwp: settings.systemSizeKwp,
    capexThb: settings.capexThb,
    exportEnabled: settings.exportEnabled,
    exportRateThbPerKwh: settings.exportRateThbPerKwh,
    discountRatePercent: settings.discountRatePercent,
    projectLifeYears: settings.projectLifeYears
  });
  input.solarAssumptions = {
    ...input.solarAssumptions,
    province: settings.province,
    roofAreaSqm: settings.roofAreaSqm
  };
  input.financialAssumptions = {
    ...input.financialAssumptions,
    oAndMCostPerYear: settings.oAndMCostPerYear
  };

  return {
    input,
    analysis: runSolarAnalysis(input),
    settings,
    queryString: buildSolarQuery(settings)
  };
}

export function buildSolarQuery(settings: SolarDemoSettings) {
  const params = new URLSearchParams({
    profile: settings.profile,
    baseline: settings.baseline,
    systemSizeKwp: String(settings.systemSizeKwp),
    roofAreaSqm: String(settings.roofAreaSqm),
    province: settings.province,
    capexThb: String(settings.capexThb),
    oAndMCostPerYear: String(settings.oAndMCostPerYear),
    projectLifeYears: String(settings.projectLifeYears),
    discountRatePercent: String(settings.discountRatePercent),
    exportEnabled: String(settings.exportEnabled),
    exportRateThbPerKwh: String(settings.exportRateThbPerKwh)
  });
  return params.toString();
}

export function normalizeSolarProfile(value: string | undefined): DemoSolarProfileKey {
  return solarProfileOptions.some((option) => option.value === value) ? (value as DemoSolarProfileKey) : "evening_home";
}

function normalizeBaseline(value: string | undefined): "normal" | "tou" {
  return value === "tou" ? "tou" : "normal";
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getNumberParam(
  value: string | string[] | undefined,
  fallback: number,
  min: number,
  label: string,
  validationMessages: string[]
) {
  const raw = getSingleParam(value);
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed >= min) return parsed;
  validationMessages.push(`${label} ต้องมากกว่าหรือเท่ากับ ${min}; ระบบใช้ค่า demo แทน`);
  return fallback;
}

function getBooleanParam(value: string | string[] | undefined, fallback: boolean) {
  const normalized = getSingleParam(value);
  if (normalized === undefined) return fallback;
  return normalized === "true" || normalized === "on" || normalized === "1";
}
