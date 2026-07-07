import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

type CliOptions = {
  from?: Date | undefined;
  out: string;
  to?: Date | undefined;
};

type Row = Record<string, boolean | Date | number | string | null>;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const dateFilter = buildDateFilter(options);

  const [
    analysisRuns,
    reports,
    electricityBills,
    loadProfiles,
    scenarios,
    recommendations,
    auditLogs,
  ] = await Promise.all([
    prisma.analysisRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 5_000,
      where: dateFilter.createdAt,
      select: {
        id: true,
        userId: true,
        siteId: true,
        meterId: true,
        loadProfileId: true,
        tariffVersionId: true,
        name: true,
        engineVersion: true,
        tariffSnapshot: true,
        inputSnapshot: true,
        assumptions: true,
        createdAt: true,
        _count: {
          select: {
            generatedReports: true,
            recommendations: true,
            scenarioComparisons: true,
            scenarios: true,
          },
        },
      },
    }),
    prisma.generatedReport.findMany({
      orderBy: { generatedAt: "desc" },
      take: 5_000,
      where: dateFilter.generatedAt,
      select: {
        id: true,
        analysisRunId: true,
        format: true,
        fileName: true,
        storageUrl: true,
        generatedAt: true,
        metadata: true,
        analysisRun: {
          select: {
            id: true,
            name: true,
            engineVersion: true,
            createdAt: true,
            userId: true,
            siteId: true,
            meterId: true,
          },
        },
      },
    }),
    prisma.electricityBill.findMany({
      orderBy: { billMonth: "desc" },
      take: 10_000,
      select: {
        id: true,
        meterId: true,
        billMonth: true,
        energyKwh: true,
        totalCostThb: true,
        ftThbPerKwh: true,
        serviceCharge: true,
        vatThb: true,
        rawBillData: true,
        createdAt: true,
        updatedAt: true,
        meter: {
          select: {
            id: true,
            name: true,
            siteId: true,
          },
        },
      },
    }),
    prisma.loadProfile.findMany({
      orderBy: { createdAt: "desc" },
      take: 5_000,
      select: {
        id: true,
        meterId: true,
        name: true,
        source: true,
        intervalMinutes: true,
        timezone: true,
        qualityScore: true,
        validationSummary: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            analysisRuns: true,
            importJobs: true,
            intervals: true,
          },
        },
      },
    }),
    prisma.scenario.findMany({
      orderBy: [{ analysisRunId: "asc" }, { sortOrder: "asc" }],
      take: 10_000,
      select: {
        id: true,
        analysisRunId: true,
        kind: true,
        name: true,
        sortOrder: true,
        result: true,
      },
    }),
    prisma.recommendation.findMany({
      orderBy: [{ analysisRunId: "asc" }, { sortOrder: "asc" }],
      take: 10_000,
      select: {
        id: true,
        analysisRunId: true,
        type: true,
        priority: true,
        titleTh: true,
        bodyTh: true,
        reasonTh: true,
        explanation: true,
        confidence: true,
        limitations: true,
        nextAction: true,
        sortOrder: true,
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10_000,
      where: dateFilter.createdAt,
      select: {
        id: true,
        userId: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
      },
    }),
  ]);
  const userSubmissions = await loadUserSubmissions(dateFilter);

  const reportRows = reports.map(reportToRow);
  const metricRows = reports.flatMap(reportMetricsToRows);
  const resultRows = reports.flatMap(reportResultRowsToRows);
  const recommendationRowsFromReports = reports.flatMap(
    reportRecommendationsToRows,
  );

  const workbook = XLSX.utils.book_new();
  appendSheet(workbook, "Summary", [
    { metric: "Exported at", value: new Date().toISOString() },
    { metric: "From", value: options.from?.toISOString() ?? "" },
    { metric: "To", value: options.to?.toISOString() ?? "" },
    { metric: "Analysis runs", value: analysisRuns.length },
    { metric: "Generated reports", value: reports.length },
    { metric: "Report metrics", value: metricRows.length },
    { metric: "Report result rows", value: resultRows.length },
    { metric: "Electricity bills", value: electricityBills.length },
    { metric: "Load profiles", value: loadProfiles.length },
    { metric: "Scenarios", value: scenarios.length },
    {
      metric: "Recommendations",
      value: recommendations.length + recommendationRowsFromReports.length,
    },
    { metric: "User submissions", value: userSubmissions.length },
    { metric: "Audit logs", value: auditLogs.length },
  ]);
  appendSheet(workbook, "AnalysisRuns", analysisRuns.map(analysisRunToRow));
  appendSheet(workbook, "GeneratedReports", reportRows);
  appendSheet(workbook, "ReportMetrics", metricRows);
  appendSheet(workbook, "ReportResultRows", resultRows);
  appendSheet(workbook, "Recommendations", [
    ...recommendations.map(recommendationToRow),
    ...recommendationRowsFromReports,
  ]);
  appendSheet(
    workbook,
    "ElectricityBills",
    electricityBills.map(electricityBillToRow),
  );
  appendSheet(workbook, "LoadProfiles", loadProfiles.map(loadProfileToRow));
  appendSheet(workbook, "Scenarios", scenarios.map(scenarioToRow));
  appendSheet(
    workbook,
    "UserSubmissions",
    userSubmissions.map(userSubmissionToRow),
  );
  appendSheet(workbook, "AuditLogs", auditLogs.map(auditLogToRow));

  fs.mkdirSync(path.dirname(options.out), { recursive: true });
  XLSX.writeFile(workbook, options.out, { compression: true });

  console.log(
    `Exported ${reports.length} reports and ${analysisRuns.length} analysis runs to ${options.out}`,
  );
}

