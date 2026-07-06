import Decimal from "decimal.js";
import { getBangkokParts, getDateKey, isDateInRange, isMinuteInRange } from "./date-time.js";
import type {
  CalculationComponent,
  CalculationLineItem,
  DemandRateConfig,
  EnergyRateTierConfig,
  FtPeriodConfig,
  HolidayConfig,
  IntervalTrace,
  NormalTariffCalculationInput,
  Numeric,
  PolicyIncentiveConfig,
  RoundingPolicy,
  TariffCalculationResult,
  TariffSelectionInput,
  TariffSnapshot,
  TariffVersionConfig,
  TariffVersionRef,
  TaxRateConfig,
  TouPeriodConfig,
  TouPeriodType,
  TouTariffCalculationInput
} from "./types.js";

export const tariffEngineVersion = "0.2.0-tariff-engine";

export const defaultRoundingPolicy: RoundingPolicy = {
  moneyDecimalPlaces: 2,
  energyDecimalPlaces: 6,
  demandDecimalPlaces: 6,
  roundingMode: "half_up",
  roundAt: "component"
};

const zero = new Decimal(0);

export const tariffSeedPolicy = {
  allowedStatuses: ["draft", "verified", "published", "retired"] as const,
  displayRequiredFields: [
    "อัตราที่ใช้ในการคำนวณ",
    "มีผลตั้งแต่วันที่",
    "วันที่ตรวจสอบข้อมูล",
    "แหล่งข้อมูล"
  ],
  unverifiedStatus: "draft"
};

export function selectTariffVersion<TVersion extends TariffVersionRef>(
  input: TariffSelectionInput<TVersion>
): TVersion | null {
  const targetDate = getDateKey(input.billDate ?? input.timestamp ?? "");
  const allowedStatuses = input.allowedStatuses ?? ["verified", "published"];

  return (
    input.versions
      .filter((version) => {
        if (version.authority !== input.authority) return false;
        if (version.customerSegment !== input.customerSegment) return false;
        if (version.meterMode !== input.meterMode) return false;
        if (!allowedStatuses.includes(version.status)) return false;

        return isDateInRange(targetDate, version.effectiveFrom, version.effectiveTo);
      })
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] ?? null
  );
}

export function createTariffSnapshot(
  tariffVersion: TariffVersionConfig,
  capturedAt = new Date().toISOString()
): TariffSnapshot {
  return {
    tariffVersionId: tariffVersion.id,
    engineVersion: tariffEngineVersion,
    capturedAt,
    status: tariffVersion.status,
    authority: tariffVersion.authority,
    effectiveFrom: tariffVersion.effectiveFrom,
    effectiveTo: tariffVersion.effectiveTo,
    sourceUrl: tariffVersion.sourceUrl,
    verifiedAt: tariffVersion.verifiedAt,
    verifiedBy: tariffVersion.verifiedBy,
    notes: tariffVersion.notes,
    tariffVersion
  };
}

export function calculateNormalBill(input: NormalTariffCalculationInput): TariffCalculationResult {
  assertMeterMode(input.tariffVersion, "normal");
  const roundingPolicy = normalizeRoundingPolicy(input.tariffVersion.roundingPolicy);
  const energyKwh = toDecimal(input.energyKwh);
  const baseEnergyChargeExact = calculateTieredEnergyCharge(energyKwh, input.tariffVersion.energyRateTiers).charge;
  const demandChargeExact = calculateDemandCharge(input.demandKw, input.tariffVersion.demandRates);
  const ftChargeExact = energyKwh.mul(selectFtPeriod(input.tariffVersion.ftPeriods, input.billDate).ftThbPerKwh);
  const serviceChargeExact = toDecimal(input.tariffVersion.serviceChargeThb);
  const discountExact = calculateDiscount(
    input.tariffVersion.policyIncentives,
    input.billDate,
    baseEnergyChargeExact.plus(demandChargeExact).plus(ftChargeExact).plus(serviceChargeExact)
  );
  const taxRate = toDecimal(selectTaxRate(input.tariffVersion.taxRates, input.billDate).ratePercent);

  return buildResult({
    mode: "normal",
    tariffVersion: input.tariffVersion,
    roundingPolicy,
    energyKwh,
    peakEnergyKwh: zero,
    offPeakEnergyKwh: zero,
    baseEnergyChargeExact,
    peakEnergyChargeExact: zero,
    offPeakEnergyChargeExact: zero,
    demandChargeExact,
    ftChargeExact,
    serviceChargeExact,
    discountExact,
    taxRatePercent: taxRate,
    snapshotCapturedAt: input.snapshotCapturedAt,
    lineItemDetails: [
      lineItem("baseEnergyCharge", "ค่าไฟฟ้าฐานแบบขั้นบันได", energyKwh, "kWh", null, baseEnergyChargeExact, {
        tiers: calculateTieredEnergyCharge(energyKwh, input.tariffVersion.energyRateTiers).segments
      }),
      lineItem("demandCharge", "ค่าความต้องการพลังไฟฟ้า", toDecimal(input.demandKw ?? 0), "kW", null, demandChargeExact, {
        demandRates: input.tariffVersion.demandRates
      }),
      lineItem(
        "ftCharge",
        "ค่า Ft",
        energyKwh,
        "kWh",
        decimalToFixed(toDecimal(selectFtPeriod(input.tariffVersion.ftPeriods, input.billDate).ftThbPerKwh), 6),
        ftChargeExact,
        { ftPeriod: selectFtPeriod(input.tariffVersion.ftPeriods, input.billDate) }
      ),
      lineItem("serviceCharge", "ค่าบริการรายเดือน", new Decimal(1), "เดือน", null, serviceChargeExact, {})
    ],
    intervalTraces: []
  });
}

