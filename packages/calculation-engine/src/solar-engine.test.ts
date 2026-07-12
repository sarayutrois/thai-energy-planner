import { describe, expect, it } from "vitest";
import {
  demoNormalTariff,
  demoTouTariff,
} from "@thai-energy-planner/tariff-engine";
import type { LoadIntervalInput } from "@thai-energy-planner/shared-types";
import {
  buildSolarRecommendations,
  calculateBillAfterSolar,
  calculateFinancials,
  createDemoSolarInput,
  generateApproxSolarProfile,
  optimizeSolarSize,
  parseSolarGenerationCsv,
  runDemoSolarAnalysis,
  runSensitivityAnalysis,
  simulateSolarSelfConsumption,
  validateExportPolicy,
  validateFinancialAssumptions,
  validateSolarAssumptions,
  type ExportPolicy,
  type FinancialAssumptions,
  type SolarAssumptions,
  type SolarGenerationIntervalInput,
} from "./solar-engine";

function bangkokIso(dayOffset: number, hour: number) {
  return new Date(
    Date.UTC(2026, 0, 5 + dayOffset, hour - 7, 0, 0),
  ).toISOString();
}

function load(rows: Array<[number, number, number]>): LoadIntervalInput[] {
  return rows.map(([day, hour, energyKwh]) => ({
    timestamp: bangkokIso(day, hour),
    energyKwh,
    powerKw: energyKwh,
  }));
}

function solar(
  rows: Array<[number, number, number]>,
): SolarGenerationIntervalInput[] {
  return rows.map(([day, hour, generationKwh]) => ({
    timestamp: bangkokIso(day, hour),
    generationKwh,
    powerKw: generationKwh,
  }));
}

const exportPolicy: ExportPolicy = {
  enabled: true,
  exportRateThbPerKwh: 2,
  status: "demo",
  sourceUrl: null,
  authority: "test",
  notes: "Synthetic test export policy.",
};

const financeBase: FinancialAssumptions = {
  projectLifeYears: 5,
  discountRatePercent: 0,
  electricityEscalationRatePercent: 0,
  inflationRatePercent: 0,
  oAndMEscalationRatePercent: 0,
  degradationRatePercent: 0,
  capexThb: 1000,
  oAndMCostPerYear: 0,
  inverterReplacementCostThb: 0,
  inverterReplacementYear: null,
  subsidyAmountThb: 0,
  meterChangeCostThb: 0,
  otherInitialCostThb: 0,
};

const solarAssumptions: SolarAssumptions = {
  province: "Test",
  systemSizeKwp: 2,
  monthlySpecificYieldKwhPerKwp: [
    100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
  ],
  systemLossPercent: 0,
  shadingLossPercent: 0,
  degradationPercentPerYear: 0.5,
  intervalMinutes: 60,
  yieldSource: {
    status: "demo",
    sourceUrl: null,
    authority: "test",
    notes: "Synthetic yield for tests.",
  },
};

const controlledFinancialAssumptions: FinancialAssumptions = {
  projectLifeYears: 10,
  discountRatePercent: 5,
  electricityEscalationRatePercent: 0,
  inflationRatePercent: 0,
  oAndMEscalationRatePercent: 0,
  degradationRatePercent: 0,
  capexThb: 100000,
  oAndMCostPerYear: 1000,
  inverterReplacementCostThb: 0,
  inverterReplacementYear: null,
  subsidyAmountThb: 0,
  meterChangeCostThb: 0,
  otherInitialCostThb: 0,
};

