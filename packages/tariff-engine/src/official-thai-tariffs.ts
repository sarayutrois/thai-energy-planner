import { defaultRoundingPolicy } from "./engine.js";
import type { TariffVersionConfig } from "./types.js";
import type {
  Authority,
  CustomerSegment,
  MeterMode,
} from "@thai-energy-planner/shared-types";

export type OfficialVoltageLevel = "low_voltage" | "medium_voltage";

export type OfficialTariffLookupInput = {
  authority: Authority;
  customerSegment: Extract<CustomerSegment, "residential" | "small_business">;
  meterMode: MeterMode;
  billDate?: string | undefined;
  monthlyEnergyKwh?: number | undefined;
  voltageLevel?: OfficialVoltageLevel | undefined;
};

const PEA_TARIFF_SOURCE_TH =
  "https://www.pea.co.th/sites/default/files/documents/tariff/Electricity_Tariff_MAY_2023.pdf";
const PEA_TARIFF_SOURCE_EN =
  "https://www.pea.co.th/sites/default/files/documents/tariff/EN_Electricity_Tariffs_May_2023.pdf";
const MEA_RESIDENTIAL_SOURCE =
  "https://www.mea.or.th/our-services/service-rates/other/D5xEaEwgU";
const MEA_SMALL_BUSINESS_SOURCE =
  "https://www.mea.or.th/our-services/service-rates/other/lhKD8oIlS";
const FT_SOURCE = "https://www.erc.or.th/th/automatic/";
const VERIFIED_AT = "2026-07-05T00:00:00+07:00";
const CURRENT_FT = "0.1623";
const VAT_7 = [
  {
    name: "VAT",
    ratePercent: "7",
    effectiveFrom: "1992-01-01",
    effectiveTo: null,
  },
];

const commonFtPeriods = [
  {
    effectiveFrom: "2026-05-01",
    effectiveTo: "2026-08-31",
    ftThbPerKwh: CURRENT_FT,
    sourceUrl: FT_SOURCE,
    verifiedAt: VERIFIED_AT,
  },
];

const thaiTouHolidays2026 = [
  { date: "2026-01-01", nameTh: "New Year" },
  { date: "2026-02-12", nameTh: "Makha Bucha" },
  { date: "2026-04-06", nameTh: "Chakri Memorial Day" },
  { date: "2026-04-13", nameTh: "Songkran" },
  { date: "2026-04-14", nameTh: "Songkran" },
  { date: "2026-04-15", nameTh: "Songkran" },
  { date: "2026-05-01", nameTh: "National Labour Day" },
  { date: "2026-06-01", nameTh: "Visakha Bucha" },
  { date: "2026-06-03", nameTh: "Queen Suthida Birthday" },
  { date: "2026-07-27", nameTh: "Asalha Bucha" },
  { date: "2026-07-28", nameTh: "King Vajiralongkorn Birthday" },
  { date: "2026-08-12", nameTh: "Queen Sirikit Birthday" },
  { date: "2026-10-13", nameTh: "King Bhumibol Memorial Day" },
  { date: "2026-10-23", nameTh: "Chulalongkorn Memorial Day" },
  { date: "2026-12-05", nameTh: "King Bhumibol Birthday" },
  { date: "2026-12-10", nameTh: "Constitution Day" },
  { date: "2026-12-31", nameTh: "New Year's Eve" },
].map((holiday) => ({
  ...holiday,
  nameEn: holiday.nameTh,
  isSubstitute: false,
  sourceUrl: PEA_TARIFF_SOURCE_TH,
}));

const residentialLowUseTiers = [
  tier("0-15 kWh", "0", "15", "2.3488", 1),
  tier("16-25 kWh", "15", "25", "2.9882", 2),
  tier("26-35 kWh", "25", "35", "3.2405", 3),
  tier("36-100 kWh", "35", "100", "3.6237", 4),
  tier("101-150 kWh", "100", "150", "3.7171", 5),
  tier("151-400 kWh", "150", "400", "4.2218", 6),
  tier("Over 400 kWh", "400", null, "4.4217", 7),
];

