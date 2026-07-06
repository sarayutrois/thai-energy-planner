import { describe, expect, it } from "vitest";
import {
  calculateNormalBill,
  calculateNormalBillFromVersions,
  calculateTouBill,
  calculateEnergyCharge,
  calculateFtCharge,
  calculateTotalBill,
  calculateVat,
  classifyTouPeriod,
  demoNormalTariff,
  demoTouTariff,
  getOfficialThaiTariff,
  selectTariffVersion
} from "./index";
import type { TariffVersionConfig } from "./index";

function cloneTariff(tariff: TariffVersionConfig): TariffVersionConfig {
  return structuredClone(tariff) as TariffVersionConfig;
}

describe("tariff version selection", () => {
  it("selects the matching verified version by bill date", () => {
    const older = {
      ...cloneTariff(demoNormalTariff),
      id: "older",
      status: "verified" as const,
      effectiveFrom: "2025-01-01",
      effectiveTo: "2025-12-31"
    };
    const current = {
      ...cloneTariff(demoNormalTariff),
      id: "current",
      status: "verified" as const,
      effectiveFrom: "2026-01-01",
      effectiveTo: null
    };

    const selected = selectTariffVersion({
      authority: "PEA",
      customerSegment: "residential",
      meterMode: "normal",
      billDate: "2026-05-01",
      versions: [older, current]
    });

    expect(selected?.id).toBe("current");
  });

  it("can include draft versions explicitly for developer demo calculation", () => {
    const selected = selectTariffVersion({
      authority: "PEA",
      customerSegment: "residential",
      meterMode: "normal",
      billDate: "2026-05-01",
      versions: [demoNormalTariff],
      allowedStatuses: ["draft"]
    });

    expect(selected?.status).toBe("draft");
  });
});

describe("official Thai tariff seed", () => {
  it("calculates PEA residential standard normal bill with current Ft and VAT", () => {
    const tariff = getOfficialThaiTariff({
      authority: "PEA",
      customerSegment: "residential",
      meterMode: "normal",
      monthlyEnergyKwh: 250,
      billDate: "2026-07-01"
    });
    const result = calculateNormalBill({
      tariffVersion: tariff,
      billDate: "2026-07-01",
      energyKwh: "250"
    });

    expect(result.tariffStatus).toBe("published");
    expect(result.baseEnergyCharge).toBe("909.44");
    expect(result.ftCharge).toBe("40.58");
    expect(result.serviceCharge).toBe("24.62");
    expect(result.grandTotal).toBe("1042.86");
  });

  it("selects the low-use residential normal plan when monthly use is not over 150 kWh", () => {
    const tariff = getOfficialThaiTariff({
      authority: "MEA",
      customerSegment: "residential",
      meterMode: "normal",
      monthlyEnergyKwh: 120,
      billDate: "2026-07-01"
    });

    expect(tariff.id).toContain("low-use");
    expect(tariff.serviceChargeThb).toBe("8.19");
  });

  it("calculates official low-voltage TOU peak and off-peak energy", () => {
    const tariff = getOfficialThaiTariff({
      authority: "PEA",
      customerSegment: "small_business",
      meterMode: "tou",
      billDate: "2026-07-01"
    });
    const result = calculateTouBill({
      tariffVersion: tariff,
      intervals: [
        { timestamp: "2026-07-01T10:00:00+07:00", energyKwh: "100" },
        { timestamp: "2026-07-01T23:00:00+07:00", energyKwh: "100" }
      ]
    });

    expect(result.peakEnergyCharge).toBe("579.82");
    expect(result.offPeakEnergyCharge).toBe("263.69");
    expect(result.ftCharge).toBe("32.46");
    expect(result.grandTotal).toBe("972.91");
  });
});

