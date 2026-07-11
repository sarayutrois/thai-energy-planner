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

  const sortedIntervals = [...intervals].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  const intervalDurationMs = options.intervalMinutes * 60 * 1000;
  const timestamps = new Set<string>();
  let duplicateIntervalCount = 0;
  for (const interval of sortedIntervals) {
    if (timestamps.has(interval.timestamp)) duplicateIntervalCount += 1;
    timestamps.add(interval.timestamp);
  }
  if (duplicateIntervalCount > 0) {
    throw new Error(
      `Load profile contains ${duplicateIntervalCount} duplicate timestamp(s).`,
    );
  }

  const firstTimestamp = new Date(sortedIntervals[0]!.timestamp);
  const lastTimestamp = new Date(
    sortedIntervals[sortedIntervals.length - 1]!.timestamp,
  );
  const expectedIntervalCount =
    Math.round(
      (lastTimestamp.getTime() - firstTimestamp.getTime()) / intervalDurationMs,
    ) + 1;
  const missingIntervalCount = Math.max(
    0,
    expectedIntervalCount - sortedIntervals.length,
  );
  const completeness = sortedIntervals.length / expectedIntervalCount;
  const defaultQuality = {
    level: qualityLevelForSource(options.sourceKind),
    completeness,
    missingIntervalCount,
    duplicateIntervalCount,
    warnings:
      missingIntervalCount > 0
        ? [`${missingIntervalCount} interval(s) are missing in the time range.`]
        : [],
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
    intervals: sortedIntervals.map((interval) => ({
      timestamp: interval.timestamp,
      energyKwh: interval.energyKwh,
      averagePowerKw:
        interval.powerKw ??
        deriveAveragePowerKw(interval.energyKwh, options.intervalMinutes),
      measuredDemandKw: interval.powerKw,
      qualityFlags: [],
    })),
    quality: {
      ...defaultQuality,
      level: options.quality?.level ?? defaultQuality.level,
      warnings: [
        ...defaultQuality.warnings,
        ...(options.quality?.warnings ?? []),
      ],
    },
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
