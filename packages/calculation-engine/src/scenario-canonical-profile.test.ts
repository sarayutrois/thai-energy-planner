import { describe, expect, it } from "vitest";
import {
  demoNormalTariff,
  demoTouTariff,
} from "@thai-energy-planner/tariff-engine";
import {
  createScenarioInputFromCanonicalLoadProfile,
  runScenarioComparison,
} from "./scenario-engine";

describe("canonical profile scenario adapter", () => {
  it("creates a non-demo scenario input from an appliance profile", () => {
    const input = createScenarioInputFromCanonicalLoadProfile({
      profile: {
        schemaVersion: "1",
        id: "appliance_1",
        name: "Appliance profile",
        source: { kind: "appliance", generatedAt: "2026-07-01T00:00:00.000Z" },
        timezone: "Asia/Bangkok",
        intervalMinutes: 60,
        period: {
          startInclusive: "2026-07-01T00:00:00.000Z",
          endExclusive: "2026-07-01T02:00:00.000Z",
        },
        intervals: [
          {
            timestamp: "2026-07-01T00:00:00.000Z",
            energyKwh: 1,
            averagePowerKw: 1,
            qualityFlags: [],
          },
          {
            timestamp: "2026-07-01T01:00:00.000Z",
            energyKwh: 1,
            averagePowerKw: 1,
            qualityFlags: [],
          },
        ],
        quality: {
          level: "modeled",
          completeness: 1,
          missingIntervalCount: 0,
          duplicateIntervalCount: 0,
          warnings: [],
        },
        assumptions: {},
        calculationVersion: "0.1.0",
      },
      normalTariff: demoNormalTariff,
      touTariff: demoTouTariff,
    });

    const result = runScenarioComparison(input);

    expect(input.dataSource).toBe("appliance");
    expect(input.intervals).toHaveLength(2);
    expect(result.baseline.totalKwh).toBeGreaterThan(0);
  });
});