describe("normal tariff calculation", () => {
  it("calculates tiered energy, Ft, VAT, and breakdown from configuration", () => {
    const result = calculateNormalBill({
      tariffVersion: demoNormalTariff,
      billDate: "2026-02-01",
      energyKwh: "250",
      snapshotCapturedAt: "2026-07-04T00:00:00.000Z"
    });

    expect(result.baseEnergyCharge).toBe("450.00");
    expect(result.ftCharge).toBe("125.00");
    expect(result.serviceCharge).toBe("10.00");
    expect(result.subtotalBeforeVat).toBe("585.00");
    expect(result.vat).toBe("40.95");
    expect(result.grandTotal).toBe("625.95");
    expect(result.effectiveRatePerKwh).toBe("2.503800");
    expect(result.tariffSnapshot.tariffVersion.energyRateTiers).toHaveLength(3);
  });

  it("does not spill units into the next tier at an exact tier boundary", () => {
    const result = calculateNormalBill({
      tariffVersion: demoNormalTariff,
      billDate: "2026-02-01",
      energyKwh: "100"
    });

    expect(result.baseEnergyCharge).toBe("100.00");
  });

  it("applies component rounding before VAT according to policy", () => {
    const tariff = cloneTariff(demoNormalTariff);
    tariff.energyRateTiers = [{ fromKwh: "0", toKwh: null, rateThbPerKwh: "0.333", sortOrder: 1 }];
    const ftPeriod = tariff.ftPeriods[0];
    if (!ftPeriod) {
      throw new Error("Expected demo tariff to include an Ft period");
    }
    tariff.ftPeriods = [{ ...ftPeriod, ftThbPerKwh: "0" }];
    tariff.serviceChargeThb = "0";

    const result = calculateNormalBill({
      tariffVersion: tariff,
      billDate: "2026-02-01",
      energyKwh: "1"
    });

    expect(result.baseEnergyCharge).toBe("0.33");
    expect(result.vat).toBe("0.02");
    expect(result.grandTotal).toBe("0.35");
  });

  it("calculates through version selection for a bill date", () => {
    const result = calculateNormalBillFromVersions({
      authority: "PEA",
      customerSegment: "residential",
      allowedStatuses: ["draft"],
      versions: [demoNormalTariff],
      billDate: "2026-05-01",
      energyKwh: "100"
    });

    expect(result.tariffVersionId).toBe(demoNormalTariff.id);
  });
});

