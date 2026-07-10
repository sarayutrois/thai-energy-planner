import { describe, expect, it } from "vitest";
import {
  createDemoPhase6Input,
  createEvScenarioComparisonInputFromCanonicalLoadProfile,
  runEvScenarioComparison,
} from "./battery-ev-engine";

describe("canonical profile EV adapter", () => {
  it("runs EV comparison from a canonical profile", () => {
    const demo = createDemoPhase6Input("ev_evening");
    const input = createEvScenarioComparisonInputFromCanonicalLoadProfile({
      profile: {
        schemaVersion: "1",
        id: "profile_1",
        name: "Appliance",
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
      solarIntervals: [],
      normalTariff: demo.normalTariff,
      touTariff: demo.touTariff,
      config: demo.evConfig,
      meterMode: "tou",
    });
    const result = runEvScenarioComparison(input);
    expect(input.baseLoadIntervals).toHaveLength(2);
    expect(result.scenarios).toHaveLength(4);
  });
});
