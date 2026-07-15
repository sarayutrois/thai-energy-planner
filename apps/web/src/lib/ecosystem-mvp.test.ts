import { describe, expect, it } from "vitest";
import { buildEcosystemPlan, type EcosystemPlanInput } from "./ecosystem-mvp";

function baseInput(): EcosystemPlanInput {
  return {
    currentMonthlyBillThb: 5_000,
    hasLoadProfile: true,
    scenario: {
      status: "ready",
      value: {
        annualSavingsThb: 6_000,
        monthlyBillThb: 4_500,
        recommendation: "ใช้ TOU",
      },
    },
    solar: {
      status: "ready",
      value: {
        systemSizeKwp: 5,
        initialInvestmentThb: 180_000,
        annualBenefitThb: 24_000,
        monthlyBillAfterSolarThb: 3_000,
        simplePaybackYears: 7.5,
        systemType: "on_grid",
      },
    },
    battery: { status: "missing", value: null },
    ev: { status: "missing", value: null },
  };
}

describe("buildEcosystemPlan", () => {
  it("does not fabricate totals without bills and a load profile", () => {
    const result = buildEcosystemPlan({
      ...baseInput(),
      currentMonthlyBillThb: null,
      hasLoadProfile: false,
      scenario: { status: "missing", value: null },
      solar: { status: "missing", value: null },
    });
    expect(result.verdict).toBe("needs_data");
    expect(result.projectedMonthlyEnergyCostThb).toBeNull();
    expect(result.primaryAnnualSavingsThb).toBeNull();
  });

  it("uses the strongest base result instead of adding TOU and Solar", () => {
    const result = buildEcosystemPlan(baseInput());
    expect(result.primaryAnnualSavingsThb).toBe(24_000);
    expect(result.projectedMonthlyEnergyCostThb).toBe(3_000);
    expect(result.knownBudgetLowThb).toBe(180_000);
    expect(result.savingsSourceLabel).toContain("Solar");
  });

  it("treats EV as added energy cost", () => {
    const input = baseInput();
    input.ev = {
      status: "ready",
      value: {
        monthlyBillIncreaseThb: 1_000,
      } as EcosystemPlanInput["ev"]["value"],
    };
    const result = buildEcosystemPlan(input);
    expect(result.evAnnualAddedCostThb).toBe(12_000);
    expect(result.netAnnualChangeThb).toBe(12_000);
    expect(result.projectedMonthlyEnergyCostThb).toBe(4_000);
  });

  it("marks stale modules for recalculation", () => {
    const input = baseInput();
    input.solar = { status: "stale", value: input.solar.value };
    const result = buildEcosystemPlan(input);
    expect(result.phases[1]?.status).toBe("needs_data");
    expect(result.limitations.some((item) => item.includes("ชุดบิลเก่า"))).toBe(
      true,
    );
  });

  it("does not show savings or payback when Solar is not recommended", () => {
    const input = baseInput();
    input.scenario = { status: "missing", value: null };
    input.solar.value = {
      ...input.solar.value!,
      systemType: "not_recommended",
    };
    const result = buildEcosystemPlan(input);
    expect(result.primaryAnnualSavingsThb).toBeNull();
    expect(result.blendedSimplePaybackYears).toBeNull();
    expect(result.phases[1]?.annualImpactThb).toBeNull();
  });
});
