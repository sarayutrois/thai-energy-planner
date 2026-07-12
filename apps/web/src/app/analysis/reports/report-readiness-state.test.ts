import { describe, expect, it } from "vitest";
import { canExportCurrentReport, getReportReadinessStatus } from "./report-readiness-state";

describe("report readiness", () => {
  it("marks an empty workspace as no data", () => {
    expect(getReportReadinessStatus({ hasBills: false, billMonthCount: 0, hasLoadProfile: false, hasScenario: false, hasSolar: false, hasTariffTrace: false, hasVerifiedResult: false })).toBe("no_data");
  });

  it("marks partial prerequisites as incomplete", () => {
    expect(getReportReadinessStatus({ hasBills: true, billMonthCount: 3, hasLoadProfile: true, hasScenario: false, hasSolar: false, hasTariffTrace: false, hasVerifiedResult: false })).toBe("incomplete");
  });

  it("distinguishes low-confidence and ready reports", () => {
    const complete = { hasBills: true, hasLoadProfile: true, hasScenario: true, hasSolar: true, hasTariffTrace: true, hasVerifiedResult: true };
    expect(getReportReadinessStatus({ ...complete, billMonthCount: 3 })).toBe("low_confidence");
    expect(getReportReadinessStatus({ ...complete, billMonthCount: 6 })).toBe("ready");
  });

  it("keeps export disabled until every prerequisite is present", () => {
    expect(canExportCurrentReport("no_data")).toBe(false);
    expect(canExportCurrentReport("incomplete")).toBe(false);
    expect(canExportCurrentReport("low_confidence")).toBe(true);
    expect(canExportCurrentReport("ready")).toBe(true);
  });
});