describe("phase 5 solar engine", () => {
  it("matches the controlled self-consumption QA example", () => {
    const result = simulateSolarSelfConsumption({
      loadIntervals: load([
        [0, 10, 1],
        [0, 11, 1],
        [0, 12, 1],
        [0, 13, 1],
      ]),
      solarIntervals: solar([
        [0, 10, 0.5],
        [0, 11, 1.2],
        [0, 12, 1.5],
        [0, 13, 0.8],
      ]),
    });

    expect(result.totalLoadKwh).toBe(4);
    expect(result.totalSolarGenerationKwh).toBe(4);
    expect(result.selfConsumedKwh).toBe(3.3);
    expect(result.gridImportKwh).toBe(0.7);
    expect(result.gridExportKwh).toBe(0.7);
    expect(result.selfConsumptionRatio).toBe(0.825);
    expect(result.selfSufficiencyRatio).toBe(0.825);
    expect(result.exportRatio).toBe(0.175);
  });

  it("uses controlled gridImport instead of netting monthly load minus monthly solar", () => {
    const comparison = calculateBillAfterSolar({
      loadIntervals: load([
        [0, 10, 1],
        [0, 11, 1],
        [0, 12, 1],
        [0, 13, 1],
      ]),
      solarIntervals: solar([
        [0, 10, 0.5],
        [0, 11, 1.2],
        [0, 12, 1.5],
        [0, 13, 0.8],
      ]),
      normalTariff: demoNormalTariff,
      touTariff: demoTouTariff,
      exportPolicy: { ...exportPolicy, exportRateThbPerKwh: 2.2 },
      billDate: "2026-02-01",
      monthlyScaleFactor: 1,
    });

    expect(comparison.selfConsumption.gridImportKwh).toBeCloseTo(255.5);
    expect(comparison.normalWithSolar.monthlyEnergyKwh).toBeCloseTo(21.291667);
    expect(comparison.touWithSolar.monthlyEnergyKwh).toBeCloseTo(21.291667);
    expect(comparison.normalWithSolar.monthlyEnergyKwh).not.toBe(0);
    expect(comparison.normalWithSolar.monthlyExportRevenueThb).toBe(46.84);
    expect(comparison.calculationTrace.usedIntervalMatching).toBe(true);
  });

  it("caps billable export revenue without changing physical export reporting", () => {
    const comparison = calculateBillAfterSolar({
      loadIntervals: load([[0, 10, 1]]),
      solarIntervals: solar([[0, 10, 5]]),
      normalTariff: demoNormalTariff,
      touTariff: demoTouTariff,
      exportPolicy: {
        ...exportPolicy,
        exportRateThbPerKwh: 2,
        exportLimitKw: 1,
      },
      billDate: "2026-02-01",
      monthlyScaleFactor: 1,
    });

    expect(comparison.selfConsumption.gridExportKwh).toBeCloseTo(1460);
    expect(comparison.normalWithSolar.monthlyExportRevenueThb).toBeCloseTo(60.83);
    expect(comparison.annualGridExport).toBeCloseTo(1460);
  });

  it("matches load and solar intervals with min/load/solar rules", () => {
    const result = simulateSolarSelfConsumption({
      loadIntervals: load([
        [0, 10, 2],
        [0, 11, 3],
      ]),
      solarIntervals: solar([
        [0, 10, 1],
        [0, 11, 3],
      ]),
    });

    expect(result.selfConsumedKwh).toBe(4);
    expect(result.gridImportKwh).toBe(1);
    expect(result.gridExportKwh).toBe(0);
    expect(result.intervalResults[0]?.selfConsumedKwh).toBe(1);
  });

  it("calculates grid export when solar exceeds load", () => {
    const result = simulateSolarSelfConsumption({
      loadIntervals: load([
        [0, 10, 2],
        [0, 11, 3],
      ]),
      solarIntervals: solar([
        [0, 10, 1],
        [0, 11, 5],
      ]),
    });

    expect(result.selfConsumedKwh).toBe(4);
    expect(result.gridImportKwh).toBe(1);
    expect(result.gridExportKwh).toBe(2);
    expect(result.selfConsumptionRatio).toBeCloseTo(4 / 6, 6);
    expect(result.selfSufficiencyRatio).toBeCloseTo(4 / 5, 6);
    expect(result.exportRatio).toBeCloseTo(2 / 6, 6);
  });

  it("handles timestamps crossing midnight", () => {
    const result = simulateSolarSelfConsumption({
      loadIntervals: load([
        [0, 23, 2],
        [1, 0, 3],
      ]),
      solarIntervals: solar([
        [0, 23, 1],
        [1, 0, 4],
      ]),
    });

    expect(result.totalLoadKwh).toBe(5);
    expect(result.gridImportKwh).toBe(1);
    expect(result.gridExportKwh).toBe(1);
    expect(result.monthlyEnergy[0]?.month).toBe("2026-01");
  });

  it("parses uploaded solar generation CSV with generation_kwh", () => {
    const preview = parseSolarGenerationCsv(
      "timestamp,generation_kwh\n2026-01-05 10:00,1.25",
      {
        intervalMinutes: 60,
        source: solarAssumptions.yieldSource,
      },
    );

    expect(preview.canImport).toBe(true);
    expect(preview.solarIntervals[0]?.generationKwh).toBe(1.25);
  });

  it("generates approximate solar profile from demo yield config", () => {
    const profile = generateApproxSolarProfile({
      assumptions: solarAssumptions,
      startDate: "2026-01-05",
      days: 1,
    });

    expect(profile.source.status).toBe("demo");
    expect(profile.annualGenerationKwh).toBe(2400);
    expect(
      profile.intervals.some((interval) => interval.generationKwh > 0),
    ).toBe(true);
  });

  it("uses gridImport for Normal + Solar billing", () => {
    const comparison = calculateBillAfterSolar({
      loadIntervals: load([[0, 10, 10]]),
      solarIntervals: solar([[0, 10, 4]]),
      normalTariff: demoNormalTariff,
      touTariff: demoTouTariff,
      exportPolicy,
      billDate: "2026-02-01",
      monthlyScaleFactor: 1,
    });

    expect(comparison.normalWithoutSolar.monthlyEnergyKwh).toBe(304.166667);
    expect(comparison.normalWithSolar.monthlyEnergyKwh).toBe(182.5);
    expect(comparison.normalWithSolar.monthlyBillThb).toBeLessThan(
      comparison.normalWithoutSolar.monthlyBillThb,
    );
  });

  it("calculates TOU + Solar with peak and off-peak import intervals", () => {
    const comparison = calculateBillAfterSolar({
      loadIntervals: load([
        [0, 10, 10],
        [0, 23, 8],
      ]),
      solarIntervals: solar([
        [0, 10, 3],
        [0, 23, 0],
      ]),
      normalTariff: demoNormalTariff,
      touTariff: demoTouTariff,
      exportPolicy,
      billDate: "2026-02-01",
      monthlyScaleFactor: 1,
    });

    expect(Number(comparison.touWithSolar.bill.peakEnergyKwh)).toBe(212.916667);
    expect(Number(comparison.touWithSolar.bill.offPeakEnergyKwh)).toBe(243.333333);
    expect(comparison.touWithSolar.monthlyBillThb).toBeLessThan(
      comparison.touWithoutSolar.monthlyBillThb,
    );
  });

  it("keeps weekend daytime as off-peak through the tariff engine", () => {
    const comparison = calculateBillAfterSolar({
      loadIntervals: load([[5, 10, 5]]),
      solarIntervals: solar([[5, 10, 1]]),
      normalTariff: demoNormalTariff,
      touTariff: demoTouTariff,
      exportPolicy,
      billDate: "2026-02-01",
      monthlyScaleFactor: 1,
    });

    expect(Number(comparison.touWithSolar.bill.peakEnergyKwh)).toBe(0);
    expect(Number(comparison.touWithSolar.bill.offPeakEnergyKwh)).toBe(121.666667);
  });

  it("calculates export revenue from export policy config", () => {
    const comparison = calculateBillAfterSolar({
      loadIntervals: load([[0, 10, 1]]),
      solarIntervals: solar([[0, 10, 6]]),
      normalTariff: demoNormalTariff,
      touTariff: demoTouTariff,
      exportPolicy,
      billDate: "2026-02-01",
      monthlyScaleFactor: 1,
    });

    expect(comparison.normalWithSolar.monthlyExportRevenueThb).toBe(304.17);
    expect(comparison.annualGridExport).toBe(1825);
  });

  it("keeps calculation breakdown totals aligned", () => {
    const comparison = calculateBillAfterSolar({
      loadIntervals: load([[0, 10, 10]]),
      solarIntervals: solar([[0, 10, 4]]),
      normalTariff: demoNormalTariff,
      touTariff: demoTouTariff,
      exportPolicy,
      billDate: "2026-02-01",
      monthlyScaleFactor: 1,
    });
    const bill = comparison.normalWithSolar.bill;
    const componentTotal =
      Number(bill.baseEnergyCharge) +
      Number(bill.peakEnergyCharge) +
      Number(bill.offPeakEnergyCharge) +
      Number(bill.demandCharge) +
      Number(bill.ftCharge) +
      Number(bill.serviceCharge) -
      Number(bill.discount) +
      Number(bill.vat);

    expect(componentTotal).toBeCloseTo(Number(bill.grandTotal), 2);
  });

  it("optimizes solar size and returns best payback and NPV options", () => {
    const demo = createDemoSolarInput("daytime_shop", {
      systemSizeKwp: 3,
      capexThb: 60000,
    });
    const result = optimizeSolarSize({
      loadIntervals: demo.loadIntervals,
      normalTariff: demo.normalTariff,
      touTariff: demo.touTariff,
      baseSolarAssumptions: demo.solarAssumptions,
      exportPolicy: demo.exportPolicy,
      financialAssumptions: demo.financialAssumptions,
      minKwp: 1,
      maxKwp: 5,
      stepKwp: 1,
    });

    expect(result.options).toHaveLength(5);
    expect(result.fastestPayback?.systemSizeKwp).toBeGreaterThan(0);
    expect(result.highestNpv?.npvThb).toBe(
      Math.max(...result.options.map((option) => option.npvThb)),
    );
    expect(result.recommended?.npvThb).toBeGreaterThan(0);
    expect(result.recommended?.simplePaybackYears).toBeLessThanOrEqual(
      demo.financialAssumptions.projectLifeYears,
    );
  });

  it("does not recommend a size when every option fails the financial gate", () => {
    const demo = createDemoSolarInput("evening_home", {
      systemSizeKwp: 5,
      capexThb: 2_000_000,
      exportEnabled: false,
      exportRateThbPerKwh: 0,
    });
    const result = optimizeSolarSize({
      loadIntervals: demo.loadIntervals,
      normalTariff: demo.normalTariff,
      touTariff: demo.touTariff,
      baseSolarAssumptions: demo.solarAssumptions,
      exportPolicy: demo.exportPolicy,
      financialAssumptions: demo.financialAssumptions,
      minKwp: 0.5,
      maxKwp: 5,
      stepKwp: 0.5,
    });

    expect(result.options).toHaveLength(10);
    expect(result.recommended).toBeNull();
  });

  it("checks sizing at 1, 3, 5, and 10 kWp without blindly choosing the largest payback size", () => {
    const demo = createDemoSolarInput("evening_home", {
      systemSizeKwp: 5,
      capexThb: 210000,
      exportEnabled: false,
      exportRateThbPerKwh: 0,
    });
    const result = optimizeSolarSize({
      loadIntervals: demo.loadIntervals,
      normalTariff: demo.normalTariff,
      touTariff: demo.touTariff,
      baseSolarAssumptions: demo.solarAssumptions,
      exportPolicy: demo.exportPolicy,
      financialAssumptions: demo.financialAssumptions,
      minKwp: 1,
      maxKwp: 10,
      stepKwp: 1,
    });
    const option1 = result.options.find(
      (option) => option.systemSizeKwp === 1,
    )!;
    const option3 = result.options.find(
      (option) => option.systemSizeKwp === 3,
    )!;
    const option5 = result.options.find(
      (option) => option.systemSizeKwp === 5,
    )!;
    const option10 = result.options.find(
      (option) => option.systemSizeKwp === 10,
    )!;

    expect(option3.annualGenerationKwh).toBeGreaterThan(
      option1.annualGenerationKwh,
    );
    expect(option5.annualGenerationKwh).toBeGreaterThan(
      option3.annualGenerationKwh,
    );
    expect(option10.annualGenerationKwh).toBeGreaterThan(
      option5.annualGenerationKwh,
    );
    expect(option10.annualExportedKwh).toBeGreaterThan(
      option5.annualExportedKwh,
    );
    expect(option10.selfConsumptionRatio).toBeLessThan(
      option1.selfConsumptionRatio,
    );
    expect(result.fastestPayback?.systemSizeKwp).toBeLessThan(10);
    expect(result.highestNpv?.npvThb).toBe(
      Math.max(...result.options.map((option) => option.npvThb)),
    );
  });

  it("calculates simple payback, ROI, NPV, IRR, and LCOE", () => {
    const result = calculateFinancials({
      annualBillSavingsThb: 500,
      annualExportRevenueThb: 0,
      annualGenerationKwh: 1000,
      assumptions: financeBase,
    });

    expect(result.simplePaybackYears).toBe(2);
    expect(result.discountedPaybackYears).toBe(2);
    expect(result.roiPercent).toBe(150);
    expect(result.npvThb).toBe(1500);
    expect(result.irrPercent).toBeGreaterThan(30);
    expect(result.lcoeThbPerKwh).toBe(0.2);
  });

  it("matches the controlled financial QA example", () => {
    const result = calculateFinancials({
      annualBillSavingsThb: 15000,
      annualExportRevenueThb: 2000,
      annualGenerationKwh: 5000,
      assumptions: controlledFinancialAssumptions,
    });

    expect(result.annualNetBenefitYear1).toBe(16000);
    expect(result.simplePaybackYears).toBe(6.25);
    expect(result.npvThb).toBeCloseTo(23547.76, 2);
    expect(
      result.cashFlows.find((row) => row.year === 6)?.cumulativeCashFlowThb,
    ).toBe(-4000);
    expect(
      result.cashFlows.find((row) => row.year === 7)?.cumulativeCashFlowThb,
    ).toBe(12000);
  });

  it("reduces lifecycle economics when inverter replacement occurs after payback", () => {
    const base = calculateFinancials({
      annualBillSavingsThb: 15000,
      annualExportRevenueThb: 2000,
      annualGenerationKwh: 5000,
      assumptions: controlledFinancialAssumptions,
    });
    const replacement = calculateFinancials({
      annualBillSavingsThb: 15000,
      annualExportRevenueThb: 2000,
      annualGenerationKwh: 5000,
      assumptions: {
        ...controlledFinancialAssumptions,
        inverterReplacementCostThb: 25000,
        inverterReplacementYear: 10,
      },
    });

    expect(
      replacement.cashFlows.find((row) => row.year === 10)?.replacementCostThb,
    ).toBe(25000);
    expect(
      replacement.cashFlows.find((row) => row.year === 10)?.netCashFlowThb,
    ).toBe(-9000);
    expect(replacement.npvThb).toBeLessThan(base.npvThb);
    expect(replacement.simplePaybackYears).toBe(base.simplePaybackYears);
  });

  it("applies annual solar degradation to generation", () => {
    const result = calculateFinancials({
      annualBillSavingsThb: 15000,
      annualExportRevenueThb: 2000,
      annualGenerationKwh: 5000,
      assumptions: {
        ...controlledFinancialAssumptions,
        degradationRatePercent: 0.5,
      },
    });

    expect(result.cashFlows.find((row) => row.year === 1)?.generationKwh).toBe(
      5000,
    );
    expect(result.cashFlows.find((row) => row.year === 2)?.generationKwh).toBe(
      4975,
    );
    expect(
      result.cashFlows.find((row) => row.year === 3)?.generationKwh,
    ).toBeCloseTo(4950.125, 3);
  });

  it("calculates discounted payback separately from simple payback", () => {
    const result = calculateFinancials({
      annualBillSavingsThb: 500,
      annualExportRevenueThb: 0,
      annualGenerationKwh: 1000,
      assumptions: { ...financeBase, discountRatePercent: 10 },
    });

    expect(result.simplePaybackYears).toBe(2);
    expect(result.discountedPaybackYears).toBeGreaterThan(2);
  });

  it("applies inverter replacement cost in the configured year", () => {
    const result = calculateFinancials({
      annualBillSavingsThb: 500,
      annualExportRevenueThb: 0,
      annualGenerationKwh: 1000,
      assumptions: {
        ...financeBase,
        inverterReplacementCostThb: 300,
        inverterReplacementYear: 2,
      },
    });

    expect(
      result.cashFlows.find((row) => row.year === 2)?.replacementCostThb,
    ).toBe(300);
    expect(result.cashFlows.find((row) => row.year === 2)?.netCashFlowThb).toBe(
      200,
    );
  });

  it("applies degradation and electricity escalation to annual benefits", () => {
    const degraded = calculateFinancials({
      annualBillSavingsThb: 1000,
      annualExportRevenueThb: 0,
      annualGenerationKwh: 1000,
      assumptions: { ...financeBase, degradationRatePercent: 10 },
    });
    const escalated = calculateFinancials({
      annualBillSavingsThb: 1000,
      annualExportRevenueThb: 0,
      annualGenerationKwh: 1000,
      assumptions: { ...financeBase, electricityEscalationRatePercent: 10 },
    });

    expect(
      degraded.cashFlows.find((row) => row.year === 2)?.billSavingsThb,
    ).toBe(900);
    expect(
      escalated.cashFlows.find((row) => row.year === 2)?.billSavingsThb,
    ).toBe(1100);
  });

  it("runs sensitivity analysis across required variables", () => {
    const result = runSensitivityAnalysis({
      annualBillSavingsThb: 500,
      annualExportRevenueThb: 50,
      annualGenerationKwh: 1000,
      assumptions: financeBase,
    });

    expect(result.cases.some((item) => item.variable === "capex")).toBe(true);
    expect(
      result.cases.some((item) => item.variable === "electricity_escalation"),
    ).toBe(true);
    expect(
      result.cases.some((item) => item.variable === "solar_generation"),
    ).toBe(true);
    expect(
      result.cases.some((item) => item.variable === "self_consumption"),
    ).toBe(true);
    expect(result.cases.some((item) => item.variable === "discount_rate")).toBe(
      true,
    );
    expect(result.mostImpactfulVariable).not.toBeNull();
  });

  it("includes required sensitivity cases for QA review", () => {
    const result = runSensitivityAnalysis({
      annualBillSavingsThb: 15000,
      annualExportRevenueThb: 2000,
      annualGenerationKwh: 5000,
      assumptions: controlledFinancialAssumptions,
    });

    expect(
      result.cases
        .filter((item) => item.variable === "capex")
        .map((item) => item.value),
    ).toEqual([0.8, 0.9, 1, 1.1, 1.2]);
    expect(
      result.cases
        .filter((item) => item.variable === "electricity_escalation")
        .map((item) => item.value),
    ).toEqual([0, 2, 4]);
    expect(
      result.cases
        .filter((item) => item.variable === "solar_generation")
        .map((item) => item.value),
    ).toEqual([0.85, 0.9, 1, 1.1]);
    expect(
      result.cases
        .filter((item) => item.variable === "discount_rate")
        .map((item) => item.value),
    ).toEqual([3, 5, 7]);
  });

  it("recommends caution for low self-consumption and more data", () => {
    const analysis = runDemoSolarAnalysis("evening_home", {
      systemSizeKwp: 8,
      capexThb: 900000,
    });

    expect(
      analysis.recommendations.some(
        (recommendation) => recommendation.type === "low_self_consumption",
      ),
    ).toBe(true);
    expect(
      analysis.recommendations.some(
        (recommendation) => recommendation.type === "insufficient_data",
      ),
    ).toBe(true);
  });

  it("recommends increasing size when daytime load can absorb more solar", () => {
    const analysis = runDemoSolarAnalysis("daytime_shop", {
      systemSizeKwp: 1,
      capexThb: 30000,
    });

    expect(
      analysis.recommendations.some(
        (recommendation) => recommendation.type === "increase_system_size",
      ),
    ).toBe(true);
  });

  it("can recommend TOU + Solar when it has lower net cost than Normal + Solar", () => {
    const analysis = runDemoSolarAnalysis("daytime_shop", {
      systemSizeKwp: 4,
      capexThb: 100000,
    });
    const hasTouRecommendation = analysis.recommendations.some(
      (recommendation) => recommendation.type === "tou_solar_better",
    );
    const hasNormalRecommendation = analysis.recommendations.some(
      (recommendation) => recommendation.type === "normal_solar_better",
    );

    expect(hasTouRecommendation || hasNormalRecommendation).toBe(true);
    if (
      analysis.billComparison.touWithSolar.netMonthlyCostThb <
      analysis.billComparison.normalWithSolar.netMonthlyCostThb
    ) {
      expect(hasTouRecommendation).toBe(true);
    }
  });

  it("validates solar and finance assumptions", () => {
    expect(
      validateSolarAssumptions({ ...solarAssumptions, systemSizeKwp: 0 }),
    ).toContain("systemSizeKwp must be greater than 0");
    expect(
      validateFinancialAssumptions({ ...financeBase, capexThb: -1 }),
    ).toContain("capexThb must be non-negative");
    expect(
      validateExportPolicy({ ...exportPolicy, exportRateThbPerKwh: -1 }),
    ).toContain("exportRateThbPerKwh must be non-negative");
    expect(() =>
      calculateBillAfterSolar({
        loadIntervals: load([[0, 10, 1]]),
        solarIntervals: solar([[0, 10, 1]]),
        normalTariff: demoNormalTariff,
        touTariff: demoTouTariff,
        exportPolicy: { ...exportPolicy, exportRateThbPerKwh: -1 },
        billDate: "2026-02-01",
        monthlyScaleFactor: 1,
      }),
    ).toThrow("Invalid export policy");
  });

  it("can build solar recommendations directly from result objects", () => {
    const analysis = runDemoSolarAnalysis("daytime_home", {
      systemSizeKwp: 4,
      capexThb: 120000,
    });
    const recommendations = buildSolarRecommendations({
      billComparison: analysis.billComparison,
      financial: analysis.financial,
      sizing: analysis.sizing,
      intervalDays: 7,
      shadingLossPercent:
        analysis.solarProfile.assumptionsSnapshot.shadingLossPercent,
    });

    expect(recommendations.length).toBeGreaterThan(0);
    expect(
      recommendations.every(
        (recommendation) => recommendation.nextAction.length > 0,
      ),
    ).toBe(true);
  });

  it("reduces approximate generation when roof orientation is less favorable", () => {
    const southFacing = generateApproxSolarProfile({
      assumptions: { ...solarAssumptions, roofAzimuth: 180, roofTilt: 12 },
      startDate: "2026-01-05",
      days: 1,
    });
    const westFlat = generateApproxSolarProfile({
      assumptions: { ...solarAssumptions, roofAzimuth: 270, roofTilt: 0 },
      startDate: "2026-01-05",
      days: 1,
    });

    expect(westFlat.annualGenerationKwh).toBeLessThan(
      southFacing.annualGenerationKwh,
    );
    expect(
      validateSolarAssumptions({ ...solarAssumptions, roofAzimuth: 361 }),
    ).toContain("roofAzimuth must be between 0 and 360");
  });

  it("adds stress sensitivity, NPV range, and break-even capex", () => {
    const result = runSensitivityAnalysis({
      annualBillSavingsThb: 15000,
      annualExportRevenueThb: 2000,
      annualGenerationKwh: 5000,
      assumptions: controlledFinancialAssumptions,
    });

    expect(result.downsideCase.npvThb).toBeLessThan(result.baseNpvThb);
    expect(result.upsideCase.npvThb).toBeGreaterThan(result.baseNpvThb);
    expect(result.npvRangeThb.low).toBeLessThanOrEqual(
      result.downsideCase.npvThb,
    );
    expect(result.npvRangeThb.high).toBeGreaterThanOrEqual(
      result.upsideCase.npvThb,
    );
    expect(result.breakEvenCapexThb).toBeGreaterThan(
      controlledFinancialAssumptions.capexThb,
    );
  });

  it("surfaces model quality and risks for demo screening runs", () => {
    const analysis = runDemoSolarAnalysis("evening_home", {
      modelDetailLevel: "xhigh",
      systemSizeKwp: 8,
      capexThb: 900000,
      shadingLossPercent: 12,
    });

    expect(analysis.modelQuality.detailLevel).toBe("xhigh");
    expect(analysis.modelQuality.score).toBeLessThan(75);
    expect(analysis.modelQuality.risks.map((risk) => risk.code)).toEqual(
      expect.arrayContaining([
        "short_load_profile",
        "demo_yield_source",
        "demo_export_policy",
        "high_shading_loss",
      ]),
    );
  });
});
