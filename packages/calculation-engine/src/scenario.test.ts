import { describe, expect, it } from "vitest";
import { compareScenarios } from "./scenario";

describe("scenario comparison core", () => {
  it("compares Normal, TOU, Solar, and TOU + Solar scenarios from numeric engine outputs", () => {
    const result = compareScenarios({
      currentNormalAnnualCostThb: 48000,
      scenarios: [
        { scenarioName: "Current / Normal tariff", annualCostThb: 48000 },
        { scenarioName: "TOU only", annualCostThb: 45000 },
        {
          scenarioName: "Solar only",
          annualCostThb: 36000,
          investmentThb: 120000,
          npvThb: 15000,
          irrPercent: 9.5,
          simplePaybackYear: 10,
          discountedPaybackYear: 12,
        },
        {
          scenarioName: "TOU + Solar",
          annualCostThb: 33000,
          investmentThb: 122500,
          npvThb: 21000,
          irrPercent: 11.2,
          simplePaybackYear: 8.17,
          discountedPaybackYear: 10.4,
        },
      ],
    });

    expect(result.bestScenario.scenarioName).toBe("TOU + Solar");
    expect(result.bestScenario.annualSavingThb).toBe(15000);
    expect(result.bestScenario.recommendation).toBe("recommended");
    expect(result.bestScenario.recommendationReasons.join(" ")).toContain(
      "15000 THB/year",
    );
  });

  it("uses actual numbers to avoid generic recommendations", () => {
    const result = compareScenarios({
      currentNormalAnnualCostThb: 24000,
      scenarios: [
        { scenarioName: "TOU only", annualCostThb: 25000 },
        {
          scenarioName: "Solar only",
          annualCostThb: 22000,
          investmentThb: 200000,
          npvThb: -50000,
          simplePaybackYear: 20,
        },
      ],
    });

    expect(result.scenarios[0]?.recommendation).toBe("not_recommended");
    expect(result.scenarios[0]?.recommendationReasons[0]).toContain(
      "1000 THB/year more",
    );
    expect(result.scenarios[1]?.recommendation).toBe("consider");
    expect(result.scenarios[1]?.recommendationReasons).toContain(
      "NPV is -50000 THB.",
    );
  });
});
