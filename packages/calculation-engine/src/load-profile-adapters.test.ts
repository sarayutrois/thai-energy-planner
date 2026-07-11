import { describe, expect, it } from "vitest";
import {
  canonicalLoadProfileToLoadIntervals,
  createCanonicalLoadProfileFromLoadIntervals,
} from "./load-profile-adapters";

describe("load profile adapters", () => {
  it("creates the canonical profile and derives average power from interval energy", () => {
    const profile = createCanonicalLoadProfileFromLoadIntervals(
      [
        { timestamp: "2026-07-01T00:00:00.000Z", energyKwh: 0.25 },
        { timestamp: "2026-07-01T00:15:00.000Z", energyKwh: 0.5, powerKw: 2 },
      ],
      {
        id: "profile_1",
        name: "Imported meter data",
        sourceKind: "csv",
        intervalMinutes: 15,
        calculationVersion: "0.1.0",
        generatedAt: "2026-07-01T01:00:00.000Z",
      },
    );

    expect(profile.period.endExclusive).toBe("2026-07-01T00:30:00.000Z");
    expect(profile.quality.level).toBe("measured");
    expect(profile.intervals[0]!.averagePowerKw).toBe(1);
    expect(profile.intervals[1]!.measuredDemandKw).toBe(2);
  });

  it("returns intervals accepted by existing calculation engines", () => {
    const profile = createCanonicalLoadProfileFromLoadIntervals(
      [{ timestamp: "2026-07-01T00:00:00.000Z", energyKwh: 1, powerKw: 4 }],
      {
        id: "profile_1",
        name: "Appliance model",
        sourceKind: "appliance",
        intervalMinutes: 15,
        calculationVersion: "0.1.0",
      },
    );

    expect(canonicalLoadProfileToLoadIntervals(profile)).toEqual([
      { timestamp: "2026-07-01T00:00:00.000Z", energyKwh: 1, powerKw: 4 },
    ]);
  });

  it("calculates completeness from missing intervals", () => {
    const profile = createCanonicalLoadProfileFromLoadIntervals(
      [
        { timestamp: "2026-07-01T00:00:00.000Z", energyKwh: 1 },
        { timestamp: "2026-07-01T02:00:00.000Z", energyKwh: 1 },
      ],
      {
        id: "profile_missing",
        name: "Missing interval",
        sourceKind: "csv",
        intervalMinutes: 60,
        calculationVersion: "0.1.0",
      },
    );

    expect(profile.quality.completeness).toBeCloseTo(2 / 3);
    expect(profile.quality.missingIntervalCount).toBe(1);
  });
});
