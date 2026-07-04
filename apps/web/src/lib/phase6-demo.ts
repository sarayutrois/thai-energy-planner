import {
  createDemoBatteryFinancialAssumptions,
  createDemoPhase6Input,
  runBatteryAnalysis,
  runEvScenario,
  runEvScenarioComparison,
  type BatteryAnalysisResult,
  type BatteryDispatchStrategy,
  type EvChargingStrategy,
  type EvScenarioComparisonResult,
  type EvScenarioResult,
  type Phase6DemoInput
} from "@thai-energy-planner/calculation-engine";

export type Phase6SearchParams = Record<string, string | string[] | undefined>;
export type Phase6ProfileKey = "export_home" | "low_export_home" | "ev_evening";

export type BatteryDemoSettings = {
  profile: Phase6ProfileKey;
  strategy: BatteryDispatchStrategy;
  capacityKwh: number;
  usableCapacityKwh: number;
  capexThb: number;
  chargePowerKw: number;
  dischargePowerKw: number;
  backupReservePercent: number;
  peakShavingThresholdKw: number;
  validationMessages: string[];
};

export type EvDemoSettings = {
  profile: Phase6ProfileKey;
  strategy: EvChargingStrategy;
  dailyDistanceKm: number;
  chargerPowerKw: number;
  arrivalTime: string;
  departureTime: string;
  targetSocPercent: number;
  initialSocPercent: number;
  validationMessages: string[];
};

export const phase6ProfileOptions: Array<{ value: Phase6ProfileKey; label: string; description: string }> = [
  { value: "export_home", label: "Battery Demo A", description: "Home profile with solar export available." },
  { value: "low_export_home", label: "Battery Demo B", description: "Profile with limited solar export and weaker battery economics." },
  { value: "ev_evening", label: "EV Demo A", description: "Evening EV charging profile that raises peak demand." }
];

export const batteryStrategyOptions: Array<{ value: BatteryDispatchStrategy; label: string }> = [
  { value: "HYBRID", label: "Hybrid" },
  { value: "SOLAR_SELF_CONSUMPTION", label: "Solar self-consumption" },
  { value: "PEAK_SHAVING", label: "Peak shaving" },
  { value: "TOU_ARBITRAGE", label: "TOU arbitrage" },
  { value: "BACKUP_RESERVE", label: "Backup reserve" }
];

export const evStrategyOptions: Array<{ value: EvChargingStrategy; label: string }> = [
  { value: "CHARGE_IMMEDIATELY", label: "Immediate" },
  { value: "OFF_PEAK", label: "Off-Peak" },
  { value: "SMART", label: "Smart" },
  { value: "SOLAR_SURPLUS", label: "Solar surplus" }
];

export function getBatteryDemo(params: Phase6SearchParams): {
  demo: Phase6DemoInput;
  analysis: BatteryAnalysisResult;
  settings: BatteryDemoSettings;
  queryString: string;
} {
  const validationMessages: string[] = [];
  const profile = normalizeProfile(getSingleParam(params.profile));
  const demo = createDemoPhase6Input(profile);
  const capacityKwh = getNumberParam(params.capacityKwh, demo.batteryConfig.capacityKwh, 0.1, "Battery capacity", validationMessages);
  const usableCapacityKwh = Math.min(
    getNumberParam(params.usableCapacityKwh, demo.batteryConfig.usableCapacityKwh, 0.1, "Usable capacity", validationMessages),
    capacityKwh
  );
  const settings: BatteryDemoSettings = {
    profile,
    strategy: normalizeBatteryStrategy(getSingleParam(params.strategy), demo.batteryConfig.dispatchStrategy),
    capacityKwh,
    usableCapacityKwh,
    capexThb: getNumberParam(params.capexThb, demo.batteryConfig.capexThb, 0, "Battery CAPEX", validationMessages),
    chargePowerKw: getNumberParam(params.chargePowerKw, demo.batteryConfig.chargePowerKw, 0.1, "Charge power", validationMessages),
    dischargePowerKw: getNumberParam(params.dischargePowerKw, demo.batteryConfig.dischargePowerKw, 0.1, "Discharge power", validationMessages),
    backupReservePercent: getNumberParam(
      params.backupReservePercent,
      demo.batteryConfig.backupReservePercent,
      0,
      "Backup reserve",
      validationMessages
    ),
    peakShavingThresholdKw: getNumberParam(
      params.peakShavingThresholdKw,
      demo.batteryConfig.peakShavingThresholdKw ?? 0,
      0,
      "Peak shaving threshold",
      validationMessages
    ),
    validationMessages
  };
  const config = {
    ...demo.batteryConfig,
    capacityKwh: settings.capacityKwh,
    usableCapacityKwh: settings.usableCapacityKwh,
    capexThb: settings.capexThb,
    chargePowerKw: settings.chargePowerKw,
    dischargePowerKw: settings.dischargePowerKw,
    backupReservePercent: Math.min(settings.backupReservePercent, 100),
    peakShavingThresholdKw: settings.peakShavingThresholdKw,
    dispatchStrategy: settings.strategy
  };
  const analysis = runBatteryAnalysis({
    loadIntervals: demo.loadIntervals,
    solarIntervals: demo.solarIntervals,
    normalTariff: demo.normalTariff,
    touTariff: demo.touTariff,
    config,
    financialAssumptions: createDemoBatteryFinancialAssumptions(config),
    meterMode: "tou",
    billDate: "2026-02-01"
  });

  return { demo: { ...demo, batteryConfig: config }, analysis, settings, queryString: buildBatteryQuery(settings) };
}