const standardProgressiveTiers = [
  tier("0-150 kWh", "0", "150", "3.2484", 1),
  tier("151-400 kWh", "150", "400", "4.2218", 2),
  tier("Over 400 kWh", "400", null, "4.4217", 3),
];

const metadataByAuthority = {
  PEA: {
    normalSourceUrl: PEA_TARIFF_SOURCE_TH,
    touSourceUrl: PEA_TARIFF_SOURCE_EN,
    mediumVoltageLabel: "22-33 kV",
    lowVoltageLabel: "lower than 22 kV",
  },
  MEA: {
    normalSourceUrl: MEA_RESIDENTIAL_SOURCE,
    touSourceUrl: MEA_RESIDENTIAL_SOURCE,
    mediumVoltageLabel: "12-24 kV",
    lowVoltageLabel: "lower than 12 kV",
  },
} as const;

export const officialThaiTariffVersions: TariffVersionConfig[] = (
  ["PEA", "MEA"] as const
).flatMap((authority) => {
  const meta = metadataByAuthority[authority];
  const smallBusinessSource =
    authority === "MEA" ? MEA_SMALL_BUSINESS_SOURCE : PEA_TARIFF_SOURCE_TH;

  return [
    normalTariff({
      authority,
      id: `${authority.toLowerCase()}-residential-normal-low-use-2026-05-published`,
      customerSegment: "residential",
      planName: `${authority} Residential Normal 1.1.1 up to 150 kWh`,
      serviceChargeThb: "8.19",
      voltageLevel: "low_voltage",
      sourceUrl: meta.normalSourceUrl,
      notes:
        "Official residential progressive normal rate for low-use customers. PEA calls this tariff 1.1.1; MEA labels residential normal subtypes as 1.1/1.2 on its calculator.",
      tiers: residentialLowUseTiers,
    }),
    normalTariff({
      authority,
      id: `${authority.toLowerCase()}-residential-normal-standard-2026-05-published`,
      customerSegment: "residential",
      planName: `${authority} Residential Normal 1.1.2 / 1.2 over 150 kWh`,
      serviceChargeThb: "24.62",
      voltageLevel: "low_voltage",
      sourceUrl: meta.normalSourceUrl,
      notes:
        "Official residential progressive normal rate for standard residential customers. Selected automatically for monthly use over 150 kWh unless explicitly overridden.",
      tiers: standardProgressiveTiers,
    }),
    touTariff({
      authority,
      id: `${authority.toLowerCase()}-residential-tou-low-voltage-2026-05-published`,
      customerSegment: "residential",
      planName: `${authority} Residential TOU low voltage`,
      serviceChargeThb: "24.62",
      voltageLevel: "low_voltage",
      sourceUrl: meta.touSourceUrl,
      notes:
        "Residential TOU energy rates. PEA lists this as 1.2; MEA lists residential TOU separately while using the same low-voltage TOU energy rates.",
      peakRate: authority === "PEA" ? "5.7982" : "5.7980",
      offPeakRate: authority === "PEA" ? "2.6369" : "2.6360",
    }),
    touTariff({
      authority,
      id: `${authority.toLowerCase()}-residential-tou-medium-voltage-2026-05-published`,
      customerSegment: "residential",
      planName: `${authority} Residential TOU ${meta.mediumVoltageLabel}`,
      serviceChargeThb: "312.24",
      voltageLevel: "medium_voltage",
      sourceUrl: meta.touSourceUrl,
      notes: `Residential TOU at ${meta.mediumVoltageLabel}.`,
      peakRate: "5.1135",
      offPeakRate: "2.6037",
    }),
    normalTariff({
      authority,
      id: `${authority.toLowerCase()}-small-business-normal-low-voltage-2026-05-published`,
      customerSegment: "small_business",
      planName: `${authority} Small General Service 2.1 low voltage`,
      serviceChargeThb: "33.29",
      voltageLevel: "low_voltage",
      sourceUrl: smallBusinessSource,
      notes:
        "Official small general service normal rate 2.1 for demand below 30 kW on low voltage.",
      tiers: standardProgressiveTiers,
    }),
    normalTariff({
      authority,
      id: `${authority.toLowerCase()}-small-business-normal-medium-voltage-2026-05-published`,
      customerSegment: "small_business",
      planName: `${authority} Small General Service 2.1 ${meta.mediumVoltageLabel}`,
      serviceChargeThb: "312.24",
      voltageLevel: "medium_voltage",
      sourceUrl: smallBusinessSource,
      notes: `Official small general service normal rate 2.1 at ${meta.mediumVoltageLabel}.`,
      tiers: [tier("All kWh", "0", null, "3.9086", 1)],
    }),
    touTariff({
      authority,
      id: `${authority.toLowerCase()}-small-business-tou-low-voltage-2026-05-published`,
      customerSegment: "small_business",
      planName: `${authority} Small General Service 2.2 low voltage`,
      serviceChargeThb: "33.29",
      voltageLevel: "low_voltage",
      sourceUrl: smallBusinessSource,
      notes:
        "Official small general service TOU rate 2.2 for demand below 30 kW on low voltage.",
      peakRate: "5.7982",
      offPeakRate: "2.6369",
    }),
    touTariff({
      authority,
      id: `${authority.toLowerCase()}-small-business-tou-medium-voltage-2026-05-published`,
      customerSegment: "small_business",
      planName: `${authority} Small General Service 2.2 ${meta.mediumVoltageLabel}`,
      serviceChargeThb: "312.24",
      voltageLevel: "medium_voltage",
      sourceUrl: smallBusinessSource,
      notes: `Official small general service TOU rate 2.2 at ${meta.mediumVoltageLabel}.`,
      peakRate: "5.1135",
      offPeakRate: "2.6037",
    }),
  ];
});

