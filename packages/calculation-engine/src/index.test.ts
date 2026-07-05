import { describe, expect, it } from "vitest";
import {
  calculateSolarROI,
  compareNormalVsTou,
  estimateDataQuality,
  estimateMonthlyKwhFromBill,
  simulateIntervalSavings,
  summarizeMonthlyBills
} from "./index";
import * as XLSX from "xlsx";
import {
  defaultColumnMapping,
  demoAppliances,
  parseCsvLoadProfile,
  parseXlsxLoadProfile,
  simulateApplianceLoadProfile,
  summarizeBills,
  summarizeLoadProfile,
  validateMonthlyBills
} from "./load-data";
import { demoTouTariff } from "@thai-energy-planner/tariff-engine";

const qaManualBills = [
  { month: "2026-01", energyKwh: 420, totalCostThb: 1900 },
  { month: "2026-02", energyKwh: 460, totalCostThb: 2100 },
  { month: "2026-03", energyKwh: 520, totalCostThb: 2450 },
  { month: "2026-04", energyKwh: 610, totalCostThb: 2950 },
  { month: "2026-05", energyKwh: 580, totalCostThb: 2750 }
];

const sampleLoadProfileCsv = [
  "timestamp,energy_kwh",
  "2026-07-01 00:00,0.20",
  "2026-07-01 00:15,0.18",
  "2026-07-01 00:30,0.19",
  "2026-07-01 00:45,0.21",
  "2026-07-01 01:00,0.22",
  "2026-07-01 01:15,0.20",
  "2026-07-01 01:30,0.18",
  "2026-07-01 01:45,0.19",
  "2026-07-01 02:00,0.20",
  "2026-07-01 02:15,0.21"
].join("\n");

const badLoadProfileCsv = [
  "timestamp,energy_kwh",
  "2026-07-01 00:00,0.20",
  "2026-07-01 00:15,0.18",
  "2026-07-01 00:15,0.19",
  "2026-07-01 01:00,-0.21",
  "2026-07-01 01:30,0.22"
].join("\n");

describe("calculation foundation", () => {
  it("summarizes monthly bills with decimal arithmetic", () => {
    const summary = summarizeMonthlyBills([
      { month: "2026-01", energyKwh: 100.1, totalCostThb: 401.25 },
      { month: "2026-02", energyKwh: 200.2, totalCostThb: 802.5 }
    ]);

    expect(summary.totalKwh).toBe(300.3);
    expect(summary.totalCost).toBe(1203.75);
    expect(summary.monthCount).toBe(2);
  });

  it("classifies complete interval data as high quality", () => {
    expect(
      estimateDataQuality({
        source: "interval",
        intervalMonths: 12,
        hasTwelveMonthBills: true
      }).level
    ).toBe("high");
  });

  it("compares official Thai normal and TOU bills from kWh buckets", () => {
    const comparison = compareNormalVsTou({
      authority: "PEA",
      customerSegment: "residential",
      billDate: "2026-07-01",
      energyKwh: 250,
      peakKwh: 140,
      offPeakKwh: 110
    });

    expect(comparison.normalBill.grandTotal).toBe("1042.86");
    expect(comparison.touBill.tariffStatus).toBe("published");
    expect(comparison.cheaperMode).toBe("normal");
  });

  it("estimates monthly kWh from an official Thai normal bill amount", () => {
    const estimatedKwh = estimateMonthlyKwhFromBill({
      authority: "PEA",
      customerSegment: "residential",
      billDate: "2026-07-01",
      energyKwh: 0,
      monthlyBillThb: 1042.86
    });

    expect(estimatedKwh).toBeCloseTo(250, 1);
  });

  it("simulates interval savings by subtracting offset energy before billing", () => {
    const intervals = [
      { timestamp: "2026-07-01T10:00:00+07:00", energyKwh: 10, powerKw: 20 },
      { timestamp: "2026-07-01T10:30:00+07:00", energyKwh: 8, powerKw: 16 },
      { timestamp: "2026-07-01T23:00:00+07:00", energyKwh: 6, powerKw: 12 }
    ];
    const result = simulateIntervalSavings({
      authority: "PEA",
      customerSegment: "small_business",
      billDate: "2026-07-01",
      intervals,
      offsetIntervals: [{ timestamp: "2026-07-01T10:00:00+07:00", energyKwh: 3 }]
    });

    expect(result.totalOffsetKwh).toBe(3);
    expect(result.reducedIntervals[0]?.energyKwh).toBe(7);
    expect(result.bestSavingsThb).toBeGreaterThan(0);
  });

  it("calculates simple solar ROI from annual savings", () => {
    const roi = calculateSolarROI({
      systemCostThb: 210000,
      annualSavingsThb: 30000,
      annualExportRevenueThb: 2000,
      annualOperatingCostThb: 1500
    });

    expect(roi.annualNetBenefitThb).toBe(30500);
    expect(roi.simplePaybackYears).toBe(6.89);
  });
});

