import { describe, it, expect } from "vitest";
import {
  validateTariffStatusTransition,
  validateTierOverlap,
  validateTouPeriodOverlap,
} from "./versioning.js";

describe("Tariff Versioning Validation", () => {
  it("cannot mutate published tariff (by status transition)", () => {
    // Only RETIRED is allowed from PUBLISHED
    expect(validateTariffStatusTransition("PUBLISHED", "DRAFT")).toBe(false);
    expect(validateTariffStatusTransition("PUBLISHED", "VERIFIED")).toBe(false);
    expect(validateTariffStatusTransition("PUBLISHED", "RETIRED")).toBe(true);
  });

  it("validate tier overlap", () => {
    const validTiers = [
      { fromKwh: 0, toKwh: 150 },
      { fromKwh: 151, toKwh: 400 },
      { fromKwh: 401, toKwh: null },
    ];
    expect(validateTierOverlap(validTiers)).toBe(true);

    const overlappingTiers = [
      { fromKwh: 0, toKwh: 200 },
      { fromKwh: 150, toKwh: 400 },
    ];
    expect(validateTierOverlap(overlappingTiers)).toBe(false);
  });

  it("validate TOU period overlap", () => {
    const validPeriods = [
      { startTime: "09:00", endTime: "22:00", daysOfWeek: [1, 2, 3, 4, 5] },
      { startTime: "22:00", endTime: "09:00", daysOfWeek: [1, 2, 3, 4, 5] },
      { startTime: "00:00", endTime: "24:00", daysOfWeek: [0, 6] },
    ];
    expect(validateTouPeriodOverlap(validPeriods)).toBe(true);

    const overlappingPeriods = [
      { startTime: "09:00", endTime: "22:00", daysOfWeek: [1, 2] },
      { startTime: "12:00", endTime: "24:00", daysOfWeek: [2, 3] },
    ];
    expect(validateTouPeriodOverlap(overlappingPeriods)).toBe(false);
  });
});

import {
  validateFtPeriodOverlap,
  validateTariffForPublish,
} from "./versioning.js";

describe("Tariff Publish Validations", () => {
  it("validate Ft period overlap", () => {
    const validFt = [
      {
        effectiveFrom: new Date("2025-01-01"),
        effectiveTo: new Date("2025-04-30"),
      },
      { effectiveFrom: new Date("2025-05-01"), effectiveTo: null },
    ];
    expect(validateFtPeriodOverlap(validFt)).toBe(true);

    const invalidFt = [
      {
        effectiveFrom: new Date("2025-01-01"),
        effectiveTo: new Date("2025-06-30"),
      },
      { effectiveFrom: new Date("2025-05-01"), effectiveTo: null },
    ];
    expect(validateFtPeriodOverlap(invalidFt)).toBe(false);

    const negativeFtRate = [
      {
        effectiveFrom: new Date("2025-01-01"),
        effectiveTo: null,
        rateThbPerKwh: -0.1,
      },
    ];
    expect(validateFtPeriodOverlap(negativeFtRate)).toBe(false);

    const reversedDates = [
      {
        effectiveFrom: new Date("2025-05-01"),
        effectiveTo: new Date("2025-01-01"),
      },
    ];
    expect(validateFtPeriodOverlap(reversedDates)).toBe(false);
  });

  it("publish valid tariff", () => {
    const validTariff = {
      effectiveFrom: new Date("2025-01-01"),
      sourceUrl: "https://pea.co.th/tariff",
      energyRateTiers: [{ fromKwh: 0, toKwh: null, rateThbPerKwh: 4.0 }],
      serviceChargeThb: 38.22,
      taxRates: [{ ratePercent: 7.0 }],
    };
    expect(validateTariffForPublish(validTariff)).toBe(true);
  });

  it("reject invalid tariff (negative rates)", () => {
    const invalidTariff = {
      effectiveFrom: new Date("2025-01-01"),
      sourceUrl: "https://pea.co.th/tariff",
      energyRateTiers: [{ fromKwh: 0, toKwh: null, rateThbPerKwh: -4.0 }],
    };
    expect(validateTariffForPublish(invalidTariff)).toBe(false);

    const negativeServiceCharge = {
      effectiveFrom: new Date("2025-01-01"),
      sourceUrl: "https://pea.co.th/tariff",
      serviceChargeThb: -38.22,
    };
    expect(validateTariffForPublish(negativeServiceCharge)).toBe(false);
  });

  it("reject invalid tariff (invalid tax rate)", () => {
    const invalidTax = {
      effectiveFrom: new Date("2025-01-01"),
      sourceUrl: "https://pea.co.th/tariff",
      taxRates: [{ ratePercent: 150 }], // > 100%
    };
    expect(validateTariffForPublish(invalidTax)).toBe(false);

    const negativeTax = {
      effectiveFrom: new Date("2025-01-01"),
      sourceUrl: "https://pea.co.th/tariff",
      taxRates: [{ ratePercent: -5 }], // < 0%
    };
    expect(validateTariffForPublish(negativeTax)).toBe(false);
  });

  it("reject invalid tariff (no source)", () => {
    const invalidTariff = {
      effectiveFrom: new Date("2025-01-01"),
    };
    expect(validateTariffForPublish(invalidTariff)).toBe(false);
  });
});
