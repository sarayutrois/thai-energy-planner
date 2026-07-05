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
    expect(payload.warnings).toContain("No uploaded load intervals were provided; the API used a generated screening profile.");
  });
});
