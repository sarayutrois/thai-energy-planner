import Decimal from "decimal.js";

export type CashflowItem = {
  year: number;
  amountThb: number;
  label?: string | undefined;
};

export type SolarCashflowInput = {
  initialInvestmentThb: number;
  annualSavingThb: number;
  projectLifeYears: number;
  annualExportRevenueThb?: number | undefined;
  annualOAndMCostThb?: number | undefined;
  electricityEscalationRatePercent?: number | undefined;
  solarDegradationRatePercent?: number | undefined;
  oAndMEscalationRatePercent?: number | undefined;
  inverterReplacementCostThb?: number | undefined;
  inverterReplacementYear?: number | null | undefined;
};

export type FinancialCoreResult = {
  npvThb: number;
  irrPercent: number | null;
  simplePaybackYear: number | null;
  discountedPaybackYear: number | null;
};

const zero = new Decimal(0);

export function calculateNPV(cashflows: CashflowItem[], discountRatePercent: number): number {
  const rate = normalizePercent(discountRatePercent, "discountRatePercent");
  return roundMoney(
    cashflows.reduce((sum, cashflow) => {
      validateCashflow(cashflow);
      return sum.plus(new Decimal(cashflow.amountThb).div(onePlus(rate).pow(cashflow.year)));
    }, zero)
  );
}

export function calculateIRR(cashflows: CashflowItem[]): number | null {
  const values = cashflows.map((cashflow) => {
    validateCashflow(cashflow);
    return new Decimal(cashflow.amountThb);
  });
  const hasPositive = values.some((value) => value.gt(0));
  const hasNegative = values.some((value) => value.lt(0));
  if (!hasPositive || !hasNegative) return null;

  let low = new Decimal(-0.95);
  let high = new Decimal(1);
  let highNpv = npvAtRate(values, high);
  while (highNpv.gt(0) && high.lt(10)) {
    high = high.mul(2);
    highNpv = npvAtRate(values, high);
  }

  if (highNpv.gt(0)) return null;

  for (let index = 0; index < 80; index += 1) {
    const mid = low.plus(high).div(2);
    const value = npvAtRate(values, mid);
    if (value.gt(0)) low = mid;
    else high = mid;
  }

  return roundPercent(low.plus(high).div(2).mul(100));
}

export function calculateSimplePayback(cashflows: CashflowItem[]): number | null {
  return findPaybackYear(cashflows, 0);
}

export function calculateDiscountedPayback(cashflows: CashflowItem[], discountRatePercent: number): number | null {
  const rate = normalizePercent(discountRatePercent, "discountRatePercent");
  const discounted = cashflows.map((cashflow) => {
    validateCashflow(cashflow);
    return {
      ...cashflow,
      amountThb: new Decimal(cashflow.amountThb).div(onePlus(rate).pow(cashflow.year)).toNumber()
    };
  });
  return findPaybackYear(discounted, 0);
}

export function buildSolarCashflows(input: SolarCashflowInput): CashflowItem[] {
  validateSolarCashflowInput(input);
  const projectLifeYears = Math.floor(input.projectLifeYears);
  const savingEscalation = normalizePercent(input.electricityEscalationRatePercent ?? 0, "electricityEscalationRatePercent");
  const degradation = normalizePercent(input.solarDegradationRatePercent ?? 0, "solarDegradationRatePercent");
  const oAndMEscalation = normalizePercent(input.oAndMEscalationRatePercent ?? 0, "oAndMEscalationRatePercent");
  const cashflows: CashflowItem[] = [
    {
      year: 0,
      amountThb: roundMoney(new Decimal(input.initialInvestmentThb).negated()),
      label: "Initial investment"
    }
  ];

  for (let year = 1; year <= projectLifeYears; year += 1) {
    const benefitMultiplier = onePlus(savingEscalation).pow(year - 1).mul(oneMinus(degradation).pow(year - 1));
    const savings = new Decimal(input.annualSavingThb).plus(input.annualExportRevenueThb ?? 0).mul(benefitMultiplier);
    const oAndM = new Decimal(input.annualOAndMCostThb ?? 0).mul(onePlus(oAndMEscalation).pow(year - 1));
    const replacement =
      input.inverterReplacementYear !== null && input.inverterReplacementYear === year
        ? new Decimal(input.inverterReplacementCostThb ?? 0)
        : zero;

    cashflows.push({
      year,
      amountThb: roundMoney(savings.minus(oAndM).minus(replacement)),
      label: `Year ${year}`
    });
  }

  return cashflows;
}