export function getOfficialThaiTariff(
  input: OfficialTariffLookupInput,
): TariffVersionConfig {
  const voltageLevel = input.voltageLevel ?? "low_voltage";
  const candidates = officialThaiTariffVersions.filter(
    (version) =>
      version.authority === input.authority &&
      version.customerSegment === input.customerSegment &&
      version.meterMode === input.meterMode &&
      version.voltageLevel === voltageLevel,
  );

  const selected =
    input.customerSegment === "residential" &&
    input.meterMode === "normal" &&
    voltageLevel === "low_voltage"
      ? candidates.find((version) =>
          input.monthlyEnergyKwh !== undefined && input.monthlyEnergyKwh <= 150
            ? version.id.includes("low-use")
            : version.id.includes("standard"),
        )
      : candidates[0];

  if (!selected) {
    throw new Error(
      `No official Thai tariff for ${input.authority} ${input.customerSegment} ${input.meterMode} ${voltageLevel}`,
    );
  }

  const billDate = input.billDate?.slice(0, 10);
  if (
    billDate &&
    !isEffectiveOn(billDate, selected.effectiveFrom, selected.effectiveTo)
  ) {
    throw new Error(
      `No official Thai tariff is verified for bill date ${billDate}.`,
    );
  }
  if (
    billDate &&
    !selected.ftPeriods.some((period) =>
      isEffectiveOn(billDate, period.effectiveFrom, period.effectiveTo),
    )
  ) {
    throw new Error(
      `No official Thai Ft rate is verified for bill date ${billDate}.`,
    );
  }

  return selected;
}

export function getOfficialThaiTariffPair(
  input: Omit<OfficialTariffLookupInput, "meterMode">,
): { normalTariff: TariffVersionConfig; touTariff: TariffVersionConfig } {
  return {
    normalTariff: getOfficialThaiTariff({ ...input, meterMode: "normal" }),
    touTariff: getOfficialThaiTariff({ ...input, meterMode: "tou" }),
  };
}

function normalTariff(input: {
  authority: Authority;
  id: string;
  customerSegment: "residential" | "small_business";
  planName: string;
  serviceChargeThb: string;
  voltageLevel: OfficialVoltageLevel;
  sourceUrl: string;
  notes: string;
  tiers: TariffVersionConfig["energyRateTiers"];
}): TariffVersionConfig {
  return baseTariff(input, "normal", {
    energyRateTiers: input.tiers,
    touPeriods: [],
  });
}