describe("phase 3 manual bill validation", () => {
  it("accepts the QA five-month bill set and summarizes exact metrics", () => {
    const validation = validateMonthlyBills(qaManualBills);
    const summary = summarizeBills(validation.bills);

    expect(validation.canSave).toBe(true);
    expect(validation.issues).toEqual([]);
    expect(summary.monthCount).toBe(5);
    expect(summary.totalKwh).toBe(2590);
    expect(summary.totalCostThb).toBe(12150);
    expect(summary.averageCostPerKwh).toBeCloseTo(4.691119691, 9);
    expect(summary.highestMonth?.month).toBe("2026-04");
    expect(summary.lowestMonth?.month).toBe("2026-01");
    expect(summary.monthlyTrend.map((row) => row.month)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05"
    ]);
  });

  it("rejects duplicate months and warns for unusually low total cost", () => {
    const result = validateMonthlyBills([
      { month: "2026-01", energyKwh: 100, totalCostThb: 20, authority: "PEA", meterMode: "normal" },
      { month: "2026-01", energyKwh: 120, totalCostThb: 500, authority: "PEA", meterMode: "normal" }
    ]);

    expect(result.canSave).toBe(false);
    expect(result.issues.some((issue) => issue.code === "duplicate_month")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "unusually_low_total_cost")).toBe(true);
  });

  it("rejects negative kWh and negative total cost while low-cost warnings do not block saving", () => {
    const negative = validateMonthlyBills([
      { month: "2026-01", energyKwh: -1, totalCostThb: 100 },
      { month: "2026-02", energyKwh: 100, totalCostThb: -1 }
    ]);
    const lowCost = validateMonthlyBills([{ month: "2026-03", energyKwh: 100, totalCostThb: 20 }]);

    expect(negative.canSave).toBe(false);
    expect(negative.issues.filter((issue) => issue.severity === "error")).toHaveLength(2);
    expect(lowCost.canSave).toBe(true);
    expect(lowCost.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ severity: "warning", code: "unusually_low_total_cost" })])
    );
  });

  it("summarizes bill trends and highest/lowest month", () => {
    const summary = summarizeBills([
      { month: "2026-01", energyKwh: 100, totalCostThb: 400 },
      { month: "2026-02", energyKwh: 250, totalCostThb: 1000 }
    ]);

    expect(summary.totalKwh).toBe(350);
    expect(summary.highestMonth?.month).toBe("2026-02");
    expect(summary.lowestMonth?.month).toBe("2026-01");
  });
});