export function calculateNormalBillFromVersions(
  input: Omit<NormalTariffCalculationInput, "tariffVersion"> & {
    versions: TariffVersionConfig[];
    authority: TariffVersionConfig["authority"];
    customerSegment: TariffVersionConfig["customerSegment"];
    allowedStatuses?: TariffSelectionInput<TariffVersionConfig>["allowedStatuses"];
  }
): TariffCalculationResult {
  const tariffVersion = selectTariffVersion({
    authority: input.authority,
    customerSegment: input.customerSegment,
    meterMode: "normal",
    billDate: input.billDate,
    versions: input.versions,
    allowedStatuses: input.allowedStatuses
  });

  if (!tariffVersion) {
    throw new Error(`No matching tariff version for ${input.billDate}`);
  }

  return calculateNormalBill({
    tariffVersion,
    billDate: input.billDate,
    energyKwh: input.energyKwh,
    demandKw: input.demandKw,
    snapshotCapturedAt: input.snapshotCapturedAt
  });
}

export function calculateTouBill(input: TouTariffCalculationInput): TariffCalculationResult {
  assertMeterMode(input.tariffVersion, "tou");
  const roundingPolicy = normalizeRoundingPolicy(input.tariffVersion.roundingPolicy);

  let peakEnergyKwh = zero;
  let offPeakEnergyKwh = zero;
  let peakEnergyChargeExact = zero;
  let offPeakEnergyChargeExact = zero;
  let ftChargeExact = zero;
  const traces: IntervalTrace[] = [];

  for (const interval of input.intervals) {
    const energyKwh = toDecimal(interval.energyKwh);
    const local = getBangkokParts(interval.timestamp);
    const holiday = findHoliday(input.tariffVersion.holidays, local.date);
    const period = selectTouPeriod(input.tariffVersion.touPeriods, interval.timestamp, Boolean(holiday));
    const intervalCharge = energyKwh.mul(period.rateThbPerKwh);
    const ftPeriod = selectFtPeriod(input.tariffVersion.ftPeriods, interval.timestamp);
    const intervalFtCharge = energyKwh.mul(ftPeriod.ftThbPerKwh);

    if (period.periodType === "peak") {
      peakEnergyKwh = peakEnergyKwh.plus(energyKwh);
      peakEnergyChargeExact = peakEnergyChargeExact.plus(intervalCharge);
    } else {
      offPeakEnergyKwh = offPeakEnergyKwh.plus(energyKwh);
      offPeakEnergyChargeExact = offPeakEnergyChargeExact.plus(intervalCharge);
    }

    ftChargeExact = ftChargeExact.plus(intervalFtCharge);
    traces.push({
      timestamp: interval.timestamp,
      localDate: local.date,
      localTime: local.time,
      dayOfWeek: local.dayOfWeek,
      isHoliday: Boolean(holiday),
      periodLabel: period.label,
      periodType: period.periodType,
      energyKwh: decimalToFixed(energyKwh, roundingPolicy.energyDecimalPlaces),
      rateThbPerKwh: decimalToFixed(toDecimal(period.rateThbPerKwh), 6),
      energyChargeThb: decimalToFixed(intervalCharge, 6),
      ftRateThbPerKwh: decimalToFixed(toDecimal(ftPeriod.ftThbPerKwh), 6),
      ftChargeThb: decimalToFixed(intervalFtCharge, 6)
    });
  }

  const totalEnergyKwh = peakEnergyKwh.plus(offPeakEnergyKwh);
  const demandChargeExact = calculateDemandCharge(input.demandKw, input.tariffVersion.demandRates);
  const serviceChargeExact = toDecimal(input.tariffVersion.serviceChargeThb);
  const subtotalBeforeDiscount = peakEnergyChargeExact
    .plus(offPeakEnergyChargeExact)
    .plus(demandChargeExact)
    .plus(ftChargeExact)
    .plus(serviceChargeExact);
  const calculationDate = input.intervals[0]?.timestamp ?? input.tariffVersion.effectiveFrom;
  const discountExact = calculateDiscount(input.tariffVersion.policyIncentives, calculationDate, subtotalBeforeDiscount);
  const taxRate = toDecimal(selectTaxRate(input.tariffVersion.taxRates, calculationDate).ratePercent);

  return buildResult({
    mode: "tou",
    tariffVersion: input.tariffVersion,
    roundingPolicy,
    energyKwh: totalEnergyKwh,
    peakEnergyKwh,
    offPeakEnergyKwh,
    baseEnergyChargeExact: zero,
    peakEnergyChargeExact,
    offPeakEnergyChargeExact,
    demandChargeExact,
    ftChargeExact,
    serviceChargeExact,
    discountExact,
    taxRatePercent: taxRate,
    snapshotCapturedAt: input.snapshotCapturedAt,
    lineItemDetails: [
      lineItem("peakEnergyCharge", "ค่าไฟช่วง Peak", peakEnergyKwh, "kWh", null, peakEnergyChargeExact, {}),
      lineItem("offPeakEnergyCharge", "ค่าไฟช่วง Off-Peak", offPeakEnergyKwh, "kWh", null, offPeakEnergyChargeExact, {}),
      lineItem("demandCharge", "ค่าความต้องการพลังไฟฟ้า", toDecimal(input.demandKw ?? 0), "kW", null, demandChargeExact, {
        demandRates: input.tariffVersion.demandRates
      }),
      lineItem("ftCharge", "ค่า Ft", totalEnergyKwh, "kWh", null, ftChargeExact, {}),
      lineItem("serviceCharge", "ค่าบริการรายเดือน", new Decimal(1), "เดือน", null, serviceChargeExact, {})
    ],
    intervalTraces: traces
  });
}

