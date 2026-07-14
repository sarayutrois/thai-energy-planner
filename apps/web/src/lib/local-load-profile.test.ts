import { describe, expect, it } from "vitest";
import { canonicalLoadProfileToLoadIntervals } from "@thai-energy-planner/calculation-engine";
import {
  runSolarAnalyzeApiCalculation,
  solarAnalyzeRequestSchema,
} from "./calculation-api";
import { createCanonicalProfileForSnapshot } from "./local-load-profile";

describe("imported canonical load-profile flow", () => {
  it("converts imported intervals into a canonical profile usable by Solar", () => {
    const canonicalProfile = createCanonicalProfileForSnapshot({
      sourceName: "meter-export.csv",
      sourceKind: "csv",
      detectedIntervalMinutes: 60,
      generatedAt: "2026-07-01T00:00:00.000Z",
      rows: [
        { timestamp: "2026-07-01T00:00:00.000Z", energyKwh: 0.5, powerKw: 0.5 },
        {
          timestamp: "2026-07-01T01:00:00.000Z",
          energyKwh: 0.75,
          powerKw: 0.75,
        },
      ],
    });
    const loadIntervals = canonicalLoadProfileToLoadIntervals(canonicalProfile);
    const request = solarAnalyzeRequestSchema.parse({
      province: "bangkok",
      profile: "daytime_home",
      modelMode: "xhigh",
      billDate: "2026-07-01",
      systemSizeKwp: 3,
      capexThb: 126000,
      loadIntervals,
    });
    const result = runSolarAnalyzeApiCalculation(request);

    expect(canonicalProfile.source.kind).toBe("csv");
    expect(canonicalProfile.quality.level).toBe("measured");
    expect(result.trace.inputIntervalCount).toBe(2);
    expect(result.warnings).not.toContain(
      "No uploaded load intervals were provided; the API used a sample screening profile.",
    );
  });

  it("preserves sample provenance in the canonical profile", () => {
    const profile = createCanonicalProfileForSnapshot({
      sourceName: "ชุดทดลอง",
      sourceKind: "appliance",
      isSample: true,
      detectedIntervalMinutes: 60,
      generatedAt: "2026-07-01T00:00:00.000Z",
      rows: [{ timestamp: "2026-07-01T00:00:00.000Z", energyKwh: 0.5 }],
    });

    expect(profile.source.kind).toBe("demo");
    expect(profile.assumptions.isSample).toBe(true);
  });
});
