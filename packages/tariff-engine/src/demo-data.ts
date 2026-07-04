import { defaultRoundingPolicy } from "./engine.js";
import type { LoadIntervalForTariff, TariffVersionConfig } from "./types.js";

const metadata = {
  authority: "PEA",
  customerSegment: "residential",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  status: "draft",
  sourceUrl: "https://example.com/thai-energy-planner/demo-tariff-not-real",
  verifiedAt: null,
  verifiedBy: null,
  notes: "Demo tariff for engine tests only. These are synthetic rates, not official PEA or MEA rates."
} as const;

export const demoNormalTariff: TariffVersionConfig = {
  ...metadata,
  id: "demo-pea-residential-normal-2026-draft",
  meterMode: "normal",
  versionLabel: "demo-normal-draft-2026",
  planName: "Demo Residential Normal",
  voltageLevel: "low_voltage",
  serviceChargeThb: "10",
  roundingPolicy: defaultRoundingPolicy,
  energyRateTiers: [
    { label: "Demo tier 1", fromKwh: "0", toKwh: "100", rateThbPerKwh: "1.00", sortOrder: 1 },
    { label: "Demo tier 2", fromKwh: "100", toKwh: "200", rateThbPerKwh: "2.00", sortOrder: 2 },
    { label: "Demo tier 3", fromKwh: "200", toKwh: null, rateThbPerKwh: "3.00", sortOrder: 3 }
  ],
  touPeriods: [],
  demandRates: [],
  ftPeriods: [
    {
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
      ftThbPerKwh: "0.50",
      sourceUrl: metadata.sourceUrl,
      verifiedAt: null
    }
  ],
  taxRates: [{ name: "Demo VAT", ratePercent: "7", effectiveFrom: "2026-01-01", effectiveTo: null }],
  holidays: [],
  policyIncentives: []
};

export const demoTouTariff: TariffVersionConfig = {
  ...metadata,
  id: "demo-pea-residential-tou-2026-draft",
  meterMode: "tou",
  versionLabel: "demo-tou-draft-2026",
  planName: "Demo Residential TOU",
  voltageLevel: "low_voltage",
  serviceChargeThb: "10",
  roundingPolicy: defaultRoundingPolicy,
  energyRateTiers: [],
  touPeriods: [
    {
      label: "Demo Peak Weekday",
      periodType: "peak",
      startTime: "09:00",
      endTime: "22:00",
      daysOfWeek: [1, 2, 3, 4, 5],
      appliesOnHolidays: false,
      rateThbPerKwh: "5.00"
    },
    {
      label: "Demo Off-Peak Late Night",
      periodType: "off_peak",
      startTime: "22:00",
      endTime: "24:00",
      daysOfWeek: [1, 2, 3, 4, 5],
      appliesOnHolidays: false,
      rateThbPerKwh: "2.00"
    },
    {
      label: "Demo Off-Peak Morning",
      periodType: "off_peak",
      startTime: "00:00",
      endTime: "09:00",
      daysOfWeek: [1, 2, 3, 4, 5],
      appliesOnHolidays: false,
      rateThbPerKwh: "2.00"
    },
    {
      label: "Demo Off-Peak Weekend",
      periodType: "off_peak",
      startTime: "00:00",
      endTime: "24:00",
      daysOfWeek: [0, 6],
      appliesOnHolidays: false,
      rateThbPerKwh: "2.00"
    },
    {
      label: "Demo Off-Peak Holiday",
      periodType: "off_peak",
      startTime: "00:00",
      endTime: "24:00",
      daysOfWeek: [],
      appliesOnHolidays: true,
      rateThbPerKwh: "2.00"
    }
  ],
  demandRates: [],
  ftPeriods: [
    {
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
      ftThbPerKwh: "0.50",
      sourceUrl: metadata.sourceUrl,
      verifiedAt: null
    }
  ],
  taxRates: [{ name: "Demo VAT", ratePercent: "7", effectiveFrom: "2026-01-01", effectiveTo: null }],
  holidays: [
    {
      date: "2026-01-01",
      nameTh: "วันหยุดตัวอย่าง",
      nameEn: "Demo holiday",
      isSubstitute: false,
      sourceUrl: metadata.sourceUrl
    }
  ],
  policyIncentives: []
};

export const demoTariffVersions = [demoNormalTariff, demoTouTariff];

export const demoTouIntervals: LoadIntervalForTariff[] = [
  { timestamp: "2026-01-05T10:00:00+07:00", energyKwh: "12" },
  { timestamp: "2026-01-05T23:00:00+07:00", energyKwh: "8" },
  { timestamp: "2026-01-03T14:00:00+07:00", energyKwh: "6" },
  { timestamp: "2026-01-01T10:00:00+07:00", energyKwh: "4" }
];