function parseArgs(args: string[]): CliOptions {
  const now = new Date();
  const defaultOut = path.join(
    process.cwd(),
    "exports",
    `user-data-${now.toISOString().slice(0, 10)}.xlsx`,
  );
  const options: CliOptions = { out: defaultOut };

  for (const arg of args) {
    const [key, value = ""] = arg.split("=");
    if (key === "--from") options.from = parseDate(value, "--from");
    if (key === "--to") options.to = parseDate(value, "--to", true);
    if (key === "--out") options.out = path.resolve(value);
  }

  return options;
}

function parseDate(value: string, label: string, endOfDay = false) {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} must be a valid date, for example 2026-07-01`);
  }
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    parsed.setUTCHours(23, 59, 59, 999);
  }
  return parsed;
}

function buildDateFilter(options: CliOptions) {
  const range =
    options.from || options.to
      ? {
          ...(options.from ? { gte: options.from } : {}),
          ...(options.to ? { lte: options.to } : {}),
        }
      : undefined;
  return {
    createdAt: range ? { createdAt: range } : undefined,
    generatedAt: range ? { generatedAt: range } : undefined,
  };
}

async function loadUserSubmissions(
  dateFilter: ReturnType<typeof buildDateFilter>,
) {
  try {
    return await prisma.userSubmission.findMany({
      orderBy: { createdAt: "desc" },
      take: 10_000,
      where: dateFilter.createdAt,
      select: {
        id: true,
        userId: true,
        analysisRunId: true,
        sessionId: true,
        module: true,
        inputType: true,
        sourcePage: true,
        payload: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    console.warn(
      `Skipping UserSubmissions sheet because the table is not available yet.${error instanceof Error && "code" in error ? ` (${String(error.code)})` : ""}`,
    );
    return [];
  }
}

function appendSheet(workbook: XLSX.WorkBook, name: string, rows: Row[]) {
  const safeRows = rows.length > 0 ? rows : [{ note: "No records" }];
  const sheet = XLSX.utils.json_to_sheet(safeRows, { cellDates: true });
  sheet["!cols"] = inferColumnWidths(safeRows);
  XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
}

function inferColumnWidths(rows: Row[]) {
  const keys = Object.keys(rows[0] ?? {});
  return keys.map((key) => {
    const maxLength = rows.reduce((max, row) => {
      const value = row[key];
      return Math.max(max, String(value ?? "").length, key.length);
    }, key.length);
    return { wch: Math.min(Math.max(maxLength + 2, 12), 64) };
  });
}

function analysisRunToRow(
  run: Awaited<ReturnType<typeof prisma.analysisRun.findMany>>[number],
): Row {
  return {
    id: run.id,
    createdAt: run.createdAt,
    name: run.name,
    userId: run.userId,
    siteId: run.siteId,
    meterId: run.meterId,
    loadProfileId: run.loadProfileId,
    tariffVersionId: run.tariffVersionId,
    engineVersion: run.engineVersion,
    generatedReportCount: run._count.generatedReports,
    scenarioCount: run._count.scenarios,
    scenarioComparisonCount: run._count.scenarioComparisons,
    recommendationCount: run._count.recommendations,
    tariffStatus: readPath(run.tariffSnapshot, ["status"]),
    inputSource: readPath(run.inputSnapshot, ["source"]),
    assumptionKeys: Object.keys(asRecord(run.assumptions)).join(", "),
  };
}

function reportToRow(
  report: Awaited<ReturnType<typeof prisma.generatedReport.findMany>>[number],
): Row {
  const metadata = asRecord(report.metadata);
  const sourceBill = asRecord(metadata.sourceBill);
  return {
    id: report.id,
    analysisRunId: report.analysisRunId,
    generatedAt: report.generatedAt,
    format: String(report.format),
    fileName: report.fileName,
    storageUrl: report.storageUrl,
    module: stringValue(metadata.module),
    moduleLabel: stringValue(metadata.moduleLabel),
    title: stringValue(metadata.title),
    reportTitle: stringValue(metadata.reportTitle),
    summary: stringValue(metadata.summary),
    sourcePath: stringValue(metadata.sourcePath),
    sourceBillMonthCount: numberValue(sourceBill.monthCount),
    sourceBillTotalKwh: numberValue(sourceBill.totalKwh),
    sourceBillAverageMonthlyCostThb: numberValue(
      sourceBill.averageMonthlyCostThb,
    ),
    analysisRunName: report.analysisRun?.name ?? null,
    analysisRunCreatedAt: report.analysisRun?.createdAt ?? null,
    engineVersion: report.analysisRun?.engineVersion ?? null,
    userId: report.analysisRun?.userId ?? null,
    siteId: report.analysisRun?.siteId ?? null,
    meterId: report.analysisRun?.meterId ?? null,
  };
}

function reportMetricsToRows(
  report: Awaited<ReturnType<typeof prisma.generatedReport.findMany>>[number],
): Row[] {
  const metadata = asRecord(report.metadata);
  return asArray(metadata.metrics).map((metric, index) => {
    const item = asRecord(metric);
    return {
      reportId: report.id,
      analysisRunId: report.analysisRunId,
      generatedAt: report.generatedAt,
      module: stringValue(metadata.module),
      title: stringValue(metadata.title),
      sortOrder: index + 1,
      label: stringValue(item.label),
      value: stringValue(item.value),
    };
  });
}

function reportResultRowsToRows(
  report: Awaited<ReturnType<typeof prisma.generatedReport.findMany>>[number],
): Row[] {
  const metadata = asRecord(report.metadata);
  return asArray(metadata.resultRows).map((result, index) => {
    const item = asRecord(result);
    return {
      reportId: report.id,
      analysisRunId: report.analysisRunId,
      generatedAt: report.generatedAt,
      module: stringValue(metadata.module),
      title: stringValue(metadata.title),
      sortOrder: index + 1,
      ...flattenRecord(item),
    };
  });
}

function reportRecommendationsToRows(
  report: Awaited<ReturnType<typeof prisma.generatedReport.findMany>>[number],
): Row[] {
  const metadata = asRecord(report.metadata);
  return asArray(metadata.recommendations).map((recommendation, index) => {
    const item = asRecord(recommendation);
    return {
      source: "reportMetadata",
      id: `${report.id}:${index + 1}`,
      reportId: report.id,
      analysisRunId: report.analysisRunId,
      generatedAt: report.generatedAt,
      module: stringValue(metadata.module),
      priority: numberValue(item.priority),
      title: stringValue(item.title),
      description: stringValue(item.description),
      explanation: stringValue(item.explanation),
      nextAction: stringValue(item.nextAction),
      confidence: stringValue(item.confidence),
    };
  });
}

function electricityBillToRow(
  bill: Awaited<ReturnType<typeof prisma.electricityBill.findMany>>[number],
): Row {
  return {
    id: bill.id,
    meterId: bill.meterId,
    meterName: bill.meter?.name ?? null,
    siteId: bill.meter?.siteId ?? null,
    billMonth: bill.billMonth,
    energyKwh: decimalToNumber(bill.energyKwh),
    totalCostThb: decimalToNumber(bill.totalCostThb),
    ftThbPerKwh: decimalToNumber(bill.ftThbPerKwh),
    serviceCharge: decimalToNumber(bill.serviceCharge),
    vatThb: decimalToNumber(bill.vatThb),
    createdAt: bill.createdAt,
    updatedAt: bill.updatedAt,
    rawBillData: compactJson(bill.rawBillData),
  };
}

function loadProfileToRow(
  profile: Awaited<ReturnType<typeof prisma.loadProfile.findMany>>[number],
): Row {
  return {
    id: profile.id,
    meterId: profile.meterId,
    name: profile.name,
    source: String(profile.source),
    intervalMinutes: profile.intervalMinutes,
    timezone: profile.timezone,
    qualityScore: profile.qualityScore,
    intervalCount: profile._count.intervals,
    importJobCount: profile._count.importJobs,
    analysisRunCount: profile._count.analysisRuns,
    validationSummary: compactJson(profile.validationSummary),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

function scenarioToRow(
  scenario: Awaited<ReturnType<typeof prisma.scenario.findMany>>[number],
): Row {
  const result = scenario.result;
  return {
    id: scenario.id,
    analysisRunId: scenario.analysisRunId,
    kind: String(scenario.kind),
    name: scenario.name,
    sortOrder: scenario.sortOrder,
    resultType: result?.resultType ?? null,
    engineVersion: result?.engineVersion ?? null,
    totalKwh: decimalToNumber(result?.totalKwh),
    peakKwh: decimalToNumber(result?.peakKwh),
    offPeakKwh: decimalToNumber(result?.offPeakKwh),
    monthlyEstimatedBill: decimalToNumber(result?.monthlyEstimatedBill),
    annualEstimatedBill: decimalToNumber(result?.annualEstimatedBill),
    savingsMonthly: decimalToNumber(result?.savingsMonthly),
    savingsAnnual: decimalToNumber(result?.savingsAnnual),
    paybackMonths: decimalToNumber(result?.paybackMonths),
    rawResult: result ? compactJson(result.rawResult) : null,
  };
}

function recommendationToRow(
  recommendation: Awaited<
    ReturnType<typeof prisma.recommendation.findMany>
  >[number],
): Row {
  return {
    source: "recommendationModel",
    id: recommendation.id,
    reportId: null,
    analysisRunId: recommendation.analysisRunId,
    generatedAt: null,
    module: null,
    priority: recommendation.priority,
    title: recommendation.titleTh,
    description: recommendation.bodyTh,
    explanation: recommendation.explanation,
    reason: recommendation.reasonTh,
    nextAction: recommendation.nextAction,
    confidence: recommendation.confidence,
    limitations: recommendation.limitations.join(" | "),
  };
}

function userSubmissionToRow(
  submission: Awaited<
    ReturnType<typeof prisma.userSubmission.findMany>
  >[number],
): Row {
  const payload = asRecord(submission.payload);
  const metadata = asRecord(submission.metadata);
  return {
    id: submission.id,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
    userId: submission.userId,
    analysisRunId: submission.analysisRunId,
    sessionId: submission.sessionId,
    module: submission.module,
    inputType: submission.inputType,
    sourcePage: submission.sourcePage,
    localReportId: stringValue(metadata.localReportId),
    serverGeneratedReportId: stringValue(metadata.serverGeneratedReportId),
    title: stringValue(payload.title),
    reportModule: stringValue(payload.module),
    payloadSummary: compactJson({
      assumptionsCount: asArray(payload.assumptions).length,
      metricsCount: asArray(payload.metrics).length,
      recommendationsCount: asArray(payload.recommendations).length,
      resultRowsCount: asArray(payload.resultRows).length,
    }),
    payloadJson: compactJson(submission.payload),
  };
}

function auditLogToRow(
  log: Awaited<ReturnType<typeof prisma.auditLog.findMany>>[number],
): Row {
  return {
    id: log.id,
    createdAt: log.createdAt,
    userId: log.userId,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return compactJson(value);
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (
    typeof value === "object" &&
    "toNumber" in value &&
    typeof value.toNumber === "function"
  ) {
    return value.toNumber();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readPath(value: unknown, pathParts: string[]) {
  let current: unknown = value;
  for (const part of pathParts) {
    current = asRecord(current)[part];
  }
  return stringValue(current);
}

function flattenRecord(record: Record<string, unknown>, prefix = ""): Row {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => {
      const nextKey = prefix ? `${prefix}.${key}` : key;
      if (value instanceof Date) return [nextKey, value];
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        return [nextKey, value];
      }
      return [nextKey, compactJson(value)];
    }),
  );
}

function compactJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
