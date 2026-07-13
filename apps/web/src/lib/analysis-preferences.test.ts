import { describe, expect, it } from "vitest";
import { analysisGoalGuidance } from "./analysis-preferences";

describe("analysis goal guidance", () => {
  it("routes every goal to its intended primary analysis without changing calculations", () => {
    expect(analysisGoalGuidance.save).toMatchObject({
      primaryHref: "/analysis/load-data/dashboard",
      preferredReportModule: "scenario",
    });
    expect(analysisGoalGuidance.tou).toMatchObject({
      primaryHref: "/analysis/scenarios",
      preferredReportModule: "scenario",
    });
    expect(analysisGoalGuidance.solar).toMatchObject({
      primaryHref: "/analysis/solar",
      preferredReportModule: "solar",
    });
    expect(analysisGoalGuidance.understand).toMatchObject({
      primaryHref: "/analysis/load-data/dashboard",
      preferredReportModule: null,
    });
  });

  it("provides a distinct action and focus for every goal", () => {
    const guidance = Object.values(analysisGoalGuidance);
    expect(new Set(guidance.map((item) => item.primaryAction)).size).toBe(4);
    expect(new Set(guidance.map((item) => item.focus)).size).toBe(4);
  });
});
