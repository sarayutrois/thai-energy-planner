import {
  localAnalysisReportIdPrefix,
  type LocalAnalysisReportSnapshot,
} from "./local-analysis-snapshot";

const maxProjectReports = 12;

type ProjectReportRecord = {
  id: string;
  analysisRunId: string;
  metadata: LocalAnalysisReportSnapshot;
};

export function parseProjectAnalysisReports(
  value: unknown,
): LocalAnalysisReportSnapshot[] {
  if (!value || typeof value !== "object") return [];
  const records = (value as { reports?: unknown }).reports;
  if (!Array.isArray(records)) return [];

  const restored: LocalAnalysisReportSnapshot[] = [];
  for (const value of records.slice(0, maxProjectReports)) {
    if (!value || typeof value !== "object") continue;
    const record = value as Partial<ProjectReportRecord>;
    if (
      typeof record.id !== "string" ||
      typeof record.analysisRunId !== "string" ||
      !isLocalAnalysisReportSnapshot(record.metadata)
    ) {
      continue;
    }
    restored.push({
      ...record.metadata,
      serverGeneratedReportId: record.id,
      serverAnalysisRunId: record.analysisRunId,
    });
  }
  return restored.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function localAnalysisReportMatchesProject(
  report: LocalAnalysisReportSnapshot,
  projectId?: string,
) {
  return projectId
    ? report.projectId === projectId
    : report.projectId === undefined;
}

export function isLocalAnalysisReportSnapshot(
  value: unknown,
): value is LocalAnalysisReportSnapshot {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<LocalAnalysisReportSnapshot>;
  const sourceBill = report.sourceBill;
  return (
    typeof report.id === "string" &&
    report.id.startsWith(localAnalysisReportIdPrefix) &&
    typeof report.createdAt === "string" &&
    Number.isFinite(Date.parse(report.createdAt)) &&
    (report.projectId === undefined ||
      /^[a-z0-9_-]{8,160}$/i.test(report.projectId)) &&
    ["scenario", "solar", "battery", "ev", "ecosystem"].includes(
      report.module ?? "",
    ) &&
    typeof report.moduleLabel === "string" &&
    typeof report.title === "string" &&
    typeof report.summary === "string" &&
    typeof report.sourcePath === "string" &&
    report.sourceBillReportId === "local-bill-summary" &&
    isSourceBill(sourceBill) &&
    isMetricArray(report.metrics) &&
    isMetricArray(report.assumptions) &&
    (report.dataTrust === undefined || isDataTrust(report.dataTrust)) &&
    Array.isArray(report.resultRows) &&
    report.resultRows.every(isRecord) &&
    Array.isArray(report.recommendations) &&
    report.recommendations.every(
      (item) =>
        isRecord(item) &&
        typeof item.title === "string" &&
        typeof item.description === "string",
    )
  );
}

function isDataTrust(value: unknown) {
  if (!isRecord(value)) return false;
  return (
    typeof value.score === "number" &&
    value.score >= 0 &&
    value.score <= 100 &&
    ["low", "medium", "high"].includes(String(value.level)) &&
    typeof value.label === "string" &&
    typeof value.summary === "string" &&
    typeof value.nextAction === "string" &&
    Array.isArray(value.issues) &&
    value.issues.every(
      (issue) =>
        isRecord(issue) &&
        typeof issue.code === "string" &&
        ["info", "warning", "critical"].includes(String(issue.severity)) &&
        typeof issue.title === "string" &&
        typeof issue.detail === "string" &&
        typeof issue.action === "string",
    )
  );
}

function isSourceBill(
  value: LocalAnalysisReportSnapshot["sourceBill"] | undefined,
) {
  return (
    isRecord(value) &&
    ["home", "shop", "business"].includes(String(value.audience)) &&
    typeof value.monthCount === "number" &&
    typeof value.totalKwh === "number" &&
    typeof value.averageMonthlyCostThb === "number" &&
    typeof value.dataQualityLabel === "string"
  );
}

function isMetricArray(value: unknown) {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.label === "string" &&
        typeof item.value === "string",
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
