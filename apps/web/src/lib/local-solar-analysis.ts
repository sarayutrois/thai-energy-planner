import type { SolarAnalysisResult } from "@thai-energy-planner/calculation-engine";
import {
  getSolarAssumptionDraft,
  type SolarAssumptionSettings,
  type SolarSearchParams,
} from "./solar-assumptions";

export const solarAssumptionsStorageKey =
  "thai-energy-planner.solar-assumptions.v1";
export const solarAnalysisStorageKey = "thai-energy-planner.solar-analysis.v1";

export type SolarStatus =
  | "missing_load_profile"
  | "ready_to_calculate"
  | "calculating"
  | "calculated"
  | "error";

export type SolarCalculationTrace = {
  authority: "PEA" | "MEA";
  customerSegment: "residential" | "small_business";
  billDate: string;
  inputIntervalCount: number;
  uploadedSolarIntervalCount: number;
  tariffVersionIds: string[];
  ftVersionIds: string[];
  calculationEngineVersion: string;
  calculatedAt: string;
  timezone: "Asia/Bangkok";
};

export type SolarCalculationSuccess = {
  ok: true;
  analysis: SolarAnalysisResult;
  trace: SolarCalculationTrace;
  warnings: string[];
};

export type StoredSolarAnalysis = {
  schemaVersion: 1;
  profileSnapshotId: string;
  settingsFingerprint: string;
  calculatedAt: string;
  result: SolarCalculationSuccess;
};

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function deriveSolarStatus(input: {
  hasLoadProfile: boolean;
  isCalculating: boolean;
  hasCalculatedResult: boolean;
  hasError: boolean;
}): SolarStatus {
  if (!input.hasLoadProfile) return "missing_load_profile";
  if (input.isCalculating) return "calculating";
  if (input.hasError) return "error";
  if (input.hasCalculatedResult) return "calculated";
  return "ready_to_calculate";
}

export function solarSettingsFingerprint(settings: SolarAssumptionSettings) {
  return JSON.stringify([
    settings.profile,
    settings.baseline,
    settings.modelMode,
    settings.systemSizeKwp,
    settings.roofAreaSqm,
    settings.roofAzimuth,
    settings.roofTilt,
    settings.province,
    settings.latitude ?? null,
    settings.longitude ?? null,
    settings.systemLossPercent,
    settings.shadingLossPercent,
    settings.degradationPercentPerYear,
    settings.capexThb,
    settings.oAndMCostPerYear,
    settings.projectLifeYears,
    settings.discountRatePercent,
    settings.electricityEscalationRatePercent,
    settings.inverterReplacementCostThb,
    settings.inverterReplacementYear,
    settings.exportEnabled,
    settings.exportRateThbPerKwh,
    settings.exportLimitKw,
    settings.backupRequirement,
    settings.essentialLoadKw,
    settings.backupHours,
    settings.batteryCostPerKwhThb,
  ]);
}

