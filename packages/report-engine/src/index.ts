export type ReportFormat = "pdf" | "csv" | "json" | "print";

export type ReportSection =
  | "input_summary"
  | "analysis_date"
  | "tariff_version"
  | "assumptions"
  | "formula_summary"
  | "results"
  | "recommendations"
  | "sensitivity"
  | "disclaimer"
  | "tariff_sources";

export type ReportManifest = {
  formats: ReportFormat[];
  requiredSections: ReportSection[];
  locale: "th-TH" | "en-US";
};

export const defaultReportManifest: ReportManifest = {
  formats: ["pdf", "csv", "json", "print"],
  requiredSections: [
    "input_summary",
    "analysis_date",
    "tariff_version",
    "assumptions",
    "formula_summary",
    "results",
    "recommendations",
    "sensitivity",
    "disclaimer",
    "tariff_sources",
  ],
  locale: "th-TH",
};

export function createReportFileName(
  projectName: string,
  date: string,
  format: ReportFormat,
) {
  const safeProjectName = projectName
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
  return `${safeProjectName || "thai-energy-planner"}-${date}.${format}`;
}

export * from "./json-exporter.js";
export * from "./csv-exporter.js";
