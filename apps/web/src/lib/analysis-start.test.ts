import { describe, expect, it } from "vitest";
import { getAnalysisStartContext } from "./analysis-start";

describe("analysis start context copy", () => {
  it("prioritizes the selected interval-data source over bill-first audience copy", () => {
    const context = getAnalysisStartContext(
      { audience: "home", source: "interval" },
      "interval",
    );

    expect(context.focus).toContain("นำเข้าไฟล์");
    expect(context.focus).toContain("จากนั้นค่อยเพิ่มบิล");
    expect(context.focus).not.toContain("เริ่มจากบิล");
  });

  it("keeps bill-first guidance when bills are the selected source", () => {
    const context = getAnalysisStartContext(
      { audience: "home", source: "bills" },
      "interval",
    );

    expect(context.focus).toContain("เริ่มจากบิล");
  });
});
