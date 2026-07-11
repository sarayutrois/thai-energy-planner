import type {
  Authority,
  CustomerSegment,
  MeterMode,
  TariffStatus,
} from "@thai-energy-planner/shared-types";

export type Numeric = number | string;

export type RoundingPolicy = {
  moneyDecimalPlaces: number;
  energyDecimalPlaces: number;
  demandDecimalPlaces: number;
  roundingMode: "half_up";
  roundAt: "component";
};

export type TariffVersionRef = {
  id: string;
  authority: Authority;
  customerSegment: CustomerSegment;
  meterMode: MeterMode;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: TariffStatus;
  verifiedAt: string | null;
  sourceUrl: string | null;
};

export type EnergyRateTierConfig = {
  id?: string;
  label?: string;
  fromKwh: Numeric;
  toKwh: Numeric | null;
  rateThbPerKwh: Numeric;
  sortOrder: number;
};

export type TouPeriodType = "peak" | "off_peak";

export type TouPeriodConfig = {
  id?: string;
  label: string;
  periodType: TouPeriodType;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  appliesOnHolidays: boolean;
  rateThbPerKwh: Numeric;
};

export type DemandRateConfig = {
  id?: string;
  label: string;
  rateThbPerKw: Numeric;
  startTime?: string | null;
  endTime?: string | null;
  daysOfWeek?: number[];
};

export type FtPeriodConfig = {
  id?: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  ftThbPerKwh: Numeric;
  sourceUrl: string | null;
  verifiedAt: string | null;
};

export type TaxRateConfig = {
  id?: string;
  name: string;
  ratePercent: Numeric;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type HolidayConfig = {
  id?: string;
  date: string;
  nameTh: string;
  nameEn?: string | null;
  isSubstitute: boolean;
  sourceUrl?: string | null;
};

export type PolicyIncentiveConfig = {
  id?: string;
  name: string;
  description: string;
  valueType: "fixed_thb" | "percent_subtotal";
  value: Numeric;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type TariffVersionConfig = TariffVersionRef & {
  versionLabel: string;
  planName: string;
  voltageLevel: string | null;
  serviceChargeThb: Numeric;
  verifiedBy: string | null;
  notes: string;
  roundingPolicy: RoundingPolicy;
  energyRateTiers: EnergyRateTierConfig[];
  touPeriods: TouPeriodConfig[];
  demandRates: DemandRateConfig[];
  ftPeriods: FtPeriodConfig[];
  taxRates: TaxRateConfig[];
  holidays: HolidayConfig[];
  policyIncentives: PolicyIncentiveConfig[];
};

export type TariffSelectionInput<
  TVersion extends TariffVersionRef = TariffVersionRef,
> = {
  authority: Authority;
  customerSegment: CustomerSegment;
  meterMode: MeterMode;
  billDate?: string;
  timestamp?: string;
  versions: TVersion[];
  allowedStatuses?: TariffStatus[] | undefined;
};

export type LoadIntervalForTariff = {
  timestamp: string;
  energyKwh: Numeric;
  powerKw?: Numeric;
};

export type NormalTariffCalculationInput = {
  tariffVersion: TariffVersionConfig;
  billDate: string;
  energyKwh: Numeric;
  demandKw?: Numeric | undefined;
  snapshotCapturedAt?: string | undefined;
};

export type TouTariffCalculationInput = {
  tariffVersion: TariffVersionConfig;
  intervals: LoadIntervalForTariff[];
  /** Uses one verified Ft period for a screening run while retaining interval timestamps for TOU classification. */
  ftBillDate?: string | undefined;
  demandKw?: Numeric | undefined;
  snapshotCapturedAt?: string | undefined;
};

export type CalculationComponent =
  | "baseEnergyCharge"
  | "peakEnergyCharge"
  | "offPeakEnergyCharge"
  | "demandCharge"
  | "ftCharge"
  | "serviceCharge"
  | "discount"
  | "subtotalBeforeVat"
  | "vat"
  | "grandTotal";

export type CalculationLineItem = {
  component: CalculationComponent;
  labelTh: string;
  quantity: string;
  unit: string;
  rate: string | null;
  amountThb: string;
  exactAmountThb: string;
  trace: Record<string, unknown>;
};

export type IntervalTrace = {
  timestamp: string;
  localDate: string;
  localTime: string;
  dayOfWeek: number;
  isHoliday: boolean;
  periodLabel: string;
  periodType: TouPeriodType;
  energyKwh: string;
  rateThbPerKwh: string;
  energyChargeThb: string;
  ftRateThbPerKwh: string;
  ftChargeThb: string;
};

export type TariffSnapshot = {
  tariffVersionId: string;
  engineVersion: string;
  capturedAt: string;
  status: TariffStatus;
  authority: Authority;
  effectiveFrom: string;
  effectiveTo: string | null;
  sourceUrl: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  notes: string;
  tariffVersion: TariffVersionConfig;
};

export type TariffCalculationResult = {
  mode: MeterMode;
  tariffVersionId: string;
  tariffVersionLabel: string;
  tariffStatus: TariffStatus;
  sourceUrl: string | null;
  verifiedAt: string | null;
  tariffSnapshot: TariffSnapshot;
  energyKwh: string;
  peakEnergyKwh: string;
  offPeakEnergyKwh: string;
  baseEnergyCharge: string;
  peakEnergyCharge: string;
  offPeakEnergyCharge: string;
  demandCharge: string;
  ftCharge: string;
  serviceCharge: string;
  discount: string;
  subtotalBeforeVat: string;
  vat: string;
  grandTotal: string;
  effectiveRatePerKwh: string;
  lineItems: CalculationLineItem[];
  intervalTraces: IntervalTrace[];
  roundingPolicy: RoundingPolicy;
};
