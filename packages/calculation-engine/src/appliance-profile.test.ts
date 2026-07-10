import { describe, expect, it } from "vitest";
import { ApplianceScheduleInputSchema } from "@thai-energy-planner/shared-types";
import {
  createCanonicalLoadProfileFromApplianceRange,
  createCanonicalLoadProfileFromAppliances,
  simulateApplianceLoadProfileRange,
  simulateApplianceLoadProfile,
} from "./index";

const weekdayAppliance = {
  name: "Office air conditioner",
  category: "air_conditioner",
  power: 1,
  powerUnit: "kW" as const,
  quantity: 1,
  dutyCycle: 1,
  schedule: {
    startTime: "09:00",
    endTime: "10:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    workingDayOnly: true,
    holidayOnly: false,
    seasonalMonths: [],
  },
};

describe("appliance load profiles", () => {
  it("rejects a schedule that is both working-day-only and holiday-only", () => {
    expect(
      ApplianceScheduleInputSchema.safeParse({
        ...weekdayAppliance.schedule,
        holidayOnly: true,
      }).success,
    ).toBe(false);
  });

  it("honors working days and declared holidays", () => {
    const weekday = simulateApplianceLoadProfile({
      appliances: [weekdayAppliance],
      date: "2026-07-06",
      intervalMinutes: 60,
    });
    const holiday = simulateApplianceLoadProfile({
      appliances: [weekdayAppliance],
      date: "2026-07-06",
      intervalMinutes: 60,
      holidays: ["2026-07-06"],
    });

    expect(weekday.kwhPerDay).toBe(1);
    expect(holiday.kwhPerDay).toBe(0);
  });

  it("uses the schedule start date for cross-midnight schedules", () => {
    const result = simulateApplianceLoadProfile({
      appliances: [
        {
          ...weekdayAppliance,
          schedule: {
            ...weekdayAppliance.schedule,
            startTime: "23:00",
            endTime: "02:00",
            daysOfWeek: [1],
          },
        },
      ],
      date: "2026-07-07",
      intervalMinutes: 60,
    });

    expect(result.kwhPerDay).toBe(2);
  });

  it("creates a canonical modeled profile from appliance intervals", () => {
    const result = createCanonicalLoadProfileFromAppliances({
      id: "appliance_profile_1",
      name: "Office weekday model",
      calculationVersion: "0.1.0",
      generatedAt: "2026-07-06T00:00:00.000Z",
      appliances: [weekdayAppliance],
      date: "2026-07-06",
      intervalMinutes: 60,
    });

    expect(result.profile.source.kind).toBe("appliance");
    expect(result.profile.quality.level).toBe("modeled");
    expect(result.profile.intervals).toHaveLength(24);
    expect(result.profile.intervals[9]!.energyKwh).toBe(1);
  });

  it("simulates inclusive multi-day ranges and creates a canonical range profile", () => {
    const range = simulateApplianceLoadProfileRange({
      appliances: [weekdayAppliance],
      startDate: "2026-07-06",
      endDate: "2026-07-07",
      intervalMinutes: 60,
    });
    const canonical = createCanonicalLoadProfileFromApplianceRange({
      id: "range_1",
      name: "Weekday range",
      calculationVersion: "0.1.0",
      appliances: [weekdayAppliance],
      startDate: "2026-07-06",
      endDate: "2026-07-07",
      intervalMinutes: 60,
    });

    expect(range.dayCount).toBe(2);
    expect(range.totalKwh).toBe(2);
    expect(canonical.profile.intervals).toHaveLength(48);
  });
});
