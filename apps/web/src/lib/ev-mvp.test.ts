import { describe, expect, it } from "vitest";
import type { CanonicalLoadProfile } from "@thai-energy-planner/shared-types";
import {
  defaultEvMvpSettings,
  evaluateEvMvp,
  selectStandardChargerPower,
} from "./ev-mvp";

describe("EV MVP decision", () => {
  it("selects the next standard charger power", () => {
    expect(selectStandardChargerPower(1)).toBe(2.3);
    expect(selectStandardChargerPower(3)).toBe(3.7);
    expect(selectStandardChargerPower(7.5)).toBe(11);
    expect(selectStandardChargerPower(23)).toBe(23);
  });

  it("produces a home-charging plan without claiming vehicle purchase ROI", () => {
    const decision = evaluateEvMvp({
      profile: buildProfile(),
      settings: defaultEvMvpSettings(),
      hasBills: true,
      hasCalibratedBills: false,
      isSample: false,
    });

    expect(decision.chargingComplete).toBe(true);
    expect(decision.monthlyChargingCostThb).toBeGreaterThan(0);
    expect(decision.monthlyEvEnergyKwh).toBeGreaterThan(0);
    expect(decision.dailyChargingHours).toBeGreaterThan(0);
    expect(decision.chargerRecommendationLabel).toContain("ชั่วโมง/วันที่ขับ");
    expect(decision.limitations.join(" ")).toContain("เทียบรถน้ำมัน");
    expect(decision.batteryGuidance).toContain("ไม่จำเป็นต้องมี Battery");
    expect(decision.strategy).not.toBe("SOLAR_SURPLUS");
  });

  it("asks the user to adjust a charging plan that cannot finish", () => {
    const decision = evaluateEvMvp({
      profile: buildProfile(),
      settings: {
        ...defaultEvMvpSettings(),
        dailyDistanceKm: 250,
        vehicleBatteryKwh: 40,
        chargerPowerKw: 2.3,
        arrivalTime: "22:00",
        departureTime: "23:00",
      },
      hasBills: false,
      hasCalibratedBills: false,
      isSample: false,
    });

    expect(decision.verdict).toBe("adjust");
    expect(decision.chargingComplete).toBe(false);
    expect(decision.outsideChargingKwh).toBeGreaterThan(0);
    expect(decision.recommendedChargerPowerKw).toBeGreaterThan(2.3);
  });

  it("can use Solar surplus when the vehicle is home in daytime", () => {
    const decision = evaluateEvMvp({
      profile: buildProfile(),
      settings: {
        ...defaultEvMvpSettings(),
        dailyDistanceKm: 20,
        arrivalTime: "09:00",
        departureTime: "17:00",
        hasSolar: true,
        solarSystemSizeKwp: 8,
      },
      hasBills: true,
      hasCalibratedBills: false,
      isSample: false,
    });

    expect(decision.solarChargingSharePercent).toBeGreaterThan(0);
    expect(decision.batteryGuidance).toContain("ยังไม่ควรเพิ่ม Battery");
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
    id: "ev-test-profile",
    name: "EV test profile",
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