export function calculateTouBillFromVersions(
  input: Omit<TouTariffCalculationInput, "tariffVersion"> & {
    versions: TariffVersionConfig[];
    authority: TariffVersionConfig["authority"];
    customerSegment: TariffVersionConfig["customerSegment"];
    allowedStatuses?: TariffSelectionInput<TariffVersionConfig>["allowedStatuses"];
  }
): TariffCalculationResult {
  const firstTimestamp = input.intervals[0]?.timestamp;
  if (!firstTimestamp) {
    throw new Error("TOU calculation requires at least one interval");
  }

  const tariffVersion = selectTariffVersion({
    authority: input.authority,
    customerSegment: input.customerSegment,
    meterMode: "tou",
    timestamp: firstTimestamp,
    versions: input.versions,
    allowedStatuses: input.allowedStatuses
  });

  if (!tariffVersion) {
    throw new Error(`No matching tariff version for ${firstTimestamp}`);
  }

  return calculateTouBill({
    tariffVersion,
    intervals: input.intervals,
    demandKw: input.demandKw,
    snapshotCapturedAt: input.snapshotCapturedAt
  });
}

export type MoneyComponentResult = {
  amountThb: string;
  exactAmountThb: string;
};

export type TotalBillBreakdown = {
  energyChargeThb: string;
  ftChargeThb: string;
  serviceChargeThb: string;
  demandChargeThb: string;
  discountThb: string;
  totalBeforeVatThb: string;
  vatThb: string;
  totalBillThb: string;
};

