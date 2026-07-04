import { describe, expect, it } from "vitest";
import { MonthlyBillInputSchema, TariffSeedMetadataSchema } from "./index";

describe("shared schemas", () => {
  it("accepts a valid Thai monthly bill input", () => {
    const result = MonthlyBillInputSchema.safeParse({
      month: "2026-06",
      energyKwh: 420,
      totalCostThb: 1890,
      authority: "PEA",
      meterMode: "normal"
    });

    expect(result.success).toBe(true);
  });

  it("keeps unverified tariff data in draft metadata shape", () => {
    const result = TariffSeedMetadataSchema.safeParse({
      status: "draft",
      authority: "MEA",
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
      sourceUrl: null,
      verifiedAt: null,
      verifiedBy: null,
      notes: "รอตรวจสอบอัตราจากแหล่งทางการ"
    });

    expect(result.success).toBe(true);
  });
});
