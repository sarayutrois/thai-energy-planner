import type {
  Authority,
  CustomerSegment,
  LoadIntervalInput,
  MeterMode,
  MonthlyBillInput,
} from "@thai-energy-planner/shared-types";

export type TariffPlan = {
  id: string;
  authority: Authority;
  customerSegment: CustomerSegment;
  meterMode: MeterMode;
  versionLabel: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  sourceUrl: string | null;
};

export type TariffRate = {
  label: string;
  fromKwh?: number | undefined;
  toKwh?: number | null | undefined;
  energyRateThbPerKwh: number;
};

export type FtRate = {
  effectiveFrom: string;
  effectiveTo: string | null;
  ftThbPerKwh: number;
};

export type TouPeriod = {
  label: string;
  periodType: "peak" | "off_peak";
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  appliesOnHolidays: boolean;
  energyRateThbPerKwh: number;
};

export type LoadReading = LoadIntervalInput;
export type MonthlyBill = MonthlyBillInput;

export type SolarConfig = {
  province: string;
  systemSizeKwp: number;
  roofAreaSqm?: number | undefined;
  roofAzimuth?: number | undefined;
  roofTilt?: number | undefined;
  systemLossPercent: number;
  shadingLossPercent: number;
};

export type PvGenerationPoint = {
  timestamp: string;
  pvGenerationKwh: number;
  powerKw?: number | undefined;
};

export type BillBreakdown = {
  energyChargeThb: number;
  ftChargeThb: number;
  serviceChargeThb: number;
  vatThb: number;
  totalBeforeVatThb: number;
  totalBillThb: number;
};
