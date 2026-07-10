import { describe, expect, it } from "vitest";
import {
  createBatteryAnalysisInputFromCanonicalLoadProfile,
  createDemoBatteryFinancialAssumptions,
  createDemoPhase6Input,
  runBatteryAnalysis,
} from "./battery-ev-engine";

describe("canonical profile battery adapter", () => {
  it("runs battery dispatch from a canonical appliance profile", () => {
    const demo = createDemoPhase6Input("low_export_home");
    const profile = {
      schemaVersion: "1" as const,
      id: "profile_1",
      name: "Appliance",
      source: {
        kind: "appliance" as const,
        generatedAt: "2026-07-01T00:00:00.000Z",
      },
      timezone: "Asia/Bangkok" as const,
      intervalMinutes: 60 as const,
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
        level: "modeled" as const,
        completeness: 1,
        missingIntervalCount: 0,
        duplicateIntervalCount: 0,
        warnings: [],
      },
      assumptions: {},
      calculationVersion: "0.1.0",
    };
    const input = createBatteryAnalysisInputFromCanonicalLoadProfile({
      profile,
      solarIntervals: [],
      normalTariff: demo.normalTariff,
      touTariff: demo.touTariff,
      config: demo.batteryConfig,
      financialAssumptions: createDemoBatteryFinancialAssumptions(
        demo.batteryConfig,
      ),
      meterMode: "tou",
    });
    const result = runBatteryAnalysis(input);
    expect(input.loadIntervals).toHaveLength(2);
    expect(result.dispatch.totalLoadKwh).toBe(2);
  });
});
