import type { AnalysisAudience } from "./analysis-start";
import type { AnalysisDataTrust } from "./analysis-data-trust";

export const billWorkspaceStorageKey = "thai-energy-planner.bill-workspace.v1";
export const billReportStorageKey = "thai-energy-planner.bill-report.v1";
export const localAnalysisReportsStorageKey =
  "thai-energy-planner.analysis-reports.v1";
export const localBillReportId = "local-bill-summary";
export const localAnalysisReportIdPrefix = "local-analysis-";

export type StoredBillRow = {
  id: string;
  month: string;
  energyKwh: string;
  totalCostThb: string;
  authority: "PEA" | "MEA";
  meterMode: "normal" | "tou";
};

export type BillWorkspaceMode = "empty" | "sample" | "user";

export type StoredBillWorkspace = {
  audience: AnalysisAudience;
  mode: BillWorkspaceMode;
  rows: StoredBillRow[];
  updatedAt: string;
  projectId?: string;
};

export type LocalBillReportSnapshot = {
  id: typeof localBillReportId;
  title: string;
  createdAt: string;
  audience: AnalysisAudience;
  monthCount: number;
  totalKwh: number;
  totalCostThb: number;
  averageMonthlyCostThb: number;
  averageCostPerKwh: number | null;
  dataQualityLabel: string;
  dataQualityScore: number;
  highestMonth: {
    month: string;
    energyKwh: number;
    totalCostThb: number;
  } | null;
  recommendations: Array<{
    title: string;
    description: string;
    badge: string;
  }>;
  rows: Array<{
    month: string;
    energyKwh: number;
    totalCostThb: number;
    authority: "PEA" | "MEA";
    meterMode: "normal" | "tou";
  }>;
};

export type LocalAnalysisReportModule =
  "scenario" | "solar" | "battery" | "ev" | "ecosystem";

export type LocalAnalysisReportMetric = {
  label: string;
  value: string;
};

export type LocalAnalysisReportRow = Record<string, string | number | null>;

export type LocalAnalysisReportRecommendation = {
  title: string;
  description: string;
  nextAction?: string;
};

export type LocalAnalysisReportSection = {
  title: string;
  items?: LocalAnalysisReportMetric[] | undefined;
  paragraphs?: string[] | undefined;
};

export type LocalAnalysisReportDraft = {
  module: LocalAnalysisReportModule;
  moduleLabel: string;
  title: string;
  reportTitle?: string | undefined;
  disclaimer?: string | undefined;
  printedAtLabel?: string | undefined;
  summary: string;
  metrics: LocalAnalysisReportMetric[];
  assumptions: LocalAnalysisReportMetric[];
  resultRows: LocalAnalysisReportRow[];
  recommendations: LocalAnalysisReportRecommendation[];
  sections?: LocalAnalysisReportSection[] | undefined;
  limitations?: LocalAnalysisReportRecommendation[] | undefined;
  references?: LocalAnalysisReportMetric[] | undefined;
};

export type LocalAnalysisReportSnapshot = LocalAnalysisReportDraft & {
  id: string;
  createdAt: string;
  projectId?: string | undefined;
  serverGeneratedReportId?: string | undefined;
  serverAnalysisRunId?: string | undefined;
  reportAccessToken?: string | undefined;
  sourcePath: string;
  sourceBillReportId: typeof localBillReportId;
  sourceBill: {
    audience: AnalysisAudience;
    monthCount: number;
    totalKwh: number;
    averageMonthlyCostThb: number;
    dataQualityLabel: string;
  };
  sourceDataset?:
    | {
        fingerprint: string;
        billFingerprint: string;
        profileFingerprint: string | null;
      }
    | undefined;
  sourceProfile?:
    | {
        id: string;
        name: string;
        sourceKind: string;
        isSample?: boolean;
        intervalCount: number;
        qualityLevel: string;
      }
    | undefined;
  billCalibration?:
    | {
        comparedMonthCount: number;
        varianceKwh: number;
        variancePercent: number | null;
        warnings: string[];
      }
    | undefined;
  dataTrust?: AnalysisDataTrust | undefined;
};
