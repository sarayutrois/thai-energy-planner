import { describe, it, expect } from "vitest";
import { exportToJson } from "./json-exporter.js";

describe("JSON Exporter", () => {
  it("JSON export contains tariff snapshot and required info", () => {
    const analysisData = {
      analysisRunId: "run-123",
      createdAt: "2025-01-01T00:00:00.000Z",
      tariffSnapshot: {
        versionId: "v1",
        status: "PUBLISHED",
        effectiveFrom: "2025-01-01",
        source: "PEA"
      },
      inputSnapshot: {},
      scenarioInputs: {},
      scenarioResults: {},
      calculationBreakdown: {},
      recommendations: [],
      assumptions: {}
    };

    const jsonString = exportToJson(analysisData);
    const parsed = JSON.parse(jsonString);

    expect(parsed.engineVersion).toBeDefined();
    expect(parsed.timestamp).toBeDefined();
    expect(parsed.data.analysisRunId).toBe("run-123");
    expect(parsed.data.tariffSnapshot.status).toBe("PUBLISHED");
    // Ensure it's not a live tariff object by checking properties typical of a snapshot
    expect(parsed.data.tariffSnapshot).toHaveProperty("versionId");
  });
});
