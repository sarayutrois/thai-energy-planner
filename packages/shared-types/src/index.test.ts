import { describe, expect, it } from "vitest";
import {
  MonthlyBillInputSchema,
  ApplianceInputSchema,
  ScenarioInputSnapshotPayloadSchema,
  ScenarioResultEnvelopeSchema,
  TariffSeedMetadataSchema,
  fromDbCustomerSegment,
  fromDbMeterMode,
  fromDbScenarioKind,
  fromDbTariffStatus,
  toDbCustomerSegment,
  toDbMeterMode,
  toDbScenarioKind,
  toDbTariffStatus,
} from "./index";

describe("shared schemas", () => {
  it("accepts a valid Thai monthly bill input", () => {
    const result = MonthlyBillInputSchema.safeParse({
      month: "2026-06",
      energyKwh: 420,
      totalCostThb: 1890,
      authority: "PEA",
      meterMode: "normal",
    });

    expect(result.success).toBe(true);
  });

  it("accepts air-conditioner BTU metadata while retaining watts for calculation", () => {
    const result = ApplianceInputSchema.safeParse({
      name: "เครื่องปรับอากาศ Inverter 18,000 BTU",
      category: "เครื่องปรับอากาศ",
      applianceKind: "air_conditioner",
      coolingCapacityBtu: 18000,
      compressorType: "inverter",
      powerSource: "nameplate",
      power: 1650,
      powerUnit: "W",
      quantity: 1,
      dutyCycle: 0.65,
      schedule: { startTime: "18:00", endTime: "06:00", daysOfWeek: [1], workingDayOnly: false, holidayOnly: false, seasonalMonths: [] },
      schedules: [
        { startTime: "12:00", endTime: "06:00", daysOfWeek: [0], workingDayOnly: false, holidayOnly: false, seasonalMonths: [] },
        { startTime: "18:00", endTime: "06:00", daysOfWeek: [1], workingDayOnly: false, holidayOnly: false, seasonalMonths: [] },
      ],
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
      notes: "รอตรวจสอบอัตราจากแหล่งทางการ",
    });

    expect(result.success).toBe(true);
  });

  it("maps app enum values to Prisma enum values explicitly", () => {
    expect(toDbCustomerSegment("small_business")).toBe("SMALL_BUSINESS");
    expect(fromDbCustomerSegment("RESIDENTIAL")).toBe("residential");
    expect(toDbMeterMode("tou")).toBe("TOU");
    expect(fromDbMeterMode("NORMAL")).toBe("normal");
    expect(toDbTariffStatus("verified")).toBe("VERIFIED");
    expect(fromDbTariffStatus("PUBLISHED")).toBe("published");
    expect(toDbScenarioKind("solar_battery")).toBe("SOLAR_BATTERY");
    expect(fromDbScenarioKind("CURRENT_NORMAL")).toBeNull();
  });

  it("validates structured scenario snapshot and result envelopes", () => {
    const snapshot = ScenarioInputSnapshotPayloadSchema.safeParse({
      kind: "TOU_LOAD_SHIFT",
      loadProfileSnapshot: { intervalMinutes: 30, rowCount: 48 },
      tariffSnapshot: {
        tariffVersionId: "tariff_1",
        status: "verified",
        authority: "PEA",
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
      },
      assumptions: { shiftKwhPerDay: 2 },
    });
    const result = ScenarioResultEnvelopeSchema.parse({
      rawResult: { monthlySavingsThb: 120.5 },
    });

    expect(snapshot.success).toBe(true);
    expect(result.resultType).toBe("generic");
    expect(result.schemaVersion).toBe("1");
  });
});
