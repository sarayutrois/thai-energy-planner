import type { AnalysisAudience } from "./analysis-start";

export const billWorkspaceStorageKey = "thai-energy-planner.bill-workspace.v1";
export const billReportStorageKey = "thai-energy-planner.bill-report.v1";
export const localBillReportId = "local-bill-summary";

export type StoredBillRow = {
  id: string;
  month: string;
  energyKwh: string;
  totalCostThb: string;
  authority: "PEA" | "MEA";
  meterMode: "normal" | "tou";
};

export type StoredBillWorkspace = {
  audience: AnalysisAudience;
  rows: StoredBillRow[];
  updatedAt: string;
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
  highestMonth:
    | {
        month: string;
        energyKwh: number;
        totalCostThb: number;
      }
    | null;
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
