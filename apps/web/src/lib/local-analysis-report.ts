import {
  localAnalysisReportIdPrefix,
  localAnalysisReportsStorageKey,
  localBillReportId,
  type LocalAnalysisReportDraft,
  type LocalAnalysisReportSnapshot,
  type LocalBillReportSnapshot,
} from "@/lib/local-analysis-snapshot";

const maxStoredReports = 12;

export function readLocalAnalysisReports(): LocalAnalysisReportSnapshot[] {
  const raw = window.localStorage.getItem(localAnalysisReportsStorageKey);
  const parsed = raw ? (JSON.parse(raw) as unknown) : [];
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(isLocalAnalysisReportSnapshot)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function readLocalAnalysisReport(
  id: string,
): LocalAnalysisReportSnapshot | null {
  return readLocalAnalysisReports().find((report) => report.id === id) ?? null;
}

export function deleteLocalAnalysisReport(id: string) {
  const report = readLocalAnalysisReport(id);
  if (report?.serverGeneratedReportId) {
    void fetch(`/api/reports/${report.serverGeneratedReportId}`, {
      method: "DELETE",
    }).catch(() => undefined);
  }
  const nextReports = readLocalAnalysisReports().filter(
    (item) => item.id !== id,
  );
  window.localStorage.setItem(
    localAnalysisReportsStorageKey,
    JSON.stringify(nextReports),
  );
}

export async function persistLocalAnalysisReport(
  report: LocalAnalysisReportSnapshot,
) {
  if (report.serverGeneratedReportId) return report;

  const response = await fetch("/api/reports", {
    body: JSON.stringify(report),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) return report;

  const payload = (await response.json()) as {
    generatedReportId?: string | null;
    analysisRunId?: string | null;
  };
  if (!payload.generatedReportId) return report;

  const updatedReport: LocalAnalysisReportSnapshot = {
    ...report,
    serverAnalysisRunId: payload.analysisRunId ?? undefined,
    serverGeneratedReportId: payload.generatedReportId,
  };
  await persistUserSubmission(updatedReport).catch(() => undefined);

  const nextReports = readLocalAnalysisReports().map((item) =>
    item.id === report.id ? updatedReport : item,
  );
  window.localStorage.setItem(
    localAnalysisReportsStorageKey,
    JSON.stringify(nextReports),
  );
  return updatedReport;
}

export function saveLocalAnalysisReport({
  billSnapshot,
  draft,
  sourcePath,
}: {
  billSnapshot: LocalBillReportSnapshot;
  draft: LocalAnalysisReportDraft;
  sourcePath: string;
}) {
  const now = new Date().toISOString();
  const report: LocalAnalysisReportSnapshot = {
    ...draft,
    id: `${localAnalysisReportIdPrefix}${draft.module}-${Date.now()}`,
    createdAt: now,
    sourcePath,
    sourceBillReportId: localBillReportId,
    sourceBill: {
      audience: billSnapshot.audience,
      monthCount: billSnapshot.monthCount,
      totalKwh: billSnapshot.totalKwh,
      averageMonthlyCostThb: billSnapshot.averageMonthlyCostThb,
      dataQualityLabel: billSnapshot.dataQualityLabel,
    },
  };
  const nextReports = [
    report,
    ...readLocalAnalysisReports().filter(
      (existing) => existing.id !== report.id,
    ),
  ].slice(0, maxStoredReports);
  window.localStorage.setItem(
    localAnalysisReportsStorageKey,
    JSON.stringify(nextReports),
  );
  return report;
}

function isLocalAnalysisReportSnapshot(
  value: unknown,
): value is LocalAnalysisReportSnapshot {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<LocalAnalysisReportSnapshot>;
  return (
    typeof report.id === "string" &&
    report.id.startsWith(localAnalysisReportIdPrefix) &&
    typeof report.createdAt === "string" &&
    typeof report.title === "string" &&
    Array.isArray(report.metrics) &&
    Array.isArray(report.assumptions) &&
    Array.isArray(report.resultRows) &&
    Array.isArray(report.recommendations)
  );
}

async function persistUserSubmission(report: LocalAnalysisReportSnapshot) {
  await fetch("/api/submissions", {
    body: JSON.stringify({
      analysisRunId: report.serverAnalysisRunId,
      inputType: `${report.module}_report_snapshot`,
      metadata: {
        localReportId: report.id,
        serverGeneratedReportId: report.serverGeneratedReportId,
        sourceBillReportId: report.sourceBillReportId,
      },
      module: "report",
      payload: report,
      sourcePage: report.sourcePath,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}
