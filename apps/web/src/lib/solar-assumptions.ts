import type { SolarModelDetailLevel } from "@thai-energy-planner/calculation-engine";

export type SolarSearchParams = Record<string, string | string[] | undefined>;
export type SolarUsageProfile =
  "evening_home" | "daytime_home" | "daytime_shop";

export type SavedBillSearchContext = {
  audience?: string | undefined;
  source?: "bills" | undefined;
};

export type SolarAssumptionSettings = {
  profile: SolarUsageProfile;
  baseline: "normal" | "tou";
  modelMode: SolarModelDetailLevel;
  systemSizeKwp: number;
  roofAreaSqm: number;
  roofAzimuth: number;
  roofTilt: number;
  province: string;
  latitude?: number | undefined;
  longitude?: number | undefined;
  systemLossPercent: number;
  shadingLossPercent: number;
  degradationPercentPerYear: number;
  capexThb: number;
  oAndMCostPerYear: number;
  projectLifeYears: number;
  discountRatePercent: number;
  electricityEscalationRatePercent: number;
  inverterReplacementCostThb: number;
  inverterReplacementYear: number;
  exportEnabled: boolean;
  exportRateThbPerKwh: number;
  exportLimitKw: number;
  validationMessages: string[];
  defaultedFields: string[];
};

export const solarProfileOptions: Array<{
  value: SolarUsageProfile;
  label: string;
  description: string;
}> = [
  {
    value: "evening_home",
    label: "บ้านที่ใช้ไฟช่วงเย็นมาก",
    description: "ใช้กำหนดค่าเริ่มต้นสำหรับบ้านที่โหลดกลางวันไม่สูง",
  },
  {
    value: "daytime_home",
    label: "บ้านที่ใช้ไฟกลางวัน",
    description: "ใช้กำหนดค่าเริ่มต้นสำหรับบ้านที่มีคนอยู่ช่วงกลางวัน",
  },
  {
    value: "daytime_shop",
    label: "ร้านค้าหรือธุรกิจกลางวัน",
    description: "ใช้กำหนดค่าเริ่มต้นสำหรับกิจการที่เปิดช่วงกลางวัน",
  },
];

const solarAssumptionParamNames = new Set([
  "profile",
  "baseline",
  "modelMode",
  "systemSizeKwp",
  "roofAreaSqm",
  "roofAzimuth",
  "roofTilt",
  "province",
  "latitude",
  "longitude",
  "systemLossPercent",
  "shadingLossPercent",
  "degradationPercentPerYear",
  "capexThb",
  "oAndMCostPerYear",
  "projectLifeYears",
  "discountRatePercent",
  "electricityEscalationRatePercent",
  "inverterReplacementCostThb",
  "inverterReplacementYear",
  "exportEnabled",
  "exportRateThbPerKwh",
  "exportLimitKw",
]);

export function hasExplicitSolarAssumptions(params: SolarSearchParams) {
  return Object.keys(params).some((key) => solarAssumptionParamNames.has(key));
}