describe("phase 3 load profile import", () => {
  it("parses the QA sample CSV with expected interval, totals, and preview", () => {
    const preview = parseCsvLoadProfile(sampleLoadProfileCsv, { mapping: defaultColumnMapping });

    expect(preview.canImport).toBe(true);
    expect(preview.issues).toEqual([]);
    expect(preview.rowCount).toBe(10);
    expect(preview.previewRows).toHaveLength(10);
    expect(preview.detectedIntervalMinutes).toBe(15);
    expect(preview.totalKwh).toBeCloseTo(1.98, 9);
    expect(preview.peakKw).toBeCloseTo(0.88, 9);
    expect(Math.max(...preview.rows.map((row) => row.energyKwh))).toBe(0.22);
    expect(preview.rows[0]?.powerKw).toBeCloseTo(0.8, 9);
  });

  it("parses CSV and detects 60-minute interval", () => {
    const preview = parseCsvLoadProfile(
      [
        "timestamp,energy_kwh,power_kw,meter_id",
        "2026-01-05 00:00,1,1,m1",
        "2026-01-05 01:00,2,2,m1",
        "2026-01-05 02:00,3,3,m1"
      ].join("\n"),
      { mapping: defaultColumnMapping, intervalMinutes: 60 }
    );

    expect(preview.canImport).toBe(true);
    expect(preview.rowCount).toBe(3);
    expect(preview.detectedIntervalMinutes).toBe(60);
    expect(preview.totalKwh).toBe(6);
  });

  it("parses the QA sample XLSX with the same metrics as CSV", () => {
    const worksheet = XLSX.utils.json_to_sheet([
      { timestamp: "2026-07-01 00:00", energy_kwh: 0.2 },
      { timestamp: "2026-07-01 00:15", energy_kwh: 0.18 },
      { timestamp: "2026-07-01 00:30", energy_kwh: 0.19 },
      { timestamp: "2026-07-01 00:45", energy_kwh: 0.21 },
      { timestamp: "2026-07-01 01:00", energy_kwh: 0.22 },
      { timestamp: "2026-07-01 01:15", energy_kwh: 0.2 },
      { timestamp: "2026-07-01 01:30", energy_kwh: 0.18 },
      { timestamp: "2026-07-01 01:45", energy_kwh: 0.19 },
      { timestamp: "2026-07-01 02:00", energy_kwh: 0.2 },
      { timestamp: "2026-07-01 02:15", energy_kwh: 0.21 }
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "load");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const preview = parseXlsxLoadProfile(buffer, { mapping: defaultColumnMapping });

    expect(preview.canImport).toBe(true);
    expect(preview.issues).toEqual([]);
    expect(preview.rowCount).toBe(10);
    expect(preview.detectedIntervalMinutes).toBe(15);
    expect(preview.totalKwh).toBeCloseTo(1.98, 9);
    expect(preview.peakKw).toBeCloseTo(0.88, 9);
  });

  it("parses XLSX files with the same mapping contract", () => {
    const worksheet = XLSX.utils.json_to_sheet([
      { timestamp: "2026-01-05 00:00", energy_kwh: 1 },
      { timestamp: "2026-01-05 01:00", energy_kwh: 1.5 }
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "load");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const preview = parseXlsxLoadProfile(buffer, { mapping: defaultColumnMapping, intervalMinutes: 60 });

    expect(preview.canImport).toBe(true);
    expect(preview.rowCount).toBe(2);
    expect(preview.totalKwh).toBe(2.5);
  });

  it("converts the QA 15-minute power-only fixture to energy", () => {
    const preview = parseCsvLoadProfile(
      [
        "timestamp,power_kw",
        "2026-07-01 00:00,1.0",
        "2026-07-01 00:15,0.8",
        "2026-07-01 00:30,1.2"
      ].join("\n"),
      { mapping: { timestamp: "timestamp", powerKw: "power_kw" }, intervalMinutes: 15 }
    );

    expect(preview.detectedIntervalMinutes).toBe(15);
    expect(preview.rows.map((row) => row.energyKwh)).toEqual([0.25, 0.2, 0.3]);
  });

  it("converts power_kw to energy_kwh when energy is missing", () => {
    const preview = parseCsvLoadProfile(
      ["timestamp,power_kw", "2026-01-05 00:00,4", "2026-01-05 00:30,2"].join("\n"),
      { mapping: { timestamp: "timestamp", powerKw: "power_kw" }, intervalMinutes: 30 }
    );

    expect(preview.rows[0]?.energyKwh).toBe(2);
    expect(preview.totalKwh).toBe(3);
  });

  it("converts the QA 15-minute energy-only fixture to power", () => {
    const preview = parseCsvLoadProfile(
      [
        "timestamp,energy_kwh",
        "2026-07-01 00:00,0.25",
        "2026-07-01 00:15,0.20",
        "2026-07-01 00:30,0.30"
      ].join("\n"),
      { mapping: { timestamp: "timestamp", energyKwh: "energy_kwh" }, intervalMinutes: 15 }
    );

    expect(preview.detectedIntervalMinutes).toBe(15);
    expect(preview.rows.map((row) => row.powerKw)).toEqual([1, 0.8, 1.2]);
  });

  it("converts energy_kwh to power_kw when power is missing", () => {
    const preview = parseCsvLoadProfile(
      ["timestamp,energy_kwh", "2026-01-05 00:00,2", "2026-01-05 00:30,1"].join("\n"),
      { mapping: { timestamp: "timestamp", energyKwh: "energy_kwh" }, intervalMinutes: 30 }
    );

    expect(preview.rows[0]?.powerKw).toBe(4);
    expect(preview.peakKw).toBe(4);
  });

  it("reports the QA bad CSV duplicate, negative, missing timestamps, and blocking errors", () => {
    const preview = parseCsvLoadProfile(badLoadProfileCsv, { mapping: defaultColumnMapping });
    const issueValues = preview.issues.map((issue) => issue.value);

    expect(preview.canImport).toBe(false);
    expect(preview.errorCount).toBeGreaterThan(0);
    expect(preview.warningCount).toBeGreaterThan(0);
    expect(preview.detectedIntervalMinutes).toBe(15);
    expect(preview.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "error", code: "duplicate_timestamp", value: "2026-07-01 00:15" }),
        expect.objectContaining({ severity: "error", code: "negative_energy_kwh", value: "-0.21" }),
        expect.objectContaining({ severity: "warning", code: "irregular_interval" })
      ])
    );
    expect(issueValues).toContain("2026-07-01 00:30");
    expect(issueValues).toContain("2026-07-01 00:45");
  });

  it("detects duplicate timestamp, missing timestamp, and negative values", () => {
    const preview = parseCsvLoadProfile(
      [
        "timestamp,energy_kwh,power_kw",
        "2026-01-05 00:00,1,1",
        "2026-01-05 00:00,1,1",
        "2026-01-05 01:00,1,1",
        "2026-01-05 03:00,-1,-2"
      ].join("\n"),
      { mapping: defaultColumnMapping, intervalMinutes: 60 }
    );

    expect(preview.canImport).toBe(false);
    expect(preview.issues.some((issue) => issue.code === "duplicate_timestamp")).toBe(true);
    expect(preview.issues.some((issue) => issue.code === "negative_energy_kwh")).toBe(true);
    expect(preview.issues.some((issue) => issue.code === "missing_timestamp")).toBe(true);
  });
});