function touTariff(input: {
  authority: Authority;
  id: string;
  customerSegment: "residential" | "small_business";
  planName: string;
  serviceChargeThb: string;
  voltageLevel: OfficialVoltageLevel;
  sourceUrl: string;
  notes: string;
  peakRate: string;
  offPeakRate: string;
}): TariffVersionConfig {
  return baseTariff(input, "tou", {
    energyRateTiers: [],
    touPeriods: touPeriods(input.peakRate, input.offPeakRate),
  });
}

function baseTariff(
  input: {
    authority: Authority;
    id: string;
    customerSegment: "residential" | "small_business";
    planName: string;
    serviceChargeThb: string;
    voltageLevel: OfficialVoltageLevel;
    sourceUrl: string;
    notes: string;
  },
  meterMode: MeterMode,
  rates: Pick<TariffVersionConfig, "energyRateTiers" | "touPeriods">,
): TariffVersionConfig {
  return {
    id: input.id,
    authority: input.authority,
    customerSegment: input.customerSegment,
    meterMode,
    effectiveFrom: "2026-05-01",
    effectiveTo: "2026-08-31",
    status: "published",
    verifiedAt: VERIFIED_AT,
    sourceUrl: input.sourceUrl,
    verifiedBy: "Thai Energy Planner tariff seed",
    versionLabel: "official-2026-05-aug-with-ft-0.1623",
    planName: input.planName,
    voltageLevel: input.voltageLevel,
    serviceChargeThb: input.serviceChargeThb,
    notes: `${input.notes} Ft period May-Aug 2026 is 0.1623 THB/kWh before VAT.`,
    roundingPolicy: defaultRoundingPolicy,
    energyRateTiers: rates.energyRateTiers,
    touPeriods: rates.touPeriods,
    demandRates: [],
    ftPeriods: commonFtPeriods,
    taxRates: VAT_7,
    holidays: thaiTouHolidays2026,
    policyIncentives: [],
  };
}

function touPeriods(
  peakRate: string,
  offPeakRate: string,
): TariffVersionConfig["touPeriods"] {
  return [
    {
      label: "Peak weekday 09:00-22:00",
      periodType: "peak",
      startTime: "09:00",
      endTime: "22:00",
      daysOfWeek: [1, 2, 3, 4, 5],
      appliesOnHolidays: false,
      rateThbPerKwh: peakRate,
    },
    {
      label: "Off-Peak weekday 22:00-24:00",
      periodType: "off_peak",
      startTime: "22:00",
      endTime: "24:00",
      daysOfWeek: [1, 2, 3, 4, 5],
      appliesOnHolidays: false,
      rateThbPerKwh: offPeakRate,
    },
    {
      label: "Off-Peak weekday 00:00-09:00",
      periodType: "off_peak",
      startTime: "00:00",
      endTime: "09:00",
      daysOfWeek: [1, 2, 3, 4, 5],
      appliesOnHolidays: false,
      rateThbPerKwh: offPeakRate,
    },
    {
      label: "Off-Peak weekend",
      periodType: "off_peak",
      startTime: "00:00",
      endTime: "24:00",
      daysOfWeek: [0, 6],
      appliesOnHolidays: false,
      rateThbPerKwh: offPeakRate,
    },
    {
      label: "Off-Peak public holiday",
      periodType: "off_peak",
      startTime: "00:00",
      endTime: "24:00",
      daysOfWeek: [],
      appliesOnHolidays: true,
      rateThbPerKwh: offPeakRate,
    },
  ];
}

function tier(
  label: string,
  fromKwh: string,
  toKwh: string | null,
  rateThbPerKwh: string,
  sortOrder: number,
) {
  return { label, fromKwh, toKwh, rateThbPerKwh, sortOrder };
}

function isEffectiveOn(
  date: string,
  effectiveFrom: string,
  effectiveTo: string | null,
) {
  return date >= effectiveFrom && (effectiveTo === null || date <= effectiveTo);
}
