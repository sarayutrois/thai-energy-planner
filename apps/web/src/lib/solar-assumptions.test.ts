import { describe, expect, it } from "vitest";
import {
  buildSolarAssumptionQuery,
  getSolarAssumptionDraft,
} from "./solar-assumptions";

describe("Solar assumption draft", () => {
  it("creates labelled defaults without producing a calculated result", () => {
    const draft = getSolarAssumptionDraft({});

    expect(draft.settings.systemSizeKwp).toBe(5);
    expect(draft.settings.capexThb).toBe(210_000);
    expect(draft.settings.defaultedFields).toContain("systemSizeKwp");
    expect(draft.settings.defaultedFields).toContain("capexThb");
    expect(draft).not.toHaveProperty("analysis");
    expect(draft).not.toHaveProperty("result");
  });

  it("keeps explicit user assumptions separate from system defaults", () => {
    const draft = getSolarAssumptionDraft({
      profile: "daytime_shop",
      systemSizeKwp: "12",
      capexThb: "480000",
      province: "Chiang Mai",
      exportEnabled: "false",
    });

    expect(draft.settings.systemSizeKwp).toBe(12);
    expect(draft.settings.capexThb).toBe(480_000);
    expect(draft.settings.province).toBe("Chiang Mai");
    expect(draft.settings.exportEnabled).toBe(false);
    expect(draft.settings.defaultedFields).not.toContain("systemSizeKwp");
    expect(buildSolarAssumptionQuery(draft.settings)).toContain(
      "systemSizeKwp=12",
    );
  });
});
