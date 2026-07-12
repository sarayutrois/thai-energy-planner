import {
  createDemoSolarInput,
  type DemoSolarProfileKey,
  type SolarAnalysisInput,
  type SolarAnalysisResult,
  type SolarModelDetailLevel
} from "@thai-energy-planner/calculation-engine";
import { runSolarAnalyzeApiCalculation, solarAnalyzeRequestSchema } from "@/lib/calculation-api";

export type SolarSearchParams = Record<string, string | string[] | undefined>;

export type SavedBillSearchContext = {
  audience?: string | undefined;
  source?: "bills" | undefined;
};

export type SolarDemoSettings = {
  profile: DemoSolarProfileKey;
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
};

export const solarProfileOptions: Array<{ value: DemoSolarProfileKey; label: string; description: string }> = [
  {
    value: "evening_home",
    label: "Evening-heavy home",
    description: "Lower daytime load, so self-consumption is usually weaker."
  },
  {
    value: "daytime_home",
    label: "Daytime home",
    description: "More daytime load that can absorb rooftop solar generation."
  },
  {
    value: "daytime_shop",
    label: "Daytime shop",
    description: "High daytime load, useful for testing strong self-consumption cases."
  }
];

export function getSolarDemo(params: SolarSearchParams): {
  input: SolarAnalysisInput;
  analysis: SolarAnalysisResult;
  settings: SolarDemoSettings;
  queryString: string;
  savedBillContext: SavedBillSearchContext;
} {
  const validationMessages: string[] = [];
  const profile = normalizeSolarProfile(getSingleParam(params.profile));
  const demoInput = createDemoSolarInput(profile);
  const systemSizeKwp = getNumberParam(params.systemSizeKwp, profile === "daytime_shop" ? 8 : 5, 0.1, "System size", validationMessages);
  const capexThb = getNumberParam(params.capexThb, systemSizeKwp * 42000, 0, "CAPEX", validationMessages);
  const exportEnabled = getBooleanParam(params.exportEnabled, true);
  const settings: SolarDemoSettings = {
    profile,
    baseline: normalizeBaseline(getSingleParam(params.baseline)),
    modelMode: normalizeModelMode(getSingleParam(params.modelMode)),
    systemSizeKwp,
    roofAreaSqm: getNumberParam(params.roofAreaSqm, systemSizeKwp * 6, 0, "Roof area", validationMessages),
    roofAzimuth: getNumberParam(params.roofAzimuth, demoInput.solarAssumptions.roofAzimuth ?? 180, 0, "Roof azimuth", validationMessages),
    roofTilt: getNumberParam(params.roofTilt, demoInput.solarAssumptions.roofTilt ?? 12, 0, "Roof tilt", validationMessages),
    province: getSingleParam(params.province) ?? "Bangkok",
    latitude: getOptionalNumberParam(params.latitude, -90, 90, "Latitude", validationMessages),
    longitude: getOptionalNumberParam(params.longitude, -180, 180, "Longitude", validationMessages),
    systemLossPercent: getNumberParam(params.systemLossPercent, demoInput.solarAssumptions.systemLossPercent, 0, "System loss", validationMessages),
    shadingLossPercent: getNumberParam(params.shadingLossPercent, demoInput.solarAssumptions.shadingLossPercent, 0, "Shading loss", validationMessages),
    degradationPercentPerYear: getNumberParam(
      params.degradationPercentPerYear,
      demoInput.solarAssumptions.degradationPercentPerYear,
      0,
      "Degradation",
      validationMessages
    ),
    capexThb,
    oAndMCostPerYear: getNumberParam(params.oAndMCostPerYear, capexThb * 0.01, 0, "O&M", validationMessages),
    projectLifeYears: getNumberParam(params.projectLifeYears, 20, 1, "Project life", validationMessages),
    discountRatePercent: getNumberParam(params.discountRatePercent, 6, 0, "Discount rate", validationMessages),
    electricityEscalationRatePercent: getNumberParam(params.electricityEscalationRatePercent, 2, 0, "Electricity escalation", validationMessages),
    inverterReplacementCostThb: getNumberParam(params.inverterReplacementCostThb, systemSizeKwp * 5500, 0, "Inverter replacement", validationMessages),
    inverterReplacementYear: getNumberParam(params.inverterReplacementYear, 10, 0, "Inverter replacement year", validationMessages),
    exportEnabled,
    exportRateThbPerKwh: getNumberParam(params.exportRateThbPerKwh, demoInput.exportPolicy.exportRateThbPerKwh, 0, "Export rate", validationMessages),
    exportLimitKw: getNumberParam(params.exportLimitKw, demoInput.exportPolicy.exportLimitKw ?? 10, 0, "Export limit", validationMessages),
    validationMessages
  };
  const input = createDemoSolarInput(profile, {
    systemSizeKwp: settings.systemSizeKwp,
    capexThb: settings.capexThb,
    exportEnabled: settings.exportEnabled,
    exportRateThbPerKwh: settings.exportRateThbPerKwh,
    exportLimitKw: settings.exportLimitKw,
    discountRatePercent: settings.discountRatePercent,
    projectLifeYears: settings.projectLifeYears,
    roofAreaSqm: settings.roofAreaSqm,
    roofAzimuth: settings.roofAzimuth,
    roofTilt: settings.roofTilt,
    systemLossPercent: settings.systemLossPercent,
    shadingLossPercent: settings.shadingLossPercent,
    degradationPercentPerYear: settings.degradationPercentPerYear,
    electricityEscalationRatePercent: settings.electricityEscalationRatePercent,
    oAndMCostPerYear: settings.oAndMCostPerYear,
    inverterReplacementCostThb: settings.inverterReplacementCostThb,
    inverterReplacementYear: settings.inverterReplacementYear === 0 ? null : settings.inverterReplacementYear,
    modelDetailLevel: settings.modelMode
  });
  input.solarAssumptions = {
    ...input.solarAssumptions,
    province: settings.province,
    ...(settings.latitude === undefined ? {} : { latitude: settings.latitude }),
    ...(settings.longitude === undefined ? {} : { longitude: settings.longitude }),
    roofAreaSqm: settings.roofAreaSqm,
    roofAzimuth: settings.roofAzimuth,
    roofTilt: settings.roofTilt
  };
  const apiRequest = solarAnalyzeRequestSchema.parse({
    profile: settings.profile,
    modelMode: settings.modelMode,
    province: settings.province,
    ...(settings.latitude === undefined ? {} : { latitude: String(settings.latitude) }),
    ...(settings.longitude === undefined ? {} : { longitude: String(settings.longitude) }),
    billDate: "2026-07-01",
    voltageLevel: "low_voltage",
    customerSegment: settings.profile === "daytime_shop" ? "small_business" : "residential",
    systemSizeKwp: settings.systemSizeKwp,
    roofAreaSqm: settings.roofAreaSqm,
    roofAzimuth: settings.roofAzimuth,
    roofTilt: settings.roofTilt,
    systemLossPercent: settings.systemLossPercent,
    shadingLossPercent: settings.shadingLossPercent,
    degradationPercentPerYear: settings.degradationPercentPerYear,
    capexThb: settings.capexThb,
    oAndMCostPerYear: settings.oAndMCostPerYear,
    projectLifeYears: settings.projectLifeYears,
    discountRatePercent: settings.discountRatePercent,
    electricityEscalationRatePercent: settings.electricityEscalationRatePercent,
    inverterReplacementCostThb: settings.inverterReplacementCostThb,
    inverterReplacementYear: settings.inverterReplacementYear,
    exportEnabled: settings.exportEnabled,
    exportRateThbPerKwh: settings.exportRateThbPerKwh,
    exportLimitKw: settings.exportLimitKw
  });
  const apiPayload = runSolarAnalyzeApiCalculation(apiRequest);

  return {
    input,
    analysis: apiPayload.analysis,
    settings,
    queryString: appendSavedBillContext(buildSolarQuery(settings), params),
    savedBillContext: getSavedBillContext(params)
  };
}

