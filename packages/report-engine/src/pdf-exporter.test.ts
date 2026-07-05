import { describe, expect, it } from "vitest";
import { exportToPdf } from "./pdf-exporter";

describe("pdf exporter", () => {
  it("creates a valid PDF byte stream from a report snapshot", () => {
    const bytes = exportToPdf({
      reportTitle: "Preliminary Solar Simulation Report",
      title: "Solar report",
      moduleLabel: "Solar",
      disclaimer: "Screening estimate only.",
      summary: "Demo summary",
      metrics: [{ label: "NPV", value: "1000 THB" }],
      assumptions: [{ label: "Tariff", value: "Demo tariff without verified Ft." }],
      references: [{ label: "Solar yield", value: "Demo monthly specific yield." }],
      sections: [
        {
          title: "Simulation Results",
          items: [{ label: "Estimated annual savings", value: "17000 - 19000 THB/year" }],
          paragraphs: ["Rounded range to avoid over-precision."]
        }
      ],
      recommendations: [{ title: "Check tariff", description: "Use official tariff before deployment." }],
      limitations: [{ title: "Site survey required", description: "Roof and hidden costs are not included." }]
    });
    const text = new TextDecoder().decode(bytes);

    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("Preliminary Solar Simulation Report");
    expect(text).toContain("Disclaimer:");
    expect(text).toContain("Assumptions:");
    expect(text).toContain("References:");
    expect(text).toContain("Limitations & Next Steps:");
    expect(text).toContain("xref");
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
  });
});