export function calculateEnergyCharge(input: {
  energyKwh: Numeric;
  rateThbPerKwh?: Numeric | undefined;
  tiers?: EnergyRateTierConfig[] | undefined;
  roundingPolicy?: RoundingPolicy | undefined;
}): MoneyComponentResult {
  const roundingPolicy = normalizeRoundingPolicy(input.roundingPolicy);
  const energyKwh = toDecimal(input.energyKwh);
  const amount =
    input.tiers && input.tiers.length > 0
      ? calculateTieredEnergyCharge(energyKwh, input.tiers).charge
      : energyKwh.mul(toDecimal(input.rateThbPerKwh ?? 0));
  return moneyComponent(amount, roundingPolicy);
}

export function calculateFtCharge(input: {
  energyKwh: Numeric;
  ftThbPerKwh: Numeric;
  roundingPolicy?: RoundingPolicy | undefined;
}): MoneyComponentResult {
  return moneyComponent(toDecimal(input.energyKwh).mul(input.ftThbPerKwh), normalizeRoundingPolicy(input.roundingPolicy));
}

export function calculateVat(input: {
  totalBeforeVatThb: Numeric;
  vatRatePercent: Numeric;
  roundingPolicy?: RoundingPolicy | undefined;
}): MoneyComponentResult {
  return moneyComponent(toDecimal(input.totalBeforeVatThb).mul(input.vatRatePercent).div(100), normalizeRoundingPolicy(input.roundingPolicy));
}

export function calculateTotalBill(input: {
  energyChargeThb: Numeric;
  ftChargeThb: Numeric;
  serviceChargeThb: Numeric;
  vatRatePercent: Numeric;
  demandChargeThb?: Numeric | undefined;
  discountThb?: Numeric | undefined;
  roundingPolicy?: RoundingPolicy | undefined;
}): TotalBillBreakdown {
  const roundingPolicy = normalizeRoundingPolicy(input.roundingPolicy);
  const energyCharge = roundMoney(toDecimal(input.energyChargeThb), roundingPolicy);
  const ftCharge = roundMoney(toDecimal(input.ftChargeThb), roundingPolicy);
  const serviceCharge = roundMoney(toDecimal(input.serviceChargeThb), roundingPolicy);
  const demandCharge = roundMoney(toDecimal(input.demandChargeThb ?? 0), roundingPolicy);
  const discount = roundMoney(toDecimal(input.discountThb ?? 0), roundingPolicy);
  const totalBeforeVat = energyCharge.plus(ftCharge).plus(serviceCharge).plus(demandCharge).minus(discount);
  const vat = roundMoney(totalBeforeVat.mul(input.vatRatePercent).div(100), roundingPolicy);
  const totalBill = totalBeforeVat.plus(vat);

  return {
    energyChargeThb: decimalToFixed(energyCharge, 2),
    ftChargeThb: decimalToFixed(ftCharge, 2),
    serviceChargeThb: decimalToFixed(serviceCharge, 2),
    demandChargeThb: decimalToFixed(demandCharge, 2),
    discountThb: decimalToFixed(discount, 2),
    totalBeforeVatThb: decimalToFixed(totalBeforeVat, 2),
    vatThb: decimalToFixed(vat, 2),
    totalBillThb: decimalToFixed(totalBill, 2)
  };
}

export function classifyTouPeriod(input: {
  timestamp: string;
  touPeriods: TouPeriodConfig[];
  holidays?: HolidayConfig[] | undefined;
}): {
  periodType: TouPeriodType;
  periodLabel: string;
  isHoliday: boolean;
  localDate: string;
  localTime: string;
} {
  const local = getBangkokParts(input.timestamp);
  const isHoliday = Boolean(findHoliday(input.holidays ?? [], local.date));
  const period = selectTouPeriod(input.touPeriods, input.timestamp, isHoliday);
  return {
    periodType: period.periodType,
    periodLabel: period.label,
    isHoliday,
    localDate: local.date,
    localTime: local.time
  };
}

export function selectTouPeriod(periods: TouPeriodConfig[], timestamp: string, isHoliday: boolean): TouPeriodConfig {
  const local = getBangkokParts(timestamp);
  const candidates = periods.filter((period) => {
    const holidayMatches = isHoliday && period.appliesOnHolidays;
    const dayMatches = !isHoliday && period.daysOfWeek.includes(local.dayOfWeek);
    return (holidayMatches || dayMatches) && isMinuteInRange(local.minuteOfDay, period.startTime, period.endTime);
  });

  const match = candidates[0];
  if (!match) {
    throw new Error(`No TOU period matched ${timestamp}`);
  }

  return match;
}

