import { describe, expect, it } from "vitest";
import { CanonicalLoadProfileSchema } from "./load-profile";

const validProfile = {
  schemaVersion: "1",
  id: "profile_1",
  name: "July meter data",
  source: { kind: "smart_meter", generatedAt: "2026-07-01T00:00:00.000Z" },
  timezone: "Asia/Bangkok",
  intervalMinutes: 15,
  period: {
    startInclusive: "2026-07-01T00:00:00.000Z",
    endExclusive: "2026-07-01T00:30:00.000Z",
  },
  intervals: [
    {
      timestamp: "2026-07-01T00:00:00.000Z",
      energyKwh: 0.2,
      averagePowerKw: 0.8,
    },
    {
      timestamp: "2026-07-01T00:15:00.000Z",
      energyKwh: 0.25,
      averagePowerKw: 1,
    },
  ],
  quality: {
    level: "measured",
    completeness: 1,
    missingIntervalCount: 0,
    duplicateIntervalCount: 0,
    warnings: [],
  },
  assumptions: {},
  calculationVersion: "0.1.0",
};

describe("CanonicalLoadProfileSchema", () => {
  it("accepts a versioned, ordered profile", () => {
    expect(CanonicalLoadProfileSchema.safeParse(validProfile).success).toBe(
      true,
    );
  });

  it("rejects an invalid period and duplicate interval timestamp", () => {
    const result = CanonicalLoadProfileSchema.safeParse({
      ...validProfile,
      period: {
        startInclusive: "2026-07-01T00:30:00.000Z",
        endExclusive: "2026-07-01T00:30:00.000Z",
      },
      intervals: [validProfile.intervals[0], validProfile.intervals[0]],
    });

    expect(result.success).toBe(false);
  });
});
