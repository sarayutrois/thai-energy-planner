import { describe, expect, it } from "vitest";
import {
  estimateRequestSchema,
  runEstimateApiCalculation,
} from "./calculation-api";

describe("Yearly Profile Upgrade Challenger - Empirical Verification", () => {
  // =========================================================================
  // 1. Verification of Automatic Monthly Averaging & Padding Logic
  // =========================================================================

  it("Verifies 1-month input: averages and pads remaining 11 months", () => {
    const request = {
      province: "bangkok",
      propertyType: "home",
      usageShape: "day" as const,
      billDate: "2026-01-01",
      monthlyBills: [{ month: "2026-01", billThb: 3000 }],
    };

    const parsed = estimateRequestSchema.parse(request);
    const payload = runEstimateApiCalculation(parsed);

    expect(payload).toBeDefined();
    // Trace should show exactly 12 processed months
    expect(payload.trace.processedMonths).toHaveLength(12);
    expect(payload.trace.filledBills).toHaveLength(12);

    // Remaining 11 months should be padded with the average (3000)
    for (const bill of payload.trace.filledBills) {
      expect(bill.billThb).toBe(3000);
    }

    // A warning must indicate averaging and padding occurred
    expect(payload.warnings.join(" ")).toContain("averaged and padded");
  });

  it("Verifies 3-month input: averages and pads remaining 9 months", () => {
    const request = {
      province: "bangkok",
      propertyType: "home",
      usageShape: "day" as const,
      billDate: "2026-01-01",
      monthlyBills: [
        { month: "2026-01", billThb: 3000 },
        { month: "2026-02", billThb: 3200 },
        { month: "2026-03", billThb: 3400 }, // Average = 3200
      ],
    };

    const parsed = estimateRequestSchema.parse(request);
    const payload = runEstimateApiCalculation(parsed);

    expect(payload).toBeDefined();
    expect(payload.trace.processedMonths).toHaveLength(12);
    expect(payload.trace.filledBills).toHaveLength(12);

    // Initial 3 months should retain original values
    expect(payload.trace.filledBills[0]?.billThb).toBe(3000);
    expect(payload.trace.filledBills[1]?.billThb).toBe(3200);
    expect(payload.trace.filledBills[2]?.billThb).toBe(3400);

    // Remaining 9 months (Apr-Dec) should be padded with average (3200)
    for (let i = 3; i < 12; i++) {
      expect(payload.trace.filledBills[i]?.billThb).toBe(3200);
    }

    expect(payload.warnings.join(" ")).toContain("averaged and padded");
  });

  it("Verifies 6-month input: averages and pads remaining 6 months", () => {
    const request = {
      province: "bangkok",
      propertyType: "home",
      usageShape: "day" as const,
      billDate: "2026-01-01",
      monthlyBills: [
        { month: "2026-01", billThb: 3000 },
        { month: "2026-02", billThb: 3100 },
        { month: "2026-03", billThb: 3200 },
        { month: "2026-04", billThb: 3300 },
        { month: "2026-05", billThb: 3400 },
        { month: "2026-06", billThb: 3500 }, // Average = 3250
      ],
    };

    const parsed = estimateRequestSchema.parse(request);
    const payload = runEstimateApiCalculation(parsed);

    expect(payload).toBeDefined();
    expect(payload.trace.processedMonths).toHaveLength(12);
    expect(payload.trace.filledBills).toHaveLength(12);

    // Check first 6 months
    expect(payload.trace.filledBills[0]?.billThb).toBe(3000);
    expect(payload.trace.filledBills[5]?.billThb).toBe(3500);

    // Remaining 6 months (Jul-Dec) should be padded with average (3250)
    for (let i = 6; i < 12; i++) {
      expect(payload.trace.filledBills[i]?.billThb).toBe(3250);
    }

    expect(payload.warnings.join(" ")).toContain("averaged and padded");
  });

  it("Verifies 12-month input: processes directly without warning", () => {
    const request = {
      province: "bangkok",
      propertyType: "home",
      usageShape: "day" as const,
      billDate: "2026-01-01",
      monthlyBills: [
        { month: "2026-01", billThb: 3000 },
        { month: "2026-02", billThb: 3100 },
        { month: "2026-03", billThb: 3200 },
        { month: "2026-04", billThb: 3300 },
        { month: "2026-05", billThb: 3400 },
        { month: "2026-06", billThb: 3500 },
        { month: "2026-07", billThb: 3600 },
        { month: "2026-08", billThb: 3700 },
        { month: "2026-09", billThb: 3800 },
        { month: "2026-10", billThb: 3900 },
        { month: "2026-11", billThb: 4000 },
        { month: "2026-12", billThb: 4100 },
      ],
    };

    const parsed = estimateRequestSchema.parse(request);
    const payload = runEstimateApiCalculation(parsed);

    expect(payload).toBeDefined();
    expect(payload.trace.processedMonths).toHaveLength(12);
    expect(payload.trace.filledBills).toHaveLength(12);

    // Check all bills correspond to the input
    for (let i = 0; i < 12; i++) {
      expect(payload.trace.filledBills[i]?.billThb).toBe(3000 + i * 100);
    }

    // No averaging warning should be present
    const warningStr = payload.warnings.join(" ");
    expect(warningStr).not.toContain("averaged and padded");
  });

  // =========================================================================
  // 2. Verification of Zod Schema Rejection & Acceptances
  // =========================================================================

  it("Zod Schema: Rejects empty requests (no bill values)", () => {
    const request = {
      province: "bangkok",
      propertyType: "home",
      usageShape: "day" as const,
      billDate: "2026-01-01",
    };

    const parsed = estimateRequestSchema.safeParse(request);
    expect(parsed.success).toBe(false);
  });

  it("Zod Schema: Rejects empty monthlyBills array", () => {
    const request = {
      province: "bangkok",
      propertyType: "home",
      usageShape: "day" as const,
      billDate: "2026-01-01",
      monthlyBills: [],
    };

    const parsed = estimateRequestSchema.safeParse(request);
    expect(parsed.success).toBe(false);
  });

  it("Zod Schema: Rejects duplicate months in monthlyBills", () => {
    const request = {
      province: "bangkok",
      propertyType: "home",
      usageShape: "day" as const,
      billDate: "2026-01-01",
      monthlyBills: [
        { month: "2026-01", billThb: 3000 },
        { month: "2026-01", billThb: 4000 },
      ],
    };

    const parsed = estimateRequestSchema.safeParse(request);
    expect(parsed.success).toBe(false);
  });

  it("Zod Schema: Rejects invalid month format (non-YYYY-MM regex)", () => {
    const formats = ["2026/01", "01-2026", "2026-1", "2026-001"];
    for (const f of formats) {
      const request = {
        province: "bangkok",
        propertyType: "home",
        usageShape: "day" as const,
        billDate: "2026-01-01",
        monthlyBills: [{ month: f, billThb: 3000 }],
      };
      const parsed = estimateRequestSchema.safeParse(request);
      expect(parsed.success).toBe(false);
    }
  });

  it("Zod Schema: Rejects out of bound bill amounts (<= 0 or > 1,000,000)", () => {
    const badAmounts = [-100, 0, 1000001];
    for (const amt of badAmounts) {
      const request = {
        province: "bangkok",
        propertyType: "home",
        usageShape: "day" as const,
        billDate: "2026-01-01",
        monthlyBills: [{ month: "2026-01", billThb: amt }],
      };
      const parsed = estimateRequestSchema.safeParse(request);
      expect(parsed.success).toBe(false);
    }
  });

  it("Zod Schema Vulnerability Challenge: Does it reject out-of-range month numbers like YYYY-13 or YYYY-00?", () => {
    const invalidMonths = ["2026-13", "2026-00"];
    for (const month of invalidMonths) {
      const request = {
        province: "bangkok",
        propertyType: "home",
        usageShape: "day" as const,
        billDate: "2026-01-01",
        monthlyBills: [{ month, billThb: 3000 }],
      };
      const parsed = estimateRequestSchema.safeParse(request);
      expect(parsed.success, `Expected ${month} to be rejected`).toBe(false);
    }
  });
});
