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
