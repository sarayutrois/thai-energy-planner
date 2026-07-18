import { describe, expect, it } from "vitest";
import {
  localAnalysisReportMatchesProject,
  parseProjectAnalysisReports,
} from "./project-analysis-reports";
import type { LocalAnalysisReportSnapshot } from "./local-analysis-snapshot";

const metadata = {
  id: "local-analysis-solar-123",
  createdAt: "2026-07-17T00:00:00.000Z",
  module: "solar",
  moduleLabel: "Solar",
  title: "รายงาน Solar",
  summary: "สรุปผล",
  metrics: [],
  assumptions: [],
  resultRows: [],
  recommendations: [],
  sourcePath: "/analysis/solar",
  sourceBillReportId: "local-bill-summary",
  sourceBill: {
    audience: "home",
    monthCount: 12,
    totalKwh: 6_000,
    averageMonthlyCostThb: 2_000,
    dataQualityLabel: "ดี",
  },
};

describe("project analysis report restore", () => {
  it("accepts valid owned report records and attaches server ids", () => {
    expect(
      parseProjectAnalysisReports({
        reports: [
          {
            id: "generated-report-1",
            analysisRunId: "analysis-run-1",
            metadata,
          },
        ],
      }),
    ).toEqual([
      {
        ...metadata,
        serverGeneratedReportId: "generated-report-1",
        serverAnalysisRunId: "analysis-run-1",
      },
    ]);
  });

  it("drops malformed database metadata", () => {
    expect(
      parseProjectAnalysisReports({
        reports: [
          { id: "report-1", analysisRunId: "run-1", metadata: {} },
          { metadata },
          {
            id: "report-2",
            analysisRunId: "run-2",
            metadata: { ...metadata, dataTrust: { score: 900 } },
          },
        ],
      }),
    ).toEqual([]);
  });

  it("keeps local reports inside their project context", () => {
    const personal = metadata as LocalAnalysisReportSnapshot;
    const project = {
      ...metadata,
      projectId: "project-alpha",
    } as LocalAnalysisReportSnapshot;

    expect(localAnalysisReportMatchesProject(personal)).toBe(true);
    expect(localAnalysisReportMatchesProject(personal, "project-alpha")).toBe(
      false,
    );
    expect(localAnalysisReportMatchesProject(project, "project-alpha")).toBe(
      true,
    );
    expect(localAnalysisReportMatchesProject(project, "project-bravo")).toBe(
      false,
    );
  });
});
