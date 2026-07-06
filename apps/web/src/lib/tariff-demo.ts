import {
  calculateNormalBill,
  calculateTouBill,
  getOfficialThaiTariffPair,
  type LoadIntervalForTariff,
  type TariffCalculationResult
} from "@thai-energy-planner/tariff-engine";

export type TariffDemoSearchParams = Record<string, string | string[] | undefined>;

type SupportedAuthority = "PEA" | "MEA";
type SupportedCustomerSegment = "residential" | "small_business";

export type OfficialTariffDemo = {
  authority: SupportedAuthority;
  billDate: string;
  customerSegment: SupportedCustomerSegment;
  normalKwh: string;
  normalResult: TariffCalculationResult;
  touIntervals: LoadIntervalForTariff[];
  touResult: TariffCalculationResult;
  warnings: string[];
};

const defaultBillDate = "2026-07-01";
const officialSeedEffectiveFrom = "2026-05-01";
const officialSeedEffectiveTo = "2026-08-31";

export function getOfficialTariffDemo(params: TariffDemoSearchParams): OfficialTariffDemo {
  const warnings: string[] = [];
  const normalKwh = normalizeEnergyKwh(getSingleParam(params.normalKwh), warnings);
  const billDate = normalizeBillDate(getSingleParam(params.billDate), warnings);
  const authority = normalizeAuthority(getSingleParam(params.authority));
  const customerSegment = normalizeCustomerSegment(getSingleParam(params.customerSegment));
  const tariffs = getOfficialThaiTariffPair({
    authority,
    billDate,
    customerSegment,
    monthlyEnergyKwh: Number(normalKwh),
    voltageLevel: "low_voltage"
  });
  const touIntervals = buildRepresentativeTouIntervals(billDate);

  return {
    authority,
    billDate,
    customerSegment,
    normalKwh,
    normalResult: calculateNormalBill({
      tariffVersion: tariffs.normalTariff,
      billDate,
      energyKwh: normalKwh
    }),
    touIntervals,
    touResult: calculateTouBill({
      tariffVersion: tariffs.touTariff,
      intervals: touIntervals
    }),
    warnings
  };
}

function buildRepresentativeTouIntervals(billDate: string): LoadIntervalForTariff[] {
  const weekday = findDateInMonth(billDate, (dayOfWeek) => dayOfWeek >= 1 && dayOfWeek <= 5);
  const weekend = findDateInMonth(billDate, (dayOfWeek) => dayOfWeek === 0 || dayOfWeek === 6);

  return [
    { timestamp: `${weekday}T10:00:00+07:00`, energyKwh: "100" },
    { timestamp: `${weekday}T23:00:00+07:00`, energyKwh: "100" },
    { timestamp: `${weekend}T14:00:00+07:00`, energyKwh: "40" }
  ];
}

function findDateInMonth(billDate: string, predicate: (dayOfWeek: number) => boolean) {
  const [yearText = "2026", monthText = "07"] = billDate.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayOfWeek = new Date(Date.UTC(year, monthIndex, day, 12, 0, 0)).getUTCDay();
    if (predicate(dayOfWeek)) return `${yearText}-${monthText}-${String(day).padStart(2, "0")}`;
  }

  return `${yearText}-${monthText}-01`;
}

function normalizeAuthority(value: string | undefined): SupportedAuthority {
  return value === "MEA" ? "MEA" : "PEA";
}

function normalizeCustomerSegment(value: string | undefined): SupportedCustomerSegment {
  return value === "small_business" ? "small_business" : "residential";
}

function normalizeBillDate(value: string | undefined, warnings: string[]) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= officialSeedEffectiveFrom && value <= officialSeedEffectiveTo) {
    return value;
  }

  if (value) {
    warnings.push(
      `Official tariff seed in this demo covers ${officialSeedEffectiveFrom} to ${officialSeedEffectiveTo}; ${defaultBillDate} was used instead.`
    );
  }
  return defaultBillDate;
}

function normalizeEnergyKwh(value: string | undefined, warnings: string[]) {
  if (!value) return "250";
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) return String(parsed);
  warnings.push("Monthly kWh must be non-negative; 250 kWh was used instead.");
  return "250";
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
