import type { CanonicalLoadProfile } from "@thai-energy-planner/shared-types";
import {
  createCanonicalLoadProfileFromLoadIntervals,
  type CreateCanonicalLoadProfileOptions,
} from "./load-profile-adapters.js";
import {
  simulateApplianceLoadProfile,
  type ApplianceSimulationInput,
  type ApplianceSimulationResult,
} from "./load-data.js";

export type CreateApplianceLoadProfileInput = ApplianceSimulationInput & {
  id: string;
  name: string;
  calculationVersion: string;
  generatedAt?: string;
  assumptions?: Record<string, unknown>;
};

export type ApplianceLoadProfileResult = {
  profile: CanonicalLoadProfile;
  simulation: ApplianceSimulationResult;
};

export type ApplianceProfileRangeInput = Omit<
  ApplianceSimulationInput,
  "date"
> & {
  startDate: string;
  endDate: string;
};

export type ApplianceProfileRangeResult = {
  intervals: ApplianceSimulationResult["intervals"];
  dayCount: number;
  totalKwh: number;
  averageDailyKwh: number;
  peakKw: number;
  daily: Array<{ date: string; kwh: number }>;
};

/** Builds a canonical, modeled profile from an appliance schedule without UI concerns. */
export function createCanonicalLoadProfileFromAppliances(
  input: CreateApplianceLoadProfileInput,
): ApplianceLoadProfileResult {
  const simulation = simulateApplianceLoadProfile({
    appliances: input.appliances,
    date: input.date,
    ...(input.intervalMinutes === undefined
      ? {}
      : { intervalMinutes: input.intervalMinutes }),
    ...(input.holidays === undefined ? {} : { holidays: input.holidays }),
  });
  const options: CreateCanonicalLoadProfileOptions = {
    id: input.id,
    name: input.name,
    sourceKind: "appliance",
    intervalMinutes: input.intervalMinutes ?? 15,
    calculationVersion: input.calculationVersion,
    sourceReference: input.date,
    assumptions: {
      model: "appliance_schedule",
      date: input.date,
      holidayCount: input.holidays?.length ?? 0,
      ...(input.assumptions ?? {}),
    },
    ...(input.generatedAt === undefined
      ? {}
      : { generatedAt: input.generatedAt }),
  };

  return {
    profile: createCanonicalLoadProfileFromLoadIntervals(
      simulation.intervals,
      options,
    ),
    simulation,
  };
}

/** Simulates inclusive calendar dates so appliance schedules can feed monthly analysis. */
export function simulateApplianceLoadProfileRange(
  input: ApplianceProfileRangeInput,
): ApplianceProfileRangeResult {
  const dates = listInclusiveDates(input.startDate, input.endDate);
  const dailyResults = dates.map((date) =>
    simulateApplianceLoadProfile({
      appliances: input.appliances,
      date,
      ...(input.intervalMinutes === undefined
        ? {}
        : { intervalMinutes: input.intervalMinutes }),
      ...(input.holidays === undefined ? {} : { holidays: input.holidays }),
    }),
  );
  const totalKwh = dailyResults.reduce(
    (sum, result) => sum + result.kwhPerDay,
    0,
  );

  return {
    intervals: dailyResults.flatMap((result) => result.intervals),
    dayCount: dates.length,
    totalKwh,
    averageDailyKwh: dates.length > 0 ? totalKwh / dates.length : 0,
    peakKw: dailyResults.reduce(
      (peak, result) => Math.max(peak, result.peakKw),
      0,
    ),
    daily: dailyResults.map((result, index) => ({
      date: dates[index]!,
      kwh: result.kwhPerDay,
    })),
  };
}

export function createCanonicalLoadProfileFromApplianceRange(
  input: Omit<CreateApplianceLoadProfileInput, "date"> & {
    startDate: string;
    endDate: string;
  },
): ApplianceLoadProfileResult & { range: ApplianceProfileRangeResult } {
  const range = simulateApplianceLoadProfileRange(input);
  const profile = createCanonicalLoadProfileFromLoadIntervals(range.intervals, {
    id: input.id,
    name: input.name,
    sourceKind: "appliance",
    intervalMinutes: input.intervalMinutes ?? 15,
    calculationVersion: input.calculationVersion,
    sourceReference: `${input.startDate}/${input.endDate}`,
    assumptions: {
      model: "appliance_schedule",
      startDate: input.startDate,
      endDate: input.endDate,
      holidayCount: input.holidays?.length ?? 0,
      ...(input.assumptions ?? {}),
    },
    ...(input.generatedAt === undefined
      ? {}
      : { generatedAt: input.generatedAt }),
  });

  return {
    profile,
    simulation: {
      intervals: range.intervals,
      kwhPerDay: range.averageDailyKwh,
      estimatedKwhPerMonth: range.averageDailyKwh * 30,
      peakKw: range.peakKw,
      topAppliance: null,
      applianceShares: [],
    },
    range,
  };
}

function listInclusiveDates(startDate: string, endDate: string): string[] {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start
  ) {
    throw new Error("endDate must be on or after startDate");
  }
  const dates: string[] = [];
  for (
    const current = new Date(start);
    current <= end;
    current.setUTCDate(current.getUTCDate() + 1)
  ) {
    dates.push(current.toISOString().slice(0, 10));
  }
  return dates;
}
