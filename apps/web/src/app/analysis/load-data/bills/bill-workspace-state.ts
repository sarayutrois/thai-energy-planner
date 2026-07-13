import type { MonthlyBillInput } from "@thai-energy-planner/shared-types";
import type { AnalysisAudience } from "@/lib/analysis-start";
import type {
  BillWorkspaceMode,
  StoredBillWorkspace,
} from "@/lib/local-analysis-snapshot";

export const sampleHomeBills: MonthlyBillInput[] = [
  {
    month: "2026-01",
    energyKwh: 465,
    totalCostThb: 2038,
    authority: "PEA",
    meterMode: "normal",
    customerSegment: "residential",
  },
  {
    month: "2026-02",
    energyKwh: 480,
    totalCostThb: 2100,
    authority: "PEA",
    meterMode: "normal",
    customerSegment: "residential",
  },
  {
    month: "2026-03",
    energyKwh: 500,
    totalCostThb: 2182,
    authority: "PEA",
    meterMode: "normal",
    customerSegment: "residential",
  },
  {
    month: "2026-04",
    energyKwh: 530,
    totalCostThb: 2345,
    authority: "PEA",
    meterMode: "normal",
    customerSegment: "residential",
  },
];

export function isBillWorkspaceMode(
  value: unknown,
): value is BillWorkspaceMode {
  return value === "empty" || value === "sample" || value === "user";
}

/** Legacy rows are intentionally not restored: they have no trustworthy source label. */
export function getStoredWorkspaceMode(
  input: Partial<StoredBillWorkspace> | null,
  audience: AnalysisAudience,
): BillWorkspaceMode {
  if (!input || input.audience !== audience || !isBillWorkspaceMode(input.mode))
    return "empty";
  if (!Array.isArray(input.rows) || input.rows.length === 0) return "empty";
  return input.mode;
}

export function isUserWorkspace(
  input: Partial<StoredBillWorkspace> | null,
): input is StoredBillWorkspace {
  return (
    input?.mode === "user" && Array.isArray(input.rows) && input.rows.length > 0
  );
}

export function completedBillInputs(bills: MonthlyBillInput[]) {
  return bills.filter(
    (bill) =>
      /^\d{4}-(0[1-9]|1[0-2])$/.test(bill.month) &&
      bill.energyKwh > 0 &&
      bill.totalCostThb > 0,
  );
}
