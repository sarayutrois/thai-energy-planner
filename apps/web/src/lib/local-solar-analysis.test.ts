import { describe, expect, it } from "vitest";
import type { SolarAnalysisResult } from "@thai-energy-planner/calculation-engine";
import { getSolarAssumptionDraft } from "./solar-assumptions";
import {
  deriveSolarStatus,
  getSolarBenefitBreakdown,
  persistSolarAnalysis,
  persistSolarAssumptions,
  readStoredSolarAnalysis,
  readStoredSolarAssumptions,
  solarSettingsFingerprint,
  storedSolarAnalysisMatches,
  type SolarCalculationSuccess,
} from "./local-solar-analysis";

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("local solar analysis lifecycle", () => {
  it("derives mutually exclusive user-facing states", () => {
    expect(
      deriveSolarStatus({
        hasLoadProfile: false,
        isCalculating: true,
        hasCalculatedResult: false,
        hasError: false,
      }),
    ).toBe("missing_load_profile");
    expect(
      deriveSolarStatus({
        hasLoadProfile: true,
        isCalculating: false,
        hasCalculatedResult: false,
        hasError: false,
      }),
    ).toBe("ready_to_calculate");
    expect(
      deriveSolarStatus({
        hasLoadProfile: true,
        isCalculating: true,
        hasCalculatedResult: false,
        hasError: false,
      }),
    ).toBe("calculating");
    expect(
      deriveSolarStatus({
        hasLoadProfile: true,
        isCalculating: false,
        hasCalculatedResult: true,
        hasError: false,
      }),
    ).toBe("calculated");
    expect(
      deriveSolarStatus({
        hasLoadProfile: true,
        isCalculating: false,
        hasCalculatedResult: false,
        hasError: true,
      }),
    ).toBe("error");
  });

  it("persists assumptions without URL state and restores validated values", () => {
    const storage = createMemoryStorage();
    const settings = getSolarAssumptionDraft({
      systemSizeKwp: "7.5",
      capexThb: "280000",
      backupRequirement: "essential",
      essentialLoadKw: "1.5",
      backupHours: "5",
    }).settings;

    expect(persistSolarAssumptions(storage, settings)).toBe(true);
    const restored = readStoredSolarAssumptions(storage);
    expect(restored?.systemSizeKwp).toBe(7.5);
    expect(restored?.capexThb).toBe(280000);
    expect(restored?.backupRequirement).toBe("essential");
    expect(restored?.essentialLoadKw).toBe(1.5);
    expect(restored?.backupHours).toBe(5);
  });

  it("restores a calculated result only for the same profile and assumptions", () => {
    const storage = createMemoryStorage();
    const settings = getSolarAssumptionDraft({}).settings;
    const result = {
      ok: true,
      analysis: {} as SolarAnalysisResult,
      trace: {
        authority: "PEA",
        customerSegment: "residential",
        billDate: "2026-07-01",
        inputIntervalCount: 24,
        uploadedSolarIntervalCount: 0,
        tariffVersionIds: ["tariff-v1"],
        ftVersionIds: ["ft-v1"],
        calculationEngineVersion: "engine-v1",
        calculatedAt: "2026-07-14T12:00:00.000Z",
        timezone: "Asia/Bangkok",
      },
      warnings: [],
    } satisfies SolarCalculationSuccess;

    expect(
      persistSolarAnalysis(storage, {
        profileSnapshotId: "profile-1",
        settingsFingerprint: solarSettingsFingerprint(settings),
        result,
      }),
    ).toBe(true);

    const restored = readStoredSolarAnalysis(storage);
    expect(restored).not.toBeNull();
    expect(storedSolarAnalysisMatches(restored!, "profile-1", settings)).toBe(
      true,
    );
    expect(storedSolarAnalysisMatches(restored!, "profile-2", settings)).toBe(
      false,
    );
  });

  it("derives a finite benefit breakdown for legacy compact snapshots", () => {
    const breakdown = getSolarBenefitBreakdown({
      bestWithoutSolar: { monthlyBillThb: 297.77 },
      bestWithSolar: { monthlyBillThb: 297.77 },
      netAnnualBenefit: 4326.4,
    } as SolarAnalysisResult["billComparison"]);

    expect(breakdown).toEqual({
      billSavings: 0,
      exportRevenue: 4326.4,
    });
  });
});