describe("phase 3 appliance builder and load dashboard", () => {
  it("simulates the QA AC and refrigerator fixture with cross-midnight schedules", () => {
    const result = simulateApplianceLoadProfile({
      date: "2026-07-01",
      appliances: [
        {
          name: "Bedroom AC",
          category: "air_conditioner",
          power: 1200,
          powerUnit: "W",
          quantity: 1,
          dutyCycle: 0.7,
          schedule: {
            startTime: "22:00",
            endTime: "06:00",
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
            workingDayOnly: false,
            holidayOnly: false,
            seasonalMonths: []
          }
        },
        {
          name: "Fridge",
          category: "refrigerator",
          power: 150,
          powerUnit: "W",
          quantity: 1,
          dutyCycle: 0.4,
          schedule: {
            startTime: "00:00",
            endTime: "23:59",
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
            workingDayOnly: false,
            holidayOnly: false,
            seasonalMonths: []
          }
        }
      ]
    });

    expect(result.kwhPerDay).toBeCloseTo(8.16, 9);
    expect(result.peakKw).toBeCloseTo(0.9, 9);
    expect(result.topAppliance).toEqual({ name: "Bedroom AC", energyKwh: 6.72 });
    expect(result.applianceShares).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Bedroom AC", energyKwh: 6.72 }),
        expect.objectContaining({ name: "Fridge", energyKwh: 1.44 })
      ])
    );
  });

  it("simulates a normal appliance schedule", () => {
    const result = simulateApplianceLoadProfile({
      appliances: [demoAppliances[1]!],
      date: "2026-01-05"
    });

    expect(result.kwhPerDay).toBe(1.5);
    expect(result.peakKw).toBe(0.3);
  });

  it("simulates an appliance schedule that crosses midnight", () => {
    const result = simulateApplianceLoadProfile({
      appliances: [demoAppliances[0]!],
      date: "2026-01-05"
    });

    expect(result.kwhPerDay).toBe(6.24);
    expect(result.topAppliance?.name).toBe("แอร์ห้องนอน");
  });

  it("summarizes the QA sample dashboard metrics and TOU split via tariff engine periods", () => {
    const preview = parseCsvLoadProfile(sampleLoadProfileCsv, { mapping: defaultColumnMapping });
    const summary = summarizeLoadProfile(preview.rows, { tariffVersion: demoTouTariff });

    expect(summary.totalKwh).toBeCloseTo(1.98, 9);
    expect(summary.averageLoadKw).toBeCloseTo(0.792, 9);
    expect(summary.peakDemandKw).toBeCloseTo(0.88, 9);
    expect(summary.loadFactor).toBeCloseTo(0.9, 9);
    expect(summary.daytimeKwh).toBe(0);
    expect(summary.nighttimeKwh).toBeCloseTo(1.98, 9);
    expect(summary.weekdayKwh).toBeCloseTo(1.98, 9);
    expect(summary.weekendKwh).toBe(0);
    expect(summary.peakPeriodKwh).toBe(0);
    expect(summary.offPeakPeriodKwh).toBeCloseTo(1.98, 9);
  });

  it("summarizes load profile metrics and uses tariff engine TOU periods", () => {
    const intervals = [
      { timestamp: "2026-01-05T10:00:00+07:00", energyKwh: 10, powerKw: 10 },
      { timestamp: "2026-01-05T23:00:00+07:00", energyKwh: 5, powerKw: 5 },
      { timestamp: "2026-01-03T10:00:00+07:00", energyKwh: 3, powerKw: 3 }
    ];
    const summary = summarizeLoadProfile(intervals, { tariffVersion: demoTouTariff });

    expect(summary.totalKwh).toBe(18);
    expect(summary.peakDemandKw).toBe(10);
    expect(summary.peakPeriodKwh).toBe(10);
    expect(summary.offPeakPeriodKwh).toBe(8);
    expect(summary.energyByDayOfWeek.length).toBeGreaterThan(0);
  });
});
