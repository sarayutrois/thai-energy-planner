import { describe, expect, it } from "vitest";
import {
  estimateRequestSchema,
  runEstimateApiCalculation,
  runSolarAnalyzeApiCalculation,
  solarAnalyzeRequestSchema
} from "./calculation-api";

describe("calculation API helpers", () => {
  it("rejects invalid estimate payloads before they reach the engine", () => {
    const parsed = estimateRequestSchema.safeParse({
      monthlyBillThb: -1,
      province: "bangkok",
      propertyType: "home",
      usageShape: "day"
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects empty uploaded solar load intervals", () => {
    const parsed = solarAnalyzeRequestSchema.safeParse({
      province: "bangkok",
      profile: "daytime_home",
      modelMode: "xhigh",
      billDate: "2026-07-01",
      loadIntervals: []
    });

    expect(parsed.success).toBe(false);
  });

  it("runs an estimate with official tariff trace metadata", () => {
    const request = estimateRequestSchema.parse({
      monthlyBillThb: 3500,
      province: "bangkok",
      propertyType: "home",
      usageShape: "day",
      billDate: "2026-07-01"
    });
    const payload = runEstimateApiCalculation(request);

    expect(payload.trace.authority).toBe("MEA");
    expect(payload.trace.customerSegment).toBe("residential");
    expect(payload.trace.tariffVersionIds.every((id) => id.includes("mea-"))).toBe(true);
    expect(payload.result.estimatedMonthlyKwh).toBeGreaterThan(0);
    expect(payload.result.annualSavingsThb).toBeGreaterThan(0);
  });

  it("warns when a factory request uses the small-business screening scope", () => {
    const request = estimateRequestSchema.parse({
      monthlyBillThb: 12000,
      province: "chonburi",
      propertyType: "factory",
      usageShape: "both",
      billDate: "2026-07-01"
    });
    const payload = runEstimateApiCalculation(request);

    expect(payload.trace.authority).toBe("PEA");
    expect(payload.trace.customerSegment).toBe("small_business");
    expect(payload.warnings.join(" ")).toContain("Factory");
  });

  it("runs solar analysis through official tariffs", () => {
    const request = solarAnalyzeRequestSchema.parse({
      province: "bangkok",
      profile: "daytime_home",
      modelMode: "xhigh",
      billDate: "2026-07-01",
      systemSizeKwp: 3,
      capexThb: 126000
    });
    const payload = runSolarAnalyzeApiCalculation(request);

    expect(payload.trace.authority).toBe("MEA");
    expect(payload.trace.customerSegment).toBe("residential");
    expect(payload.trace.tariffVersionIds.every((id) => id.includes("mea-"))).toBe(true);
    expect(payload.analysis.billComparison.bestWithoutSolar.bill.tariffStatus).toBe("published");
    expect(payload.warnings).toContain("No uploaded load intervals were provided; the API used a sample screening profile.");
  });

  it("uses uploaded load intervals when provided to solar analysis", () => {
    const request = solarAnalyzeRequestSchema.parse({
      province: "bangkok",
      profile: "daytime_home",
      modelMode: "xhigh",
      billDate: "2026-07-01",
      systemSizeKwp: 3,
      loadIntervals: [
        { timestamp: "2026-07-01T09:00:00+07:00", energyKwh: 1, powerKw: 2 },
        { timestamp: "2026-07-01T09:30:00+07:00", energyKwh: 1.2, powerKw: 2.4 },
        { timestamp: "2026-07-01T10:00:00+07:00", energyKwh: 1.4, powerKw: 2.8 },
        { timestamp: "2026-07-01T10:30:00+07:00", energyKwh: 1.2, powerKw: 2.4 }
      ]
    });
    const payload = runSolarAnalyzeApiCalculation(request);

    expect(payload.trace.inputIntervalCount).toBe(4);
    expect(payload.warnings).toEqual([]);
    expect(payload.analysis.selfConsumption.totalLoadKwh).toBeCloseTo(146, 6);
  });
});
