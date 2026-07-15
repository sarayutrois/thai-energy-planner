import { describe, expect, it } from "vitest";
import type { CanonicalLoadProfile } from "@thai-energy-planner/shared-types";
import {
  defaultBatteryMvpSettings,
  evaluateBatteryMvp,
  selectBatteryCapacity,
} from "./battery-mvp";

describe("Battery MVP decision", () => {
  it("selects the next standard size for backup energy", () => {
    expect(selectBatteryCapacity(4)).toBe(5);
    expect(selectBatteryCapacity(5.1)).toBe(10);
    expect(selectBatteryCapacity(23)).toBe(25);
  });

  it("treats backup as a continuity decision instead of claiming payback", () => {
    const settings = {
      ...defaultBatteryMvpSettings(),
      goal: "backup" as const,
      criticalLoadKw: 1,
      backupHours: 4,
    };
    const decision = evaluateBatteryMvp({
      profile: buildProfile(),
      settings,
      hasBills: true,
      hasCalibratedBills: false,
      isSample: false,
    });
    expect(decision.verdict).toBe("consider");
    expect(decision.capacityKwh).toBe(5);
    expect(decision.estimatedBackupHours).toBe(4);
    expect(decision.limitations.join(" ")).toContain("ไฟดับ");
  });

  it("does not recommend an expensive battery only for bill savings", () => {
    const decision = evaluateBatteryMvp({
      profile: buildProfile(),
      settings: {
        ...defaultBatteryMvpSettings(),
        goal: "bill_savings",
        meterMode: "tou",
        batteryCostPerKwhThb: 100_000,
      },
      hasBills: false,
      hasCalibratedBills: false,
      isSample: false,
    });
    expect(decision.verdict).toBe("not_recommended");
    expect(decision.headline).toContain("ยังไม่ควรติด");
    expect(decision.strategy).toBe("TOU_ARBITRAGE");
    expect(decision.limitations.join(" ")).toContain("เปลี่ยนมิเตอร์");
  });
});

function buildProfile(): CanonicalLoadProfile {
  const intervals = Array.from({ length: 24 * 7 }, (_, index) => {
    const timestamp = new Date(Date.UTC(2026, 6, 1, index, 0, 0)).toISOString();
    const hour = index % 24;
    const energyKwh = hour >= 18 && hour < 22 ? 1.2 : 0.35;
    return {
      timestamp,
      energyKwh,
      averagePowerKw: energyKwh,
      qualityFlags: [],
    };
  });
  return {
    schemaVersion: "1",
    id: "battery-test-profile",
    name: "Battery test profile",
    source: {
      kind: "appliance",
      generatedAt: "2026-07-01T00:00:00.000Z",
    },
    timezone: "Asia/Bangkok",
    intervalMinutes: 60,
    period: {
      startInclusive: intervals[0]!.timestamp,
      endExclusive: new Date(Date.UTC(2026, 6, 8)).toISOString(),
    },
    intervals,
    quality: {
      level: "modeled",
      completeness: 1,
      missingIntervalCount: 0,
      duplicateIntervalCount: 0,
      warnings: [],
    },
    assumptions: {},
    calculationVersion: "0.1.0",
  };
}
