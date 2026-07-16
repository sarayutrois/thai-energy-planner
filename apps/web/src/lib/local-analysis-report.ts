import {
  localAnalysisReportIdPrefix,
  localAnalysisReportsStorageKey,
  localBillReportId,
  type LocalAnalysisReportDraft,
  type LocalAnalysisReportSnapshot,
  type LocalBillReportSnapshot,
} from "@/lib/local-analysis-snapshot";
import { calibrateLoadProfileAgainstBills } from "@thai-energy-planner/calculation-engine";
import { readLocalLoadProfileSnapshot } from "@/lib/local-load-profile";
import { isSampleLocalLoadProfile } from "@/lib/local-load-profile";
import { authenticatedFetch } from "@/lib/auth-fetch";
import {
  createAnalysisDatasetFingerprint,
  isCurrentAnalysisDataset,
  type AnalysisDatasetFingerprint,
} from "@/lib/local-analysis-dataset";
import { readLocalBillReportSnapshot } from "@/lib/local-bill-report";
import { readActiveProject } from "@/lib/active-project";
import {
  isLocalAnalysisReportSnapshot,
  parseProjectAnalysisReports,
} from "./project-analysis-reports";

export { parseProjectAnalysisReports } from "./project-analysis-reports";

const maxStoredReports = 12;

export function readLocalAnalysisReports(): LocalAnalysisReportSnapshot[] {
  let parsed: unknown = [];
  try {
    const raw = window.localStorage.getItem(localAnalysisReportsStorageKey);
    parsed = raw ? (JSON.parse(raw) as unknown) : [];
  } catch {
    return [];
  }
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

export function restoreProjectAnalysisReports(value: unknown) {
  const remoteReports = parseProjectAnalysisReports(value);
  const remoteIds = new Set(remoteReports.map((report) => report.id));
  const nextReports = [
    ...remoteReports,
    ...readLocalAnalysisReports().filter(
      (report) => !remoteIds.has(report.id),
    ),
  ].slice(0, maxStoredReports);
  window.localStorage.setItem(
    localAnalysisReportsStorageKey,
    JSON.stringify(nextReports),
  );
  return { restoredCount: remoteReports.length, reports: nextReports };
}

export function getCurrentAnalysisDataset(): AnalysisDatasetFingerprint | null {
  const billSnapshot = readLocalBillReportSnapshot();
  if (!billSnapshot) return null;
  return createAnalysisDatasetFingerprint({
    billSnapshot,
    profileSnapshot: readLocalLoadProfileSnapshot(),
  });
}

export function isLocalAnalysisReportCurrent(
  report: LocalAnalysisReportSnapshot,
  currentDataset = getCurrentAnalysisDataset(),
) {
  return isCurrentAnalysisDataset(report.sourceDataset, currentDataset);
}

export function deleteLocalAnalysisReport(id: string) {
  const report = readLocalAnalysisReport(id);
  if (report?.serverGeneratedReportId && report.reportAccessToken) {
    void authenticatedFetch(`/api/reports/${report.serverGeneratedReportId}`, {
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

  const response = await authenticatedFetch("/api/reports", {
    body: JSON.stringify({
      ...report,
      projectId: readActiveProject(window.localStorage)?.id,
    }),
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
  const profileSnapshot = readLocalLoadProfileSnapshot();
  const profile = profileSnapshot?.canonicalProfile;
  const calibration = profile
    ? calibrateLoadProfileAgainstBills({
        profile,
        bills: billSnapshot.rows.map((row) => ({
          month: row.month,
          energyKwh: row.energyKwh,
          totalCostThb: row.totalCostThb,
          authority: row.authority,
          meterMode: row.meterMode,
        })),
      })
    : null;
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
    sourceDataset: createAnalysisDatasetFingerprint({
      billSnapshot,
      profileSnapshot: readLocalLoadProfileSnapshot(),
    }),
    reportAccessToken: crypto.randomUUID(),
    ...(profile === undefined
      ? {}
      : {
          sourceProfile: {
            id: profile.id,
            name: profile.name,
            sourceKind: profile.source.kind,
            isSample: isSampleLocalLoadProfile(profileSnapshot),
            intervalCount: profile.intervals.length,
            qualityLevel: profile.quality.level,
          },
          billCalibration: calibration
            ? {
                comparedMonthCount: calibration.comparedMonths.length,
                varianceKwh: calibration.varianceKwh,
                variancePercent: calibration.variancePercent,
                warnings: calibration.warnings,
              }
            : undefined,
        }),
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

async function persistUserSubmission(report: LocalAnalysisReportSnapshot) {
  await authenticatedFetch("/api/submissions", {
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
