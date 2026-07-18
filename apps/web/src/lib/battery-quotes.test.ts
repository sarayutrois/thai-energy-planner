import { describe, expect, it } from "vitest";
import type { BatteryMvpDecision } from "./battery-mvp";
import {
  buildBatteryInstallerRequirements,
  compareBatteryVendorQuotes,
  createEmptyBatteryVendorQuote,
  type BatteryVendorQuote,
} from "./battery-quotes";

const requirements = {
  minimumUsableCapacityKwh: 8,
  minimumContinuousPowerKw: 5,
  backupRequired: true,
  minimumRoundTripEfficiencyPercent: 85,
  minimumWarrantyYears: 5,
  referenceBudgetLowThb: 250_000,
  referenceBudgetHighThb: 350_000,
  strategyLabel: "Backup",
};

function quote(values: Partial<BatteryVendorQuote>): BatteryVendorQuote {
  return {
    ...createEmptyBatteryVendorQuote(values.id ?? "quote"),
    vendor: "ผู้ติดตั้งทดสอบ",
    model: "Battery X",
    quotedPriceThb: 300_000,
    usableCapacityKwh: 10,
    continuousPowerKw: 5,
    roundTripEfficiencyPercent: 90,
    warrantyYears: 10,
    warrantedCycles: 6_000,
    supportsBackup: true,
    ...values,
  };
}

describe("Battery quote comparison", () => {
  it("builds installer requirements from the selected decision", () => {
    const result = buildBatteryInstallerRequirements({
      usableCapacityKwh: 8,
      dischargePowerKw: 5,
      strategy: "BACKUP_RESERVE",
      strategyLabel: "Backup — กันพลังงานไว้เวลาไฟดับ",
      budgetLowThb: 250_000,
      budgetHighThb: 350_000,
    } as BatteryMvpDecision);

    expect(result).toMatchObject({
      minimumUsableCapacityKwh: 8,
      minimumContinuousPowerKw: 5,
      backupRequired: true,
      minimumRoundTripEfficiencyPercent: 85,
      minimumWarrantyYears: 5,
    });
  });

  it("puts technically acceptable quotes ahead of a cheaper undersized quote", () => {
    const result = compareBatteryVendorQuotes(requirements, [
      quote({ id: "cheap", quotedPriceThb: 180_000, usableCapacityKwh: 5 }),
      quote({ id: "valid", quotedPriceThb: 320_000 }),
    ]);

    expect(result.bestQuoteId).toBe("valid");
    expect(result.quotes.find((item) => item.id === "valid")?.rank).toBe(1);
    expect(result.quotes.find((item) => item.id === "cheap")).toMatchObject({
      status: "fail",
      rank: 2,
    });
  });

  it("requires backup capability when the selected system is for backup", () => {
    const result = compareBatteryVendorQuotes(requirements, [
      quote({ id: "no-backup", supportsBackup: false }),
    ]);

    expect(result.passingCount).toBe(0);
    expect(result.quotes[0]?.failures.join(" ")).toContain("ไฟดับ");
  });

  it("calculates normalized price and warranted throughput", () => {
    const result = compareBatteryVendorQuotes(requirements, [
      quote({ id: "valid" }),
    ]);

    expect(result.quotes[0]).toMatchObject({
      costPerUsableKwhThb: 30_000,
      warrantedThroughputKwh: 60_000,
      costPerWarrantedKwhThb: 5,
      priceDeltaFromBudgetHighThb: -50_000,
    });
  });

  it("does not rank an incomplete quote", () => {
    const result = compareBatteryVendorQuotes(requirements, [
      createEmptyBatteryVendorQuote("draft"),
    ]);

    expect(result).toMatchObject({
      completeCount: 0,
      passingCount: 0,
      bestQuoteId: null,
    });
    expect(result.quotes[0]).toMatchObject({
      status: "incomplete",
      rank: null,
    });
  });
});