export function getSolarAssumptionDraft(params: SolarSearchParams): {
  settings: SolarAssumptionSettings;
  queryString: string;
  savedBillContext: SavedBillSearchContext;
} {
  const validationMessages: string[] = [];
  const defaultedFields: string[] = [];
  const profile = normalizeSolarProfile(getSingleParam(params.profile));
  if (!getSingleParam(params.profile)) defaultedFields.push("profile");
  const systemSizeKwp = getNumberParam(
    params.systemSizeKwp,
    profile === "daytime_shop" ? 8 : 5,
    0.1,
    "ขนาดระบบ",
    validationMessages,
    defaultedFields,
    "systemSizeKwp",
  );
  const capexThb = getNumberParam(
    params.capexThb,
    systemSizeKwp * 42_000,
    0,
    "เงินลงทุน",
    validationMessages,
    defaultedFields,
    "capexThb",
  );
  const settings: SolarAssumptionSettings = {
    profile,
    baseline: normalizeBaseline(getSingleParam(params.baseline)),
    modelMode: normalizeModelMode(getSingleParam(params.modelMode)),
    systemSizeKwp,
    roofAreaSqm: getNumberParam(
      params.roofAreaSqm,
      systemSizeKwp * 6,
      0,
      "พื้นที่หลังคา",
      validationMessages,
      defaultedFields,
      "roofAreaSqm",
    ),
    roofAzimuth: getNumberParam(
      params.roofAzimuth,
      180,
      0,
      "ทิศหลังคา",
      validationMessages,
      defaultedFields,
      "roofAzimuth",
    ),
    roofTilt: getNumberParam(
      params.roofTilt,
      12,
      0,
      "ความเอียงหลังคา",
      validationMessages,
      defaultedFields,
      "roofTilt",
    ),
    province: getSingleParam(params.province) ?? "Bangkok",
    latitude: getOptionalNumberParam(
      params.latitude,
      -90,
      90,
      "Latitude",
      validationMessages,
    ),
    longitude: getOptionalNumberParam(
      params.longitude,
      -180,
      180,
      "Longitude",
      validationMessages,
    ),
    systemLossPercent: getNumberParam(
      params.systemLossPercent,
      12,
      0,
      "System loss",
      validationMessages,
      defaultedFields,
      "systemLossPercent",
    ),
    shadingLossPercent: getNumberParam(
      params.shadingLossPercent,
      profile === "evening_home" ? 8 : 4,
      0,
      "Shading loss",
      validationMessages,
      defaultedFields,
      "shadingLossPercent",
    ),
    degradationPercentPerYear: getNumberParam(
      params.degradationPercentPerYear,
      0.5,
      0,
      "Degradation",
      validationMessages,
      defaultedFields,
      "degradationPercentPerYear",
    ),
    capexThb,
    oAndMCostPerYear: getNumberParam(
      params.oAndMCostPerYear,
      capexThb * 0.01,
      0,
      "O&M",
      validationMessages,
      defaultedFields,
      "oAndMCostPerYear",
    ),
    projectLifeYears: getNumberParam(
      params.projectLifeYears,
      20,
      1,
      "อายุโครงการ",
      validationMessages,
      defaultedFields,
      "projectLifeYears",
    ),
    discountRatePercent: getNumberParam(
      params.discountRatePercent,
      6,
      0,
      "Discount rate",
      validationMessages,
      defaultedFields,
      "discountRatePercent",
    ),
    electricityEscalationRatePercent: getNumberParam(
      params.electricityEscalationRatePercent,
      2,
      0,
      "Electricity escalation",
      validationMessages,
      defaultedFields,
      "electricityEscalationRatePercent",
    ),
    inverterReplacementCostThb: getNumberParam(
      params.inverterReplacementCostThb,
      systemSizeKwp * 5_500,
      0,
      "ค่าเปลี่ยนอินเวอร์เตอร์",
      validationMessages,
      defaultedFields,
      "inverterReplacementCostThb",
    ),
    inverterReplacementYear: getNumberParam(
      params.inverterReplacementYear,
      10,
      0,
      "ปีที่เปลี่ยนอินเวอร์เตอร์",
      validationMessages,
      defaultedFields,
      "inverterReplacementYear",
    ),
    exportEnabled: getBooleanParam(params.exportEnabled, true),
    exportRateThbPerKwh: getNumberParam(
      params.exportRateThbPerKwh,
      0.8,
      0,
      "อัตรารับซื้อไฟฟ้า",
      validationMessages,
      defaultedFields,
      "exportRateThbPerKwh",
    ),
    exportLimitKw: getNumberParam(
      params.exportLimitKw,
      10,
      0,
      "กำลังส่งกลับสูงสุด",
      validationMessages,
      defaultedFields,
      "exportLimitKw",
    ),
    validationMessages,
    defaultedFields,
  };
  if (!getSingleParam(params.baseline)) defaultedFields.push("baseline");
  if (!getSingleParam(params.modelMode)) defaultedFields.push("modelMode");
  if (!getSingleParam(params.province)) defaultedFields.push("province");
  if (getSingleParam(params.exportEnabled) === undefined)
    defaultedFields.push("exportEnabled");

  return {
    settings,
    queryString: appendSavedBillContext(
      buildSolarAssumptionQuery(settings),
      params,
    ),
    savedBillContext: getSavedBillContext(params),
  };
}

