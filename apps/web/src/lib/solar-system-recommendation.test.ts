import { describe, expect, it } from "vitest";
import type { SolarAnalysisResult } from "@thai-energy-planner/calculation-engine";
import { getSolarAssumptionDraft } from "./solar-assumptions";
import { buildSolarSystemRecommendation } from "./solar-system-recommendation";

function analysisWithRecommendation(): SolarAnalysisResult {
  return {
    sizing: {
      recommended: {
        systemSizeKwp: 5,
        capexThb: 210_000,
        simplePaybackYears: 6.8,
        npvThb: 180_000,
      },
      constraints: { appliedMaxKwp: 10 },
    },
    solarProfile: { assumptionsSnapshot: { panelWatt: 550 } },
    selfConsumption: { selfConsumptionRatio: 0.72 },
    modelQuality: { score: 72 },
  } as SolarAnalysisResult;
}

describe("Solar system recommendation", () => {
  it("recommends an on-grid system without a battery when backup is not needed", () => {
    const result = buildSolarSystemRecommendation({
      analysis: analysisWithRecommendation(),
      settings: getSolarAssumptionDraft({ backupRequirement: "none" })
        .settings,
      hasCalibratedBills: true,
    });

    expect(result.verdict).toBe("recommend");
    expect(result.systemType).toBe("on_grid");
    expect(result.systemSizeKwp).toBe(5);
    expect(result.panelCount).toBe(9);
    expect(result.inverterSizeKw).toBe(5);
    expect(result.batteryRecommended).toBe(false);
    expect(result.solarOnlyPaybackYears).toBe(6.8);
  });

  it("keeps the answer provisional until the user confirms backup needs", () => {
    const result = buildSolarSystemRecommendation({
      analysis: analysisWithRecommendation(),
      settings: getSolarAssumptionDraft({}).settings,
      hasCalibratedBills: true,
    });

    expect(result.verdict).toBe("consider");
    expect(result.systemTypeLabel).toContain("รอยืนยัน");
    expect(result.limitations.some((item) => item.includes("ไฟสำรอง"))).toBe(
      true,
    );
  });

  it("recommends hybrid and sizes backup storage from essential load", () => {
    const settings = getSolarAssumptionDraft({
      backupRequirement: "essential",
      essentialLoadKw: "1.5",
      backupHours: "4",
      batteryCostPerKwhThb: "35000",
    }).settings;
    const result = buildSolarSystemRecommendation({
      analysis: analysisWithRecommendation(),
      settings,
      hasCalibratedBills: true,
    });

    expect(result.systemType).toBe("hybrid");
    expect(result.batteryRecommended).toBe(true);
    expect(result.batteryUsableKwh).toBe(10);
    expect(result.budgetLowThb).toBeGreaterThan(210_000);
    expect(result.combinedPaybackLabel).toContain("ต้องจำลอง");
  });

  it("does not invent a system size when no option passes the financial gate", () => {
    const analysis = analysisWithRecommendation();
    analysis.sizing.recommended = null;
    analysis.selfConsumption.selfConsumptionRatio = 0.3;
    const result = buildSolarSystemRecommendation({
      analysis,
      settings: getSolarAssumptionDraft({}).settings,
      hasCalibratedBills: false,
    });

    expect(result.verdict).toBe("not_recommended");
    expect(result.systemType).toBe("not_recommended");
    expect(result.panelCount).toBeNull();
    expect(result.budgetLowThb).toBeNull();
  });
});
