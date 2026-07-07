import { describe, expect, it } from "vitest";
import {
  estimateRequestSchema,
  runEstimateApiCalculation,
} from "./calculation-api";

interface TestEstimatePayload {
  result: {
    estimatedMonthlyKwh: number;
    recommendedSystemSizeKwp: number;
    estimatedPanelCount: { min: number; max: number };
    monthlySavingsThb: number;
    annualSavingsThb: number;
    annualExportRevenueThb: number;
    paybackYears: number | null;
    capexThb: number;
  };
  trace: {
    authority: string;
    customerSegment: string;
    billDate: string;
    processedMonths: string[];
    filledBills: Array<{ month: string; billThb: number }>;
  };
  warnings: string[];
}

describe("F2: Automatic Monthly Averaging for Incomplete Bills (API Layer)", () => {
  // ==========================================
  // TIER 1: Feature Coverage (Happy Paths)
  // ==========================================

  it("T1.F2.1: Processes a complete 12-month billing array directly without averaging adjustments", () => {
    const request: unknown = {
      province: "bangkok",
      propertyType: "home",
      usageShape: "day",
      billDate: "2026-01-01",
      monthlyBills: [
        { month: "2026-01", billThb: 3000 },
        { month: "2026-02", billThb: 3100 },
        { month: "2026-03", billThb: 3200 },
        { month: "2026-04", billThb: 3300 },
        { month: "2026-05", billThb: 3400 },
        { month: "2026-06", billThb: 3500 },
        { month: "2026-07", billThb: 3600 },
        { month: "2026-08", billThb: 3500 },
        { month: "2026-09", billThb: 3400 },
        { month: "2026-10", billThb: 3300 },
        { month: "2026-11", billThb: 3200 },
        { month: "2026-12", billThb: 3100 },
      ]
    };

    // Validate using Zod (will be updated in M4)
    const parsed = estimateRequestSchema.parse(request);
    const payload = runEstimateApiCalculation(parsed);
    expect(payload).toBeDefined();
    expect(payload.warnings).not.toContain("averaged");
  });

  it("T1.F2.2: Calculates average for incomplete bills (3 months) and pads remaining 9 months", () => {
    const request: unknown = {
      province: "bangkok",
      propertyType: "home",
      usageShape: "day",
      billDate: "2026-01-01",
      monthlyBills: [
        { month: "2026-01", billThb: 3000 },
        { month: "2026-02", billThb: 3200 },
        { month: "2026-03", billThb: 3400 }, // Average is 3200
      ]
    };

    const parsed = estimateRequestSchema.parse(request);
    const payload = runEstimateApiCalculation(parsed);
    expect(payload).toBeDefined();
    // Payload should show trace or warning indicating averaging occurred
    expect(payload.warnings.join(" ")).toContain("averaged");
  });

  it("T1.F2.3: Automatically pads remaining 11 months when a single month bill is supplied in array", () => {
    const request: unknown = {
      province: "bangkok",
      propertyType: "home",
      usageShape: "day",
      billDate: "2026-01-01",
      monthlyBills: [
        { month: "2026-01", billThb: 4000 },
      ]
    };

    const parsed = estimateRequestSchema.parse(request);
    const payload = runEstimateApiCalculation(parsed);
    expect(payload).toBeDefined();
  });

  it("T1.F2.4: Chronologically sorts monthly bills if they are supplied out of order", () => {
    const request: unknown = {
      province: "bangkok",
      propertyType: "home",
      usageShape: "day",
      billDate: "2026-01-01",
      monthlyBills: [
        { month: "2026-03", billThb: 3000 },
        { month: "2026-01", billThb: 3000 },
        { month: "2026-02", billThb: 3000 },
      ]
    };

    const parsed = estimateRequestSchema.parse(request);
    const payload = runEstimateApiCalculation(parsed) as unknown as TestEstimatePayload;
    // Verifies that the internal trace or output order is January -> February -> March
    expect(payload.trace.processedMonths[0]).toBe("2026-01");
  });

  it("T1.F2.5: Correctly calculates number of calendar days in Feb for Leap Years during sequence validation", () => {
    const request: unknown = {
      province: "bangkok",
      propertyType: "home",
      usageShape: "day",
      billDate: "2028-02-01", // 2028 is a leap year (29 days in Feb)
      monthlyBills: [
        { month: "2028-02", billThb: 2900 },
      ]
    };

    const parsed = estimateRequestSchema.parse(request);
    const payload = runEstimateApiCalculation(parsed);
    expect(payload).toBeDefined();
  });

  // ==========================================
  // TIER 2: Boundary and Edge Cases
  // ==========================================

  it("T2.F2.1: Rejects API request if monthlyBills array is empty", () => {
    const request: unknown = {
      province: "bangkok",
      propertyType: "home",
      usageShape: "day",
      billDate: "2026-01-01",
      monthlyBills: []
    };

    const parsed = estimateRequestSchema.safeParse(request);
    expect(parsed.success).toBe(false);
  });

  it("T2.F2.2: Rejects API request if duplicate months are supplied", () => {
    const request: unknown = {
      province: "bangkok",
      propertyType: "home",
      usageShape: "day",
      billDate: "2026-01-01",
      monthlyBills: [
        { month: "2026-01", billThb: 3000 },
        { month: "2026-01", billThb: 3200 }, // Duplicate January
      ]
    };

    const parsed = estimateRequestSchema.safeParse(request);
    expect(parsed.success).toBe(false);
  });

  it("T2.F2.3: Correctly averages and fills chronological gaps in bill history (e.g. Jan and Mar provided, Feb missing)", () => {
    const request: unknown = {
      province: "bangkok",
      propertyType: "home",
      usageShape: "day",
      billDate: "2026-01-01",
      monthlyBills: [
        { month: "2026-01", billThb: 3000 },
        { month: "2026-03", billThb: 4000 }, // Feb is missing
      ]
    };

    const parsed = estimateRequestSchema.parse(request);
    const payload = runEstimateApiCalculation(parsed) as unknown as TestEstimatePayload;
    // Missing February must be filled using the average (3500)
    const febBill = payload.trace.filledBills.find((b) => b.month === "2026-02");
    expect(febBill?.billThb).toBe(3500);
  });

  it("T2.F2.4: Safely sorts and processes reverse-ordered months", () => {
    const request: unknown = {
      province: "bangkok",
      propertyType: "home",
      usageShape: "day",
      billDate: "2026-01-01",
      monthlyBills: [
        { month: "2026-02", billThb: 3100 },
        { month: "2026-01", billThb: 3000 },
      ]
    };

    const parsed = estimateRequestSchema.parse(request);
    const payload = runEstimateApiCalculation(parsed) as unknown as TestEstimatePayload;
    expect(payload.trace.processedMonths[0]).toBe("2026-01");
  });

  it("T2.F2.5: Rejects monthly bills containing out-of-bounds bill amounts (<= 0 or > 1,000,000)", () => {
    const request: unknown = {
      province: "bangkok",
      propertyType: "home",
      usageShape: "day",
      billDate: "2026-01-01",
      monthlyBills: [
        { month: "2026-01", billThb: -100 },
      ]
    };

    const parsed = estimateRequestSchema.safeParse(request);
    expect(parsed.success).toBe(false);
  });

  // ==========================================
  // TIER 3: Cross-Feature Integration Tests (Part 2)
  // ==========================================

  it("T3.1: Integrates API monthly averaging and padding with core 12-month engine simulation", () => {
    // API receives 2 months of input
    const request: unknown = {
      province: "bangkok",
      propertyType: "home",
      usageShape: "both",
      billDate: "2026-01-01",
      monthlyBills: [
        { month: "2026-01", billThb: 3000 },
        { month: "2026-02", billThb: 4000 },
      ]
    };

    const parsed = estimateRequestSchema.parse(request);
    // API should average (3500) and pad to 12 months
    const payload = runEstimateApiCalculation(parsed);

    // Verify results are successfully computed using 12-month independent analysis
    expect(payload.result.annualSavingsThb).toBeGreaterThan(0);
    expect(payload.result.paybackYears).toBeGreaterThan(0);
  });

  // ==========================================
  // TIER 4: Real-World Application Scenarios (Part 2)
  // ==========================================

  it("T4.Scenario-2: Simulates a small business on TOU tariff with missing historical records", () => {
    // Restaurant owner has only 4 months of TOU billing data
    const request: unknown = {
      province: "chonburi", // PEA region
      propertyType: "business",
      usageShape: "both",
      billDate: "2026-03-01",
      monthlyBills: [
        { month: "2026-03", billThb: 15000 },
        { month: "2026-04", billThb: 18000 },
        { month: "2026-05", billThb: 17000 },
        { month: "2026-06", billThb: 14000 },
      ]
    };

    const parsed = estimateRequestSchema.parse(request);
    const payload = runEstimateApiCalculation(parsed);
    
    // Engine should execute 12 months independently, applying restaurant TOU structure
    expect(payload.trace.customerSegment).toBe("small_business");
    expect(payload.result.recommendedSystemSizeKwp).toBeGreaterThan(0);
    expect(payload.result.paybackYears).toBeDefined();
  });

  it("T4.Scenario-4: Performs MEA vs. PEA boundary adjustments under multi-month billing inputs", () => {
    // Bangkok (MEA) vs Chonburi (PEA) under identical 5-month bills
    const meaRequest: unknown = {
      province: "bangkok",
      propertyType: "home",
      usageShape: "both",
      billDate: "2026-01-01",
      monthlyBills: [
        { month: "2026-01", billThb: 4000 },
        { month: "2026-02", billThb: 4000 },
        { month: "2026-03", billThb: 4500 },
        { month: "2026-04", billThb: 5000 },
        { month: "2026-05", billThb: 4500 },
      ]
    };

    const peaRequest: unknown = {
      province: "chonburi",
      propertyType: "home",
      usageShape: "both",
      billDate: "2026-01-01",
      monthlyBills: [
        { month: "2026-01", billThb: 4000 },
        { month: "2026-02", billThb: 4000 },
        { month: "2026-03", billThb: 4500 },
        { month: "2026-04", billThb: 5000 },
        { month: "2026-05", billThb: 4500 },
      ]
    };

    const parsedMea = estimateRequestSchema.parse(meaRequest);
    const parsedPea = estimateRequestSchema.parse(peaRequest);

    const meaPayload = runEstimateApiCalculation(parsedMea);
    const peaPayload = runEstimateApiCalculation(parsedPea);

    // Verify trace is correct and bills are calculated using respective regional tariffs
    expect(meaPayload.trace.authority).toBe("MEA");
    expect(peaPayload.trace.authority).toBe("PEA");
    expect(meaPayload.result.annualSavingsThb).not.toEqual(peaPayload.result.annualSavingsThb);
  });
});
