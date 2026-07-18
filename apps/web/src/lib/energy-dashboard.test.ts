import { describe, expect, it } from "vitest";
import { buildAverageHourlyLoadProfile } from "./energy-dashboard";

describe("Energy OS dashboard", () => {
  it("normalizes an aggregated hourly profile by represented days", () => {
    const result = buildAverageHourlyLoadProfile({
      totalKwh: 168,
      averageDailyKwh: 24,
      hourlyProfile: [
        { hour: 6, energyKwh: 7, averageKw: 14 },
        { hour: 18, energyKwh: 14, averageKw: 28 },
      ],
    });

    expect(result).toEqual([
      { hour: "06:00", loadKw: 1 },
      { hour: "18:00", loadKw: 2 },
    ]);
  });

  it("keeps a single-day profile stable", () => {
    const result = buildAverageHourlyLoadProfile({
      totalKwh: 0,
      averageDailyKwh: 0,
      hourlyProfile: [{ hour: 0, energyKwh: 0.75, averageKw: 0.75 }],
    });

    expect(result).toEqual([{ hour: "00:00", loadKw: 0.75 }]);
  });
});
