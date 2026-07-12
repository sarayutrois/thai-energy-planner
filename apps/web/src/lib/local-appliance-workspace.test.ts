import { describe, expect, it } from "vitest";
import { maxStoredAppliances, parseStoredApplianceWorkspace } from "./local-appliance-workspace";

const appliance = {
  name: "เครื่องปรับอากาศ", category: "เครื่องปรับอากาศ", power: 900, powerUnit: "W" as const, quantity: 1, dutyCycle: 0.6,
  schedule: { startTime: "18:00", endTime: "22:00", daysOfWeek: [0, 1, 2, 3, 4, 5, 6], workingDayOnly: false, holidayOnly: false, seasonalMonths: [] },
};
const workspace = { mode: "user", appliances: [appliance], intervalMinutes: 30, startDate: "2026-01-01", endDate: "2026-01-31" };

describe("stored appliance workspace validation", () => {
  it("accepts a labelled appliance workspace", () => {
    expect(parseStoredApplianceWorkspace(workspace)).not.toBeNull();
  });

  it("rejects invalid schedules, ambiguous modes and oversized workspaces", () => {
    expect(parseStoredApplianceWorkspace({ ...workspace, mode: "empty" })).toBeNull();
    expect(parseStoredApplianceWorkspace({ ...workspace, appliances: [] })).toBeNull();
    expect(parseStoredApplianceWorkspace({ ...workspace, appliances: [{ ...appliance, power: 0 }] })).toBeNull();
    expect(parseStoredApplianceWorkspace({ ...workspace, appliances: Array.from({ length: maxStoredAppliances + 1 }, () => appliance) })).toBeNull();
  });
});
