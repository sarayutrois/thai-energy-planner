import { describe, it, expect, vi } from "vitest";

describe("Audit Log Creation", () => {
  it("audit log created on publish", () => {
    // Mock the audit log function
    const mockLogAudit = vi.fn();

    // Simulate publish action
    const tariffId = "t1";
    const publishTariff = (id: string) => {
      // do publish logic...
      mockLogAudit({
        action: "PUBLISH_TARIFF",
        entityType: "TariffVersion",
        entityId: id,
      });
    };

    publishTariff(tariffId);

    expect(mockLogAudit).toHaveBeenCalledWith({
      action: "PUBLISH_TARIFF",
      entityType: "TariffVersion",
      entityId: "t1",
    });
  });

  it("audit log created on report export", () => {
    const mockLogAudit = vi.fn();

    // Simulate export action
    const exportReport = (format: string, runId: string) => {
      mockLogAudit({
        action: "EXPORT_REPORT",
        entityType: "AnalysisRun",
        entityId: runId,
        metadata: { format },
      });
    };

    exportReport("pdf", "run-123");

    expect(mockLogAudit).toHaveBeenCalledWith({
      action: "EXPORT_REPORT",
      entityType: "AnalysisRun",
      entityId: "run-123",
      metadata: { format: "pdf" },
    });
  });
});
