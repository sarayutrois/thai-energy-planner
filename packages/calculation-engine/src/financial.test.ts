import { describe, expect, it } from "vitest";
import {
  buildSolarCashflows,
  calculateDiscountedPayback,
  calculateFinancialResult,
  calculateIRR,
  calculateNPV,
  calculateSimplePayback
} from "./financial";

describe("financial core", () => {
  it("returns positive NPV when annual savings are high", () => {
    const cashflows = [
      { year: 0, amountThb: -1000 },
      { year: 1, amountThb: 700 },
      { year: 2, amountThb: 700 }
    ];

    expect(calculateNPV(cashflows, 5)).toBeGreaterThan(250);
  });

  it("returns negative NPV when annual savings are too low", () => {
    const cashflows = [
      { year: 0, amountThb: -1000 },
      { year: 1, amountThb: 100 },
      { year: 2, amountThb: 100 }
    ];

    expect(calculateNPV(cashflows, 5)).toBeLessThan(0);
  });

  it("calculates simple and discounted payback with partial years", () => {
    const cashflows = [
      { year: 0, amountThb: -1000 },
      { year: 1, amountThb: 400 },
      { year: 2, amountThb: 400 },
      { year: 3, amountThb: 400 },
      { year: 4, amountThb: 400 }
    ];

    expect(calculateSimplePayback(cashflows)).toBe(2.5);
    expect(calculateDiscountedPayback(cashflows, 10)).toBeGreaterThan(2.5);
  });

  it("calculates IRR for a normal investment case", () => {
    const irr = calculateIRR([
      { year: 0, amountThb: -1000 },
      { year: 1, amountThb: 500 },
      { year: 2, amountThb: 500 },
      { year: 3, amountThb: 500 }
    ]);

    expect(irr).not.toBeNull();
    expect(irr).toBeGreaterThan(20);
  });

  it("returns null instead of crashing when IRR cannot be calculated", () => {
    expect(calculateIRR([{ year: 0, amountThb: 100 }, { year: 1, amountThb: 100 }])).toBeNull();
  });

  it("builds solar cashflows with year 0 negative investment and lifecycle adjustments", () => {
    const cashflows = buildSolarCashflows({
      initialInvestmentThb: 100000,
      annualSavingThb: 20000,
      annualExportRevenueThb: 1000,
      projectLifeYears: 3,
      annualOAndMCostThb: 1000,
      electricityEscalationRatePercent: 5,
      solarDegradationRatePercent: 1,
      inverterReplacementCostThb: 5000,
      inverterReplacementYear: 2
    });

    expect(cashflows[0]).toMatchObject({ year: 0, amountThb: -100000 });
    expect(cashflows[1]?.amountThb).toBe(20000);
    expect(cashflows[2]?.amountThb).toBeLessThan(cashflows[1]!.amountThb + 21000 * 0.05);

    const result = calculateFinancialResult(cashflows, 5);
    expect(result.npvThb).toBeLessThan(0);
    expect(result.simplePaybackYear).toBeNull();
  });
});