export function calculateFinancialResult(cashflows: CashflowItem[], discountRatePercent: number): FinancialCoreResult {
  return {
    npvThb: calculateNPV(cashflows, discountRatePercent),
    irrPercent: calculateIRR(cashflows),
    simplePaybackYear: calculateSimplePayback(cashflows),
    discountedPaybackYear: calculateDiscountedPayback(cashflows, discountRatePercent)
  };
}

function findPaybackYear(cashflows: CashflowItem[], startingCumulative: number): number | null {
  const sorted = [...cashflows].sort((a, b) => a.year - b.year);
  let cumulative = new Decimal(startingCumulative);
  let previousYear = sorted[0]?.year ?? 0;
  let previousCumulative = cumulative;

  for (const cashflow of sorted) {
    validateCashflow(cashflow);
    previousCumulative = cumulative;
    previousYear = cashflow.year;
    cumulative = cumulative.plus(cashflow.amountThb);

    if (cashflow.year === 0) continue;
    if (cumulative.gte(0)) {
      const periodCashflow = cumulative.minus(previousCumulative);
      if (periodCashflow.lte(0)) return cashflow.year;
      const fraction = previousCumulative.abs().div(periodCashflow);
      return roundYears(new Decimal(previousYear - 1).plus(fraction));
    }
  }

  return null;
}

function validateCashflow(cashflow: CashflowItem) {
  if (!Number.isInteger(cashflow.year) || cashflow.year < 0) {
    throw new Error(`cashflow year must be a non-negative integer: ${cashflow.year}`);
  }
  if (!Number.isFinite(cashflow.amountThb)) {
    throw new Error(`cashflow amountThb must be finite: ${cashflow.amountThb}`);
  }
}

function validateSolarCashflowInput(input: SolarCashflowInput) {
  if (!Number.isFinite(input.initialInvestmentThb) || input.initialInvestmentThb < 0) {
    throw new Error("initialInvestmentThb must be non-negative");
  }
  if (!Number.isFinite(input.annualSavingThb)) throw new Error("annualSavingThb must be finite");
  if (!Number.isFinite(input.projectLifeYears) || input.projectLifeYears <= 0) {
    throw new Error("projectLifeYears must be greater than 0");
  }
  if ((input.annualOAndMCostThb ?? 0) < 0) throw new Error("annualOAndMCostThb must be non-negative");
  if ((input.inverterReplacementCostThb ?? 0) < 0) throw new Error("inverterReplacementCostThb must be non-negative");
}

function normalizePercent(value: number, fieldName: string): Decimal {
  if (!Number.isFinite(value)) throw new Error(`${fieldName} must be finite`);
  return new Decimal(value).div(100);
}

function npvAtRate(cashflows: Decimal[], rate: Decimal) {
  return cashflows.reduce((sum, cashflow, year) => sum.plus(cashflow.div(onePlus(rate).pow(year))), zero);
}

function onePlus(value: Decimal) {
  return new Decimal(1).plus(value);
}

function oneMinus(value: Decimal) {
  return Decimal.max(zero, new Decimal(1).minus(value));
}

function roundMoney(value: Decimal) {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

function roundPercent(value: Decimal) {
  return value.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber();
}

function roundYears(value: Decimal) {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}