export function buildSolarQuery(settings: SolarDemoSettings) {
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
    electricityEscalationRatePercent: String(settings.electricityEscalationRatePercent),
    inverterReplacementCostThb: String(settings.inverterReplacementCostThb),
    inverterReplacementYear: String(settings.inverterReplacementYear),
    exportEnabled: String(settings.exportEnabled),
    exportRateThbPerKwh: String(settings.exportRateThbPerKwh),
    exportLimitKw: String(settings.exportLimitKw)
  });
  return params.toString();
}

export function normalizeSolarProfile(value: string | undefined): DemoSolarProfileKey {
  return solarProfileOptions.some((option) => option.value === value) ? (value as DemoSolarProfileKey) : "evening_home";
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

function appendSavedBillContext(queryString: string, params: SolarSearchParams) {
  if (getSingleParam(params.source) !== "bills") return queryString;

  const nextParams = new URLSearchParams(queryString);
  nextParams.set("source", "bills");
  const audience = getSingleParam(params.audience);
  if (audience) nextParams.set("audience", audience);
  return nextParams.toString();
}

function getSavedBillContext(params: SolarSearchParams): SavedBillSearchContext {
  if (getSingleParam(params.source) !== "bills") return {};
  return {
    audience: getSingleParam(params.audience),
    source: "bills"
  };
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
  validationMessages.push(`${label} must be greater than or equal to ${min}; the default value was used.`);
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
  validationMessages.push(`${label} must be between ${min} and ${max}; site data was not requested.`);
  return undefined;
}

function getBooleanParam(value: string | string[] | undefined, fallback: boolean) {
  const normalized = getSingleParam(value);
  if (normalized === undefined) return fallback;
  return normalized === "true" || normalized === "on" || normalized === "1";
}