function buildResult(input: {
  mode: "normal" | "tou";
  tariffVersion: TariffVersionConfig;
  roundingPolicy: RoundingPolicy;
  energyKwh: Decimal;
  peakEnergyKwh: Decimal;
  offPeakEnergyKwh: Decimal;
  baseEnergyChargeExact: Decimal;
  peakEnergyChargeExact: Decimal;
  offPeakEnergyChargeExact: Decimal;
  demandChargeExact: Decimal;
  ftChargeExact: Decimal;
  serviceChargeExact: Decimal;
  discountExact: Decimal;
  taxRatePercent: Decimal;
  snapshotCapturedAt?: string | undefined;
  lineItemDetails: CalculationLineItem[];
  intervalTraces: IntervalTrace[];
}): TariffCalculationResult {
  const baseEnergyCharge = roundMoney(input.baseEnergyChargeExact, input.roundingPolicy);
  const peakEnergyCharge = roundMoney(input.peakEnergyChargeExact, input.roundingPolicy);
  const offPeakEnergyCharge = roundMoney(input.offPeakEnergyChargeExact, input.roundingPolicy);
  const demandCharge = roundMoney(input.demandChargeExact, input.roundingPolicy);
  const ftCharge = roundMoney(input.ftChargeExact, input.roundingPolicy);
  const serviceCharge = roundMoney(input.serviceChargeExact, input.roundingPolicy);
  const discount = roundMoney(input.discountExact, input.roundingPolicy);
  const subtotalBeforeVat = baseEnergyCharge
    .plus(peakEnergyCharge)
    .plus(offPeakEnergyCharge)
    .plus(demandCharge)
    .plus(ftCharge)
    .plus(serviceCharge)
    .minus(discount);
  const vat = roundMoney(subtotalBeforeVat.mul(input.taxRatePercent).div(100), input.roundingPolicy);
  const grandTotal = subtotalBeforeVat.plus(vat);
  const effectiveRatePerKwh = input.energyKwh.gt(0) ? grandTotal.div(input.energyKwh) : zero;

  const lineItems = input.lineItemDetails.map((item) => ({
    ...item,
    amountThb: decimalToFixed(roundMoney(new Decimal(item.exactAmountThb), input.roundingPolicy), 2)
  }));

  lineItems.push(
    lineItem("discount", "ส่วนลด", new Decimal(1), "รายการ", null, discount, {}),
    lineItem("subtotalBeforeVat", "รวมก่อน VAT", new Decimal(1), "รายการ", null, subtotalBeforeVat, {}),
    lineItem("vat", `VAT ${decimalToFixed(input.taxRatePercent, 4)}%`, new Decimal(1), "รายการ", null, vat, {}),
    lineItem("grandTotal", "รวมทั้งสิ้น", new Decimal(1), "รายการ", null, grandTotal, {})
  );

  return {
    mode: input.mode,
    tariffVersionId: input.tariffVersion.id,
    tariffVersionLabel: input.tariffVersion.versionLabel,
    tariffStatus: input.tariffVersion.status,
    sourceUrl: input.tariffVersion.sourceUrl,
    verifiedAt: input.tariffVersion.verifiedAt,
    tariffSnapshot: createTariffSnapshot(input.tariffVersion, input.snapshotCapturedAt),
    energyKwh: decimalToFixed(input.energyKwh, input.roundingPolicy.energyDecimalPlaces),
    peakEnergyKwh: decimalToFixed(input.peakEnergyKwh, input.roundingPolicy.energyDecimalPlaces),
    offPeakEnergyKwh: decimalToFixed(input.offPeakEnergyKwh, input.roundingPolicy.energyDecimalPlaces),
    baseEnergyCharge: decimalToFixed(baseEnergyCharge, 2),
    peakEnergyCharge: decimalToFixed(peakEnergyCharge, 2),
    offPeakEnergyCharge: decimalToFixed(offPeakEnergyCharge, 2),
    demandCharge: decimalToFixed(demandCharge, 2),
    ftCharge: decimalToFixed(ftCharge, 2),
    serviceCharge: decimalToFixed(serviceCharge, 2),
    discount: decimalToFixed(discount, 2),
    subtotalBeforeVat: decimalToFixed(subtotalBeforeVat, 2),
    vat: decimalToFixed(vat, 2),
    grandTotal: decimalToFixed(grandTotal, 2),
    effectiveRatePerKwh: decimalToFixed(effectiveRatePerKwh, 6),
    lineItems,
    intervalTraces: input.intervalTraces,
    roundingPolicy: input.roundingPolicy
  };
}