export function getEvDemo(params: Phase6SearchParams): {
  demo: Phase6DemoInput;
  selectedScenario: EvScenarioResult;
  comparison: EvScenarioComparisonResult;
  settings: EvDemoSettings;
  queryString: string;
} {
  const validationMessages: string[] = [];
  const profile = normalizeProfile(getSingleParam(params.profile));
  const demo = createDemoPhase6Input(profile);
  const settings: EvDemoSettings = {
    profile,
    strategy: normalizeEvStrategy(getSingleParam(params.strategy), demo.evConfig.chargingStrategy),
    dailyDistanceKm: getNumberParam(params.dailyDistanceKm, demo.evConfig.dailyDistanceKm, 0, "Daily distance", validationMessages),
    chargerPowerKw: getNumberParam(params.chargerPowerKw, demo.evConfig.chargerPowerKw, 0.1, "Charger power", validationMessages),
    arrivalTime: getTimeParam(params.arrivalTime, demo.evConfig.arrivalTime, validationMessages),
    departureTime: getTimeParam(params.departureTime, demo.evConfig.departureTime, validationMessages),
    targetSocPercent: getNumberParam(params.targetSocPercent, demo.evConfig.targetSocPercent, 1, "Target SOC", validationMessages),
    initialSocPercent: getNumberParam(params.initialSocPercent, demo.evConfig.initialSocPercent, 0, "Initial SOC", validationMessages),
    validationMessages
  };
  const config = {
    ...demo.evConfig,
    chargingStrategy: settings.strategy,
    dailyDistanceKm: settings.dailyDistanceKm,
    chargerPowerKw: settings.chargerPowerKw,
    arrivalTime: settings.arrivalTime,
    departureTime: settings.departureTime,
    targetSocPercent: settings.targetSocPercent,
    initialSocPercent: settings.initialSocPercent
  };
  const common = {
    baseLoadIntervals: demo.loadIntervals,
    solarIntervals: demo.solarIntervals,
    normalTariff: demo.normalTariff,
    touTariff: demo.touTariff,
    billDate: "2026-02-01",
    meterMode: "tou" as const
  };
  const selectedScenario = runEvScenario({
    ...common,
    config,
    strategy: settings.strategy
  });
  const comparison = runEvScenarioComparison({
    ...common,
    config
  });

  return { demo: { ...demo, evConfig: config }, selectedScenario, comparison, settings, queryString: buildEvQuery(settings) };
}

export function buildBatteryQuery(settings: BatteryDemoSettings) {
  return new URLSearchParams({
    profile: settings.profile,
    strategy: settings.strategy,
    capacityKwh: String(settings.capacityKwh),
    usableCapacityKwh: String(settings.usableCapacityKwh),
    capexThb: String(settings.capexThb),
    chargePowerKw: String(settings.chargePowerKw),
    dischargePowerKw: String(settings.dischargePowerKw),
    backupReservePercent: String(settings.backupReservePercent),
    peakShavingThresholdKw: String(settings.peakShavingThresholdKw)
  }).toString();
}

export function buildEvQuery(settings: EvDemoSettings) {
  return new URLSearchParams({
    profile: settings.profile,
    strategy: settings.strategy,
    dailyDistanceKm: String(settings.dailyDistanceKm),
    chargerPowerKw: String(settings.chargerPowerKw),
    arrivalTime: settings.arrivalTime,
    departureTime: settings.departureTime,
    targetSocPercent: String(settings.targetSocPercent),
    initialSocPercent: String(settings.initialSocPercent)
  }).toString();
}

function normalizeProfile(value: string | undefined): Phase6ProfileKey {
  return phase6ProfileOptions.some((option) => option.value === value) ? (value as Phase6ProfileKey) : "export_home";
}

function normalizeBatteryStrategy(value: string | undefined, fallback: BatteryDispatchStrategy): BatteryDispatchStrategy {
  return batteryStrategyOptions.some((option) => option.value === value) ? (value as BatteryDispatchStrategy) : fallback;
}

function normalizeEvStrategy(value: string | undefined, fallback: EvChargingStrategy): EvChargingStrategy {
  return evStrategyOptions.some((option) => option.value === value) ? (value as EvChargingStrategy) : fallback;
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
  validationMessages.push(`${label} must be greater than or equal to ${min}; demo fallback was used.`);
  return fallback;
}

function getTimeParam(value: string | string[] | undefined, fallback: string, validationMessages: string[]) {
  const raw = getSingleParam(value);
  if (raw === undefined || raw === "") return fallback;
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) return raw;
  validationMessages.push("Time values must use HH:mm; demo fallback was used.");
  return fallback;
}
