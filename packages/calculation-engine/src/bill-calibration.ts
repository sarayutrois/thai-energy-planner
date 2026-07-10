import Decimal from "decimal.js";
import {
  CanonicalLoadProfileSchema,
  MonthlyBillInputSchema,
  type CanonicalLoadProfile,
  type MonthlyBillInput,
} from "@thai-energy-planner/shared-types";

export type BillCalibrationInput = {
  profile: CanonicalLoadProfile;
  bills: MonthlyBillInput[];
};

export type BillCalibrationResult = {
  comparedMonths: Array<{
    month: string;
    profileKwh: number;
    billKwh: number;
    varianceKwh: number;
    variancePercent: number | null;
  }>;
  profileKwh: number;
  billKwh: number;
  varianceKwh: number;
  variancePercent: number | null;
  warnings: string[];
};

/** Compares only overlapping calendar months; it never invents missing load data. */
export function calibrateLoadProfileAgainstBills(
  input: BillCalibrationInput,
): BillCalibrationResult {
  const profile = CanonicalLoadProfileSchema.parse(input.profile);
  const bills = input.bills.map((bill) => MonthlyBillInputSchema.parse(bill));
  const billByMonth = new Map<string, MonthlyBillInput>();
  for (const bill of bills) {
    if (billByMonth.has(bill.month)) {
      throw new Error(`Duplicate bill month: ${bill.month}`);
    }
    billByMonth.set(bill.month, bill);
  }

  const profileByMonth = new Map<string, Decimal>();
  for (const interval of profile.intervals) {
    const month = bangkokMonth(interval.timestamp);
    profileByMonth.set(
      month,
      (profileByMonth.get(month) ?? new Decimal(0)).plus(interval.energyKwh),
    );
  }

  const comparedMonths = [...profileByMonth.entries()]
    .filter(([month]) => billByMonth.has(month))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, profileEnergy]) => {
      const billEnergy = new Decimal(billByMonth.get(month)!.energyKwh);
      const variance = profileEnergy.minus(billEnergy);
      return {
        month,
        profileKwh: profileEnergy.toDecimalPlaces(6).toNumber(),
        billKwh: billEnergy.toDecimalPlaces(6).toNumber(),
        varianceKwh: variance.toDecimalPlaces(6).toNumber(),
        variancePercent: billEnergy.gt(0)
          ? variance.div(billEnergy).mul(100).toDecimalPlaces(2).toNumber()
          : null,
      };
    });

  const profileKwh = comparedMonths.reduce(
    (total, month) => total.plus(month.profileKwh),
    new Decimal(0),
  );
  const billKwh = comparedMonths.reduce(
    (total, month) => total.plus(month.billKwh),
    new Decimal(0),
  );
  const variance = profileKwh.minus(billKwh);
  const warnings: string[] = [];

  if (comparedMonths.length === 0) {
    warnings.push("No bill months overlap with the load profile period.");
  }
  if (profileByMonth.size !== comparedMonths.length) {
    warnings.push(
      "Some load-profile months have no matching bill and were excluded.",
    );
  }
  if (billByMonth.size !== comparedMonths.length) {
    warnings.push(
      "Some bill months have no matching load profile and were excluded.",
    );
  }

  return {
    comparedMonths,
    profileKwh: profileKwh.toDecimalPlaces(6).toNumber(),
    billKwh: billKwh.toDecimalPlaces(6).toNumber(),
    varianceKwh: variance.toDecimalPlaces(6).toNumber(),
    variancePercent: billKwh.gt(0)
      ? variance.div(billKwh).mul(100).toDecimalPlaces(2).toNumber()
      : null,
    warnings,
  };
}

function bangkokMonth(timestamp: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(timestamp));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month)
    throw new Error(`Invalid interval timestamp: ${timestamp}`);
  return `${year}-${month}`;
}