export function buildSolarAssumptionQuery(settings: SolarAssumptionSettings) {
  const params = new URLSearchParams({
    profile: settings.profile,
    baseline: settings.baseline,
    modelMode: settings.modelMode,
    systemSizeKwp: String(settings.systemSizeKwp),
    roofAreaSqm: String(settings.roofAreaSqm),
    roofAzimuth: String(settings.roofAzimuth),
    roofTilt: String(settings.roofTilt),
    province: settings.province,
    systemLossPercent: String(settings.systemLossPercent),
    shadingLossPercent: String(settings.shadingLossPercent),
    degradationPercentPerYear: String(settings.degradationPercentPerYear),
    capexThb: String(settings.capexThb),
    oAndMCostPerYear: String(settings.oAndMCostPerYear),
    projectLifeYears: String(settings.projectLifeYears),
    discountRatePercent: String(settings.discountRatePercent),
    electricityEscalationRatePercent: String(
      settings.electricityEscalationRatePercent,
    ),
    inverterReplacementCostThb: String(settings.inverterReplacementCostThb),
    inverterReplacementYear: String(settings.inverterReplacementYear),
    exportEnabled: String(settings.exportEnabled),
    exportRateThbPerKwh: String(settings.exportRateThbPerKwh),
    exportLimitKw: String(settings.exportLimitKw),
  });
  if (settings.latitude !== undefined)
    params.set("latitude", String(settings.latitude));
  if (settings.longitude !== undefined)
    params.set("longitude", String(settings.longitude));
  return params.toString();
}

function normalizeSolarProfile(value: string | undefined): SolarUsageProfile {
  return solarProfileOptions.some((option) => option.value === value)
    ? (value as SolarUsageProfile)
    : "evening_home";
}

function normalizeBaseline(value: string | undefined): "normal" | "tou" {
  return value === "tou" ? "tou" : "normal";
}

function normalizeModelMode(value: string | undefined): SolarModelDetailLevel {
  if (value === "advanced" || value === "xhigh") return value;
  return "easy";
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function appendSavedBillContext(
  queryString: string,
  params: SolarSearchParams,
) {
  if (getSingleParam(params.source) !== "bills") return queryString;
  const nextParams = new URLSearchParams(queryString);
  nextParams.set("source", "bills");
  const audience = getSingleParam(params.audience);
  if (audience) nextParams.set("audience", audience);
  return nextParams.toString();
}

function getSavedBillContext(
  params: SolarSearchParams,
): SavedBillSearchContext {
  if (getSingleParam(params.source) !== "bills") return {};
  return {
    audience: getSingleParam(params.audience),
    source: "bills",
  };
}

function getNumberParam(
  value: string | string[] | undefined,
  fallback: number,
  min: number,
  label: string,
  validationMessages: string[],
  defaultedFields: string[],
  field: string,
) {
  const raw = getSingleParam(value);
  if (raw === undefined || raw === "") {
    defaultedFields.push(field);
    return fallback;
  }
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed >= min) return parsed;
  validationMessages.push(
    `${label} ต้องมากกว่าหรือเท่ากับ ${min} ระบบจึงกลับไปใช้ค่าเริ่มต้น`,
  );
  defaultedFields.push(field);
  return fallback;
}

function getOptionalNumberParam(
  value: string | string[] | undefined,
  min: number,
  max: number,
  label: string,
  validationMessages: string[],
) {
  const raw = getSingleParam(value);
  if (raw === undefined || raw === "") return undefined;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed >= min && parsed <= max) return parsed;
  validationMessages.push(
    `${label} ต้องอยู่ระหว่าง ${min} ถึง ${max} ระบบจะยังไม่ใช้ข้อมูลตามตำแหน่ง`,
  );
  return undefined;
}

function getBooleanParam(
  value: string | string[] | undefined,
  fallback: boolean,
) {
  const normalized = getSingleParam(value);
  if (normalized === undefined) return fallback;
  return normalized === "true" || normalized === "on" || normalized === "1";
}
