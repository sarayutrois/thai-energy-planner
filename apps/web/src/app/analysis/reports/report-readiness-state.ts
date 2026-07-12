export type ReportReadinessInput = {
  hasBills: boolean;
  billMonthCount: number;
  hasLoadProfile: boolean;
  hasScenario: boolean;
  hasSolar: boolean;
  hasTariffTrace: boolean;
  hasVerifiedResult: boolean;
};

export type ReportReadinessStatus = "no_data" | "incomplete" | "low_confidence" | "ready";

export function getReportReadinessStatus(input: ReportReadinessInput): ReportReadinessStatus {
  if (!input.hasBills && !input.hasLoadProfile && !input.hasVerifiedResult) return "no_data";
  if (!input.hasBills || !input.hasLoadProfile || !input.hasScenario || !input.hasSolar || !input.hasTariffTrace || !input.hasVerifiedResult) return "incomplete";
  return input.billMonthCount < 6 ? "low_confidence" : "ready";
}

export function canExportCurrentReport(status: ReportReadinessStatus) {
  return status === "ready" || status === "low_confidence";
}
