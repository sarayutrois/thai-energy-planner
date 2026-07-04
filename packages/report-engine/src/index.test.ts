import { describe, expect, it } from "vitest";
import { createReportFileName, defaultReportManifest } from "./index";

describe("report foundation", () => {
  it("defines required report sections", () => {
    expect(defaultReportManifest.requiredSections).toContain("tariff_sources");
    expect(defaultReportManifest.formats).toContain("pdf");
  });

  it("creates safe report file names", () => {
    expect(createReportFileName("บ้าน A / EV", "2026-07-03", "pdf")).toBe("บ้าน-A-EV-2026-07-03.pdf");
  });
});