export function readStoredSolarAssumptions(
  storage: ReadableStorage,
): SolarAssumptionSettings | null {
  try {
    const raw = storage.getItem(solarAssumptionsStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as {
      schemaVersion?: unknown;
      settings?: unknown;
    };
    if (candidate.schemaVersion !== 1 || !isPlainObject(candidate.settings))
      return null;
    return getSolarAssumptionDraft(toSolarSearchParams(candidate.settings))
      .settings;
  } catch {
    return null;
  }
}

export function persistSolarAssumptions(
  storage: WritableStorage,
  settings: SolarAssumptionSettings,
) {
  try {
    storage.setItem(
      solarAssumptionsStorageKey,
      JSON.stringify({
        schemaVersion: 1,
        savedAt: new Date().toISOString(),
        settings: serializableSettings(settings),
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearStoredSolarAssumptions(storage: WritableStorage) {
  storage.removeItem(solarAssumptionsStorageKey);
}

export function readStoredSolarAnalysis(
  storage: ReadableStorage,
): StoredSolarAnalysis | null {
  try {
    const raw = storage.getItem(solarAnalysisStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isStoredSolarAnalysis(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function persistSolarAnalysis(
  storage: WritableStorage,
  input: Omit<StoredSolarAnalysis, "schemaVersion" | "calculatedAt"> & {
    calculatedAt?: string;
  },
) {
  try {
    const calculatedAt = input.calculatedAt ?? input.result.trace.calculatedAt;
    storage.setItem(
      solarAnalysisStorageKey,
      JSON.stringify({ ...input, schemaVersion: 1, calculatedAt }),
    );
    return true;
  } catch {
    return false;
  }
}

export function compactSolarCalculationSuccess(
  result: SolarCalculationSuccess,
): SolarCalculationSuccess {
  const analysis = result.analysis;
  return {
    ...result,
    analysis: {
      billComparison: {
        bestWithoutSolar: {
          monthlyEnergyKwh:
            analysis.billComparison.bestWithoutSolar.monthlyEnergyKwh,
          monthlyBillThb:
            analysis.billComparison.bestWithoutSolar.monthlyBillThb,
        },
        bestWithSolar: {
          monthlyBillThb: analysis.billComparison.bestWithSolar.monthlyBillThb,
        },
        billSavings: analysis.billComparison.billSavings,
        exportRevenue: analysis.billComparison.exportRevenue,
        netAnnualBenefit: analysis.billComparison.netAnnualBenefit,
      },
      solarProfile: {
        assumptionsSnapshot: {
          systemSizeKwp:
            analysis.solarProfile.assumptionsSnapshot.systemSizeKwp,
        },
        source: {
          authority: analysis.solarProfile.source.authority,
          status: analysis.solarProfile.source.status,
          verifiedAt: analysis.solarProfile.source.verifiedAt,
        },
      },
      sizing: {
        recommended: analysis.sizing.recommended
          ? {
              systemSizeKwp: analysis.sizing.recommended.systemSizeKwp,
              simplePaybackYears:
                analysis.sizing.recommended.simplePaybackYears,
            }
          : null,
        constraints: {
          appliedMaxKwp: analysis.sizing.constraints.appliedMaxKwp,
        },
      },
      selfConsumption: {
        selfSufficiencyRatio: analysis.selfConsumption.selfSufficiencyRatio,
        selfConsumptionRatio: analysis.selfConsumption.selfConsumptionRatio,
      },
      financial: {
        initialInvestmentThb: analysis.financial.initialInvestmentThb,
        simplePaybackYears: analysis.financial.simplePaybackYears,
      },
      modelQuality: { score: analysis.modelQuality.score },
      recommendations: analysis.recommendations.map((item) => ({
        title: item.title,
        explanation: item.explanation,
        nextAction: item.nextAction,
      })),
    } as SolarAnalysisResult,
  };
}

export function getSolarBenefitBreakdown(
  comparison: SolarAnalysisResult["billComparison"],
) {
  const inferredBillSavings = Math.max(
    0,
    (comparison.bestWithoutSolar.monthlyBillThb -
      comparison.bestWithSolar.monthlyBillThb) *
      12,
  );
  const billSavings = Number.isFinite(comparison.billSavings)
    ? comparison.billSavings
    : inferredBillSavings;
  const exportRevenue = Number.isFinite(comparison.exportRevenue)
    ? comparison.exportRevenue
    : Math.max(0, comparison.netAnnualBenefit - billSavings);
  return { billSavings, exportRevenue };
}

export function storedSolarAnalysisMatches(
  stored: StoredSolarAnalysis,
  profileSnapshotId: string,
  settings: SolarAssumptionSettings,
) {
  return (
    stored.profileSnapshotId === profileSnapshotId &&
    stored.settingsFingerprint === solarSettingsFingerprint(settings)
  );
}

function isStoredSolarAnalysis(value: unknown): value is StoredSolarAnalysis {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredSolarAnalysis>;
  return (
    candidate.schemaVersion === 1 &&
    typeof candidate.profileSnapshotId === "string" &&
    typeof candidate.settingsFingerprint === "string" &&
    typeof candidate.calculatedAt === "string" &&
    Boolean(candidate.result) &&
    candidate.result?.ok === true &&
    Boolean(candidate.result.analysis) &&
    Array.isArray(candidate.result.warnings) &&
    typeof candidate.result.trace?.calculatedAt === "string"
  );
}

function serializableSettings(settings: SolarAssumptionSettings) {
  return Object.fromEntries(
    Object.entries(settings).filter(
      ([key]) => key !== "validationMessages" && key !== "defaultedFields",
    ),
  );
}

function toSolarSearchParams(
  settings: Record<string, unknown>,
): SolarSearchParams {
  return Object.fromEntries(
    Object.entries(settings).flatMap(([key, value]) =>
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
        ? [[key, String(value)]]
        : [],
    ),
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
