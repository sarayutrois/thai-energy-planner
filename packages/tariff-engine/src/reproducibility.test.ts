import { describe, it, expect } from "vitest";

// Mock implementation of a simple report function to show reproducibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateReport(analysisSnapshot: any, tariffSnapshot: any) {
  // Uses saved snapshot not live tariff
  return {
    analysisId: analysisSnapshot.id,
    tariffUsed: tariffSnapshot.versionLabel,
    totalBill: analysisSnapshot.consumption * tariffSnapshot.rate
  };
}

describe("Reproducibility Strategy", () => {
  it("report uses saved snapshot not live tariff", () => {
    const originalTariff = { versionLabel: "v1", rate: 5 };
    const savedSnapshot = { ...originalTariff };
    const analysis = { id: "a1", consumption: 100 };

    const oldReport = generateReport(analysis, savedSnapshot);

    // Simulate publishing tariff version B
    const updatedTariff = { versionLabel: "v2", rate: 6 };
    
    const newReportWithOldSnapshot = generateReport(analysis, savedSnapshot);

    expect(oldReport.totalBill).toBe(500);
    // The report with the old snapshot should yield the same result despite new tariff existing
    expect(newReportWithOldSnapshot.totalBill).toBe(oldReport.totalBill);
    expect(newReportWithOldSnapshot.totalBill).not.toBe(100 * updatedTariff.rate);
  });
});
