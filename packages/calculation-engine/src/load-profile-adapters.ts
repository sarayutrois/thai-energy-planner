import {
  CanonicalLoadProfileSchema,
  type CanonicalLoadProfile,
  type LoadIntervalInput,
  type LoadProfileIntervalMinutes,
  type LoadProfileQualityLevel,
  type LoadProfileSourceKind,
} from "@thai-energy-planner/shared-types";

export type CreateCanonicalLoadProfileOptions = {
  id: string;
  name: string;
  sourceKind: LoadProfileSourceKind;
  intervalMinutes: LoadProfileIntervalMinutes;
  calculationVersion: string;
  generatedAt?: string;
  sourceReference?: string;
  assumptions?: Record<string, unknown>;
  quality?: Partial<CanonicalLoadProfile["quality"]>;
};

function qualityLevelForSource(
  sourceKind: LoadProfileSourceKind,
): LoadProfileQualityLevel {
  if (["smart_meter", "csv", "xlsx"].includes(sourceKind)) {
    return "measured";
  }
  if (sourceKind === "appliance") {
    return "modeled";
  }
  return "estimated";
}

function deriveAveragePowerKw(
  energyKwh: number,
  intervalMinutes: number,
): number {
  return energyKwh / (intervalMinutes / 60);
}

/**
 * Converts the legacy interval shape consumed by the existing calculation
 * engines into the versioned profile shape used for new persistence and flows.
 */
export function createCanonicalLoadProfileFromLoadIntervals(
  intervals: LoadIntervalInput[],
  options: CreateCanonicalLoadProfileOptions,
): CanonicalLoadProfile {
  if (intervals.length === 0) {
    throw new Error("At least one load interval is required");
  }

  const intervalDurationMs = options.intervalMinutes * 60 * 1000;
  const firstTimestamp = new Date(intervals[0]!.timestamp);
  const lastTimestamp = new Date(intervals[intervals.length - 1]!.timestamp);
  const defaultQuality = {
    level: qualityLevelForSource(options.sourceKind),
    completeness: 1,
    missingIntervalCount: 0,
    duplicateIntervalCount: 0,
    warnings: [],
  };

  return CanonicalLoadProfileSchema.parse({
    schemaVersion: "1",
    id: options.id,
    name: options.name,
    source: {
      kind: options.sourceKind,
      reference: options.sourceReference,
      generatedAt: options.generatedAt ?? new Date().toISOString(),
    },
    timezone: "Asia/Bangkok",
    intervalMinutes: options.intervalMinutes,
    period: {
      startInclusive: firstTimestamp.toISOString(),
      endExclusive: new Date(
        lastTimestamp.getTime() + intervalDurationMs,
      ).toISOString(),
    },
    intervals: intervals.map((interval) => ({
      timestamp: interval.timestamp,
      energyKwh: interval.energyKwh,
      averagePowerKw:
        interval.powerKw ??
        deriveAveragePowerKw(interval.energyKwh, options.intervalMinutes),
      measuredDemandKw: interval.powerKw,
      qualityFlags: [],
    })),
    quality: { ...defaultQuality, ...options.quality },
    assumptions: options.assumptions ?? {},
    calculationVersion: options.calculationVersion,
  });
}

/** Keeps existing engines compatible while callers migrate to CanonicalLoadProfile. */
export function canonicalLoadProfileToLoadIntervals(
  profile: CanonicalLoadProfile,
): LoadIntervalInput[] {
  const parsedProfile = CanonicalLoadProfileSchema.parse(profile);

  return parsedProfile.intervals.map((interval) => ({
    timestamp: interval.timestamp,
    energyKwh: interval.energyKwh,
    powerKw: interval.measuredDemandKw ?? interval.averagePowerKw,
  }));
}
