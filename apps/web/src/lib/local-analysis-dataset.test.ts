import { describe, expect, it } from "vitest";
import {
  createAnalysisDatasetFingerprint,
  isCurrentAnalysisDataset,
} from "./local-analysis-dataset";
import type { LocalLoadProfileSnapshot } from "./local-load-profile";
import type { LocalBillReportSnapshot } from "./local-analysis-snapshot";

const billSnapshot: LocalBillReportSnapshot = {
  id: "local-bill-summary",
  title: "รายงานสรุปบิลค่าไฟ",
  createdAt: "2026-01-01T00:00:00.000Z",
  audience: "home",
  monthCount: 2,
  totalKwh: 980,
  totalCostThb: 4282,
  averageMonthlyCostThb: 2141,
  averageCostPerKwh: 4.36,
  dataQualityLabel: "ข้อมูลเริ่มต้น",
  dataQualityScore: 55,
  highestMonth: null,
  recommendations: [],
  rows: [
    {
      month: "2026-02",
      energyKwh: 500,
      totalCostThb: 2200,
      authority: "PEA",
      meterMode: "normal",
    },
    {
      month: "2026-01",
      energyKwh: 480,
      totalCostThb: 2082,
      authority: "PEA",
      meterMode: "normal",
    },
  ],
};

const profileSnapshot = {
  id: "profile-a",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  sourceName: "Load Profile จากเครื่องใช้ไฟฟ้า",
  rowCount: 2,
  totalKwh: 10,
  peakKw: 2,
  detectedIntervalMinutes: 60,
  rows: [
    { timestamp: "2026-01-01T00:00:00.000Z", energyKwh: 4, powerKw: 4 },
    { timestamp: "2026-01-01T01:00:00.000Z", energyKwh: 6, powerKw: 6 },
  ],
} as LocalLoadProfileSnapshot;

describe("analysis dataset fingerprints", () => {
  it("is stable when bill rows are stored in a different order", () => {
    const reordered = {
      ...billSnapshot,
      rows: [...billSnapshot.rows].reverse(),
    };
    expect(
      createAnalysisDatasetFingerprint({ billSnapshot, profileSnapshot })
        .fingerprint,
    ).toBe(
      createAnalysisDatasetFingerprint({
        billSnapshot: reordered,
        profileSnapshot,
      }).fingerprint,
    );
  });

  it("marks results stale when bills or Load Profile change", () => {
    const saved = createAnalysisDatasetFingerprint({
      billSnapshot,
      profileSnapshot,
    });
    const [firstBill, secondBill] = billSnapshot.rows;
    const [firstInterval, secondInterval] = profileSnapshot.rows;
    const changedBill = {
      ...billSnapshot,
      rows: [{ ...firstBill!, totalCostThb: 2300 }, secondBill!],
    };
    const changedProfile = {
      ...profileSnapshot,
      rows: [{ ...firstInterval!, energyKwh: 5 }, secondInterval!],
    };

    expect(
      isCurrentAnalysisDataset(
        saved,
        createAnalysisDatasetFingerprint({ billSnapshot, profileSnapshot }),
      ),
    ).toBe(true);
    expect(
      isCurrentAnalysisDataset(
        saved,
        createAnalysisDatasetFingerprint({
          billSnapshot: changedBill,
          profileSnapshot,
        }),
      ),
    ).toBe(false);
    expect(
      isCurrentAnalysisDataset(
        saved,
        createAnalysisDatasetFingerprint({
          billSnapshot,
          profileSnapshot: changedProfile,
        }),
      ),
    ).toBe(false);
  });

  it("treats legacy reports without a fingerprint as unverified", () => {
    const current = createAnalysisDatasetFingerprint({
      billSnapshot,
      profileSnapshot,
    });
    expect(isCurrentAnalysisDataset(undefined, current)).toBe(false);
  });
});
