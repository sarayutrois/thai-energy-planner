import Decimal from "decimal.js";

export type ScenarioCostInput = {
  scenarioName: string;
  annualCostThb: number;
  investmentThb?: number | undefined;
  npvThb?: number | null | undefined;
  irrPercent?: number | null | undefined;
  simplePaybackYear?: number | null | undefined;
  discountedPaybackYear?: number | null | undefined;
};

export type EnergyScenarioResult = {
  scenarioName: string;
  annualCostThb: number;
  annualSavingThb: number;
  npvThb: number | null;
  irrPercent: number | null;
  simplePaybackYear: number | null;
  discountedPaybackYear: number | null;
  recommendation: "recommended" | "consider" | "not_recommended";
  recommendationReasons: string[];
};

export type EnergyScenarioComparisonResult = {
  baselineAnnualCostThb: number;
  scenarios: EnergyScenarioResult[];
  bestScenario: EnergyScenarioResult;
};

export function compareScenarios(input: {
  currentNormalAnnualCostThb: number;
  scenarios: ScenarioCostInput[];
}): EnergyScenarioComparisonResult {
  if (!Number.isFinite(input.currentNormalAnnualCostThb) || input.currentNormalAnnualCostThb < 0) {
    throw new Error("currentNormalAnnualCostThb must be non-negative");
  }
  if (input.scenarios.length === 0) throw new Error("compareScenarios requires at least one scenario");

  const baseline = new Decimal(input.currentNormalAnnualCostThb);
  const scenarios = input.scenarios.map((scenario) => buildScenarioResult(scenario, baseline));
  const bestScenario = scenarios.reduce((best, scenario) => (scenario.annualCostThb < best.annualCostThb ? scenario : best));

  return {
    baselineAnnualCostThb: roundMoney(baseline),
    scenarios,
    bestScenario
  };
}

function buildScenarioResult(input: ScenarioCostInput, baseline: Decimal): EnergyScenarioResult {
  if (!Number.isFinite(input.annualCostThb) || input.annualCostThb < 0) {
    throw new Error(`annualCostThb must be non-negative for ${input.scenarioName}`);
  }

  const annualCost = new Decimal(input.annualCostThb);
  const annualSaving = baseline.minus(annualCost);
  const investment = new Decimal(input.investmentThb ?? 0);
  const npv = input.npvThb ?? null;
  const payback = input.simplePaybackYear ?? null;
  const reasons = buildRecommendationReasons({
    scenarioName: input.scenarioName,
    annualSaving,
    investment,
    npv,
    payback
  });

  return {
    scenarioName: input.scenarioName,
    annualCostThb: roundMoney(annualCost),
    annualSavingThb: roundMoney(annualSaving),
    npvThb: npv,
    irrPercent: input.irrPercent ?? null,
    simplePaybackYear: payback,
    discountedPaybackYear: input.discountedPaybackYear ?? null,
    recommendation: classifyRecommendation(annualSaving, npv, payback),
    recommendationReasons: reasons
  };
}

function classifyRecommendation(annualSaving: Decimal, npvThb: number | null, simplePaybackYear: number | null) {
  if (annualSaving.lte(0)) return "not_recommended";
  if (npvThb !== null && npvThb < 0) return "consider";
  if (simplePaybackYear !== null && simplePaybackYear > 12) return "consider";
  return "recommended";
}

function buildRecommendationReasons(input: {
  scenarioName: string;
  annualSaving: Decimal;
  investment: Decimal;
  npv: number | null;
  payback: number | null;
}) {
  const reasons: string[] = [];
  if (input.annualSaving.gt(0)) {
    reasons.push(`${input.scenarioName} saves ${roundMoney(input.annualSaving)} THB/year versus Current Normal.`);
  } else if (input.annualSaving.lt(0)) {
    reasons.push(`${input.scenarioName} costs ${roundMoney(input.annualSaving.abs())} THB/year more than Current Normal.`);
  } else {
    reasons.push(`${input.scenarioName} has the same annual cost as Current Normal.`);
  }

  if (input.npv !== null) {
    reasons.push(`NPV is ${roundMoney(new Decimal(input.npv))} THB.`);
  }
  if (input.payback !== null && input.investment.gt(0)) {
    reasons.push(`Simple payback is ${input.payback} years on ${roundMoney(input.investment)} THB investment.`);
  }
  return reasons;
}

function roundMoney(value: Decimal) {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}