describe("TOU tariff calculation", () => {
  it("classifies weekday 10:00 as peak through the reusable TOU classifier", () => {
    const result = classifyTouPeriod({
      timestamp: "2026-01-05T10:00:00+07:00",
      touPeriods: demoTouTariff.touPeriods,
      holidays: demoTouTariff.holidays
    });

    expect(result.periodType).toBe("peak");
    expect(result.isHoliday).toBe(false);
  });

  it("classifies weekday 23:00 as off-peak through the reusable TOU classifier", () => {
    const result = classifyTouPeriod({
      timestamp: "2026-01-05T23:00:00+07:00",
      touPeriods: demoTouTariff.touPeriods,
      holidays: demoTouTariff.holidays
    });

    expect(result.periodType).toBe("off_peak");
  });

  it("classifies Saturday, Sunday, and official holidays as off-peak through config", () => {
    const saturday = classifyTouPeriod({
      timestamp: "2026-01-03T10:00:00+07:00",
      touPeriods: demoTouTariff.touPeriods,
      holidays: demoTouTariff.holidays
    });
    const sunday = classifyTouPeriod({
      timestamp: "2026-01-04T10:00:00+07:00",
      touPeriods: demoTouTariff.touPeriods,
      holidays: demoTouTariff.holidays
    });
    const holiday = classifyTouPeriod({
      timestamp: "2026-01-01T10:00:00+07:00",
      touPeriods: demoTouTariff.touPeriods,
      holidays: demoTouTariff.holidays
    });

    expect(saturday.periodType).toBe("off_peak");
    expect(sunday.periodType).toBe("off_peak");
    expect(holiday.periodType).toBe("off_peak");
    expect(holiday.isHoliday).toBe(true);
  });

  it("classifies weekday peak intervals", () => {
    const result = calculateTouBill({
      tariffVersion: demoTouTariff,
      intervals: [{ timestamp: "2026-01-05T10:00:00+07:00", energyKwh: "10" }]
    });

    expect(result.peakEnergyKwh).toBe("10.000000");
    expect(result.peakEnergyCharge).toBe("50.00");
    expect(result.offPeakEnergyCharge).toBe("0.00");
  });

  it("classifies weekday off-peak intervals", () => {
    const result = calculateTouBill({
      tariffVersion: demoTouTariff,
      intervals: [{ timestamp: "2026-01-05T23:00:00+07:00", energyKwh: "10" }]
    });

    expect(result.offPeakEnergyKwh).toBe("10.000000");
    expect(result.offPeakEnergyCharge).toBe("20.00");
  });

  it("classifies Saturday and Sunday as off-peak by configuration", () => {
    const result = calculateTouBill({
      tariffVersion: demoTouTariff,
      intervals: [
        { timestamp: "2026-01-03T10:00:00+07:00", energyKwh: "5" },
        { timestamp: "2026-01-04T10:00:00+07:00", energyKwh: "5" }
      ]
    });

    expect(result.peakEnergyKwh).toBe("0.000000");
    expect(result.offPeakEnergyKwh).toBe("10.000000");
    expect(result.offPeakEnergyCharge).toBe("20.00");
  });

  it("uses the holiday table to override weekday peak periods", () => {
    const result = calculateTouBill({
      tariffVersion: demoTouTariff,
      intervals: [{ timestamp: "2026-01-01T10:00:00+07:00", energyKwh: "10" }]
    });

    expect(result.intervalTraces[0]?.isHoliday).toBe(true);
    expect(result.intervalTraces[0]?.periodType).toBe("off_peak");
    expect(result.offPeakEnergyCharge).toBe("20.00");
  });

  it("handles timestamps that cross day boundaries", () => {
    const result = calculateTouBill({
      tariffVersion: demoTouTariff,
      intervals: [
        { timestamp: "2026-01-05T23:30:00+07:00", energyKwh: "1" },
        { timestamp: "2026-01-06T10:00:00+07:00", energyKwh: "1" }
      ]
    });

    expect(result.offPeakEnergyCharge).toBe("2.00");
    expect(result.peakEnergyCharge).toBe("5.00");
  });

  it("includes Ft, VAT, and a breakdown whose total matches grand total", () => {
    const result = calculateTouBill({
      tariffVersion: demoTouTariff,
      intervals: [
        { timestamp: "2026-01-05T10:00:00+07:00", energyKwh: "10" },
        { timestamp: "2026-01-05T23:00:00+07:00", energyKwh: "10" }
      ]
    });

    expect(result.peakEnergyCharge).toBe("50.00");
    expect(result.offPeakEnergyCharge).toBe("20.00");
    expect(result.ftCharge).toBe("10.00");
    expect(result.serviceCharge).toBe("10.00");
    expect(result.subtotalBeforeVat).toBe("90.00");
    expect(result.vat).toBe("6.30");
    expect(result.grandTotal).toBe("96.30");

    const grandTotalLine = result.lineItems.find((item) => item.component === "grandTotal");
    expect(grandTotalLine?.amountThb).toBe(result.grandTotal);
  });
});

describe("tariff primitive calculations", () => {
  it("calculates energy, Ft, VAT, and total bill from explicit inputs", () => {
    const energy = calculateEnergyCharge({ energyKwh: 100, rateThbPerKwh: 4 });
    const ft = calculateFtCharge({ energyKwh: 100, ftThbPerKwh: 0.5 });
    const beforeVat = calculateTotalBill({
      energyChargeThb: energy.amountThb,
      ftChargeThb: ft.amountThb,
      serviceChargeThb: 10,
      vatRatePercent: 7
    });
    const vat = calculateVat({ totalBeforeVatThb: beforeVat.totalBeforeVatThb, vatRatePercent: 7 });

    expect(energy.amountThb).toBe("400.00");
    expect(ft.amountThb).toBe("50.00");
    expect(beforeVat.totalBeforeVatThb).toBe("460.00");
    expect(vat.amountThb).toBe("32.20");
    expect(beforeVat.vatThb).toBe("32.20");
    expect(beforeVat.totalBillThb).toBe("492.20");
  });

  it("calculates tiered energy charge without hardcoded tariff values", () => {
    const result = calculateEnergyCharge({
      energyKwh: 150,
      tiers: [
        { fromKwh: 0, toKwh: 100, rateThbPerKwh: 1, sortOrder: 1 },
        { fromKwh: 100, toKwh: null, rateThbPerKwh: 2, sortOrder: 2 }
      ]
    });

    expect(result.amountThb).toBe("200.00");
  });
});