function calculateTieredEnergyCharge(energyKwh: Decimal, tiers: TariffVersionConfig["energyRateTiers"]) {
  const segments = tiers
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((tier) => {
      const from = toDecimal(tier.fromKwh);
      const upper = tier.toKwh === null ? energyKwh : Decimal.min(energyKwh, toDecimal(tier.toKwh));
      const segmentKwh = Decimal.max(upper.minus(from), zero);
      const amount = segmentKwh.mul(tier.rateThbPerKwh);
      return {
        label: tier.label ?? `${tier.fromKwh}-${tier.toKwh ?? "∞"} kWh`,
        fromKwh: decimalToFixed(from, 6),
        toKwh: tier.toKwh === null ? null : decimalToFixed(toDecimal(tier.toKwh), 6),
        kwh: decimalToFixed(segmentKwh, 6),
        rateThbPerKwh: decimalToFixed(toDecimal(tier.rateThbPerKwh), 6),
        amountThb: decimalToFixed(amount, 6)
      };
    });

  return {
    charge: segments.reduce((sum, segment) => sum.plus(segment.amountThb), zero),
    segments
  };
}

function calculateDemandCharge(demandKw: Numeric | undefined, demandRates: DemandRateConfig[]): Decimal {
  if (!demandKw || demandRates.length === 0) {
    return zero;
  }

  const rate = demandRates[0];
  if (!rate) {
    return zero;
  }

  return toDecimal(demandKw).mul(rate.rateThbPerKw);
}

function calculateDiscount(incentives: PolicyIncentiveConfig[], date: string, subtotal: Decimal): Decimal {
  return incentives
    .filter((incentive) => isDateInRange(date, incentive.effectiveFrom, incentive.effectiveTo))
    .reduce((sum, incentive) => {
      if (incentive.valueType === "fixed_thb") {
        return sum.plus(incentive.value);
      }

      return sum.plus(subtotal.mul(incentive.value).div(100));
    }, zero);
}

function selectFtPeriod(periods: FtPeriodConfig[], date: string): FtPeriodConfig {
  const period = periods.find((candidate) => isDateInRange(date, candidate.effectiveFrom, candidate.effectiveTo));
  if (!period) {
    throw new Error(`No Ft period matched ${date}`);
  }

  return period;
}

function selectTaxRate(rates: TaxRateConfig[], date: string): TaxRateConfig {
  const rate = rates.find((candidate) => isDateInRange(date, candidate.effectiveFrom, candidate.effectiveTo));
  if (!rate) {
    throw new Error(`No tax rate matched ${date}`);
  }

  return rate;
}

function findHoliday(holidays: HolidayConfig[], date: string): HolidayConfig | null {
  return holidays.find((holiday) => getDateKey(holiday.date) === date) ?? null;
}

function lineItem(
  component: CalculationComponent,
  labelTh: string,
  quantity: Decimal,
  unit: string,
  rate: string | null,
  amount: Decimal,
  trace: Record<string, unknown>
): CalculationLineItem {
  return {
    component,
    labelTh,
    quantity: decimalToFixed(quantity, 6),
    unit,
    rate,
    amountThb: decimalToFixed(amount, 2),
    exactAmountThb: decimalToFixed(amount, 6),
    trace
  };
}

function assertMeterMode(tariffVersion: TariffVersionConfig, expectedMode: "normal" | "tou") {
  if (tariffVersion.meterMode !== expectedMode) {
    throw new Error(`Tariff version ${tariffVersion.id} is ${tariffVersion.meterMode}, expected ${expectedMode}`);
  }
}

function normalizeRoundingPolicy(policy: RoundingPolicy | undefined): RoundingPolicy {
  return policy ?? defaultRoundingPolicy;
}

function roundMoney(value: Decimal, policy: RoundingPolicy): Decimal {
  return value.toDecimalPlaces(policy.moneyDecimalPlaces, Decimal.ROUND_HALF_UP);
}

function moneyComponent(value: Decimal, policy: RoundingPolicy): MoneyComponentResult {
  return {
    amountThb: decimalToFixed(roundMoney(value, policy), 2),
    exactAmountThb: decimalToFixed(value, 6)
  };
}

function toDecimal(value: Numeric): Decimal {
  return new Decimal(value);
}

function decimalToFixed(value: Decimal, decimalPlaces: number): string {
  return value.toFixed(decimalPlaces);
}
