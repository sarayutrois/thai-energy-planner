import type { BatteryMvpDecision } from "./battery-mvp";

export type BatteryInstallerRequirements = {
  minimumUsableCapacityKwh: number;
  minimumContinuousPowerKw: number;
  backupRequired: boolean;
  minimumRoundTripEfficiencyPercent: number;
  minimumWarrantyYears: number;
  referenceBudgetLowThb: number;
  referenceBudgetHighThb: number;
  strategyLabel: string;
};

export type BatteryVendorQuote = {
  id: string;
  vendor: string;
  model: string;
  quotedPriceThb: number;
  usableCapacityKwh: number;
  continuousPowerKw: number;
  roundTripEfficiencyPercent: number;
  warrantyYears: number;
  warrantedCycles: number;
  supportsBackup: boolean;
  notes: string;
};

export type BatteryQuoteEvaluation = BatteryVendorQuote & {
  status: "incomplete" | "pass" | "fail";
  rank: number | null;
  failures: string[];
  warnings: string[];
  costPerUsableKwhThb: number | null;
  warrantedThroughputKwh: number | null;
  costPerWarrantedKwhThb: number | null;
  priceDeltaFromBudgetHighThb: number | null;
};

export type BatteryQuoteComparison = {
  requirements: BatteryInstallerRequirements;
  quotes: BatteryQuoteEvaluation[];
  completeCount: number;
  passingCount: number;
  bestQuoteId: string | null;
};

export function buildBatteryInstallerRequirements(
  decision: BatteryMvpDecision,
): BatteryInstallerRequirements {
  return {
    minimumUsableCapacityKwh: decision.usableCapacityKwh,
    minimumContinuousPowerKw: decision.dischargePowerKw,
    backupRequired: decision.strategy === "BACKUP_RESERVE",
    minimumRoundTripEfficiencyPercent: 85,
    minimumWarrantyYears: 5,
    referenceBudgetLowThb: decision.budgetLowThb,
    referenceBudgetHighThb: decision.budgetHighThb,
    strategyLabel: decision.strategyLabel,
  };
}

export function createEmptyBatteryVendorQuote(id: string): BatteryVendorQuote {
  return {
    id,
    vendor: "",
    model: "",
    quotedPriceThb: 0,
    usableCapacityKwh: 0,
    continuousPowerKw: 0,
    roundTripEfficiencyPercent: 0,
    warrantyYears: 0,
    warrantedCycles: 0,
    supportsBackup: false,
    notes: "",
  };
}

export function compareBatteryVendorQuotes(
  requirements: BatteryInstallerRequirements,
  quotes: BatteryVendorQuote[],
): BatteryQuoteComparison {
  const evaluated = quotes.map((quote) => evaluateQuote(requirements, quote));
  const ranked = evaluated
    .filter((quote) => quote.status !== "incomplete")
    .sort((left, right) => {
      if (left.status !== right.status) return left.status === "pass" ? -1 : 1;
      return left.quotedPriceThb - right.quotedPriceThb;
    });
  const rankById = new Map(ranked.map((quote, index) => [quote.id, index + 1]));
  const quotesWithRank = evaluated.map((quote) => ({
    ...quote,
    rank: rankById.get(quote.id) ?? null,
  }));
  const passing = ranked.filter((quote) => quote.status === "pass");

  return {
    requirements,
    quotes: quotesWithRank,
    completeCount: ranked.length,
    passingCount: passing.length,
    bestQuoteId: passing[0]?.id ?? null,
  };
}

function evaluateQuote(
  requirements: BatteryInstallerRequirements,
  quote: BatteryVendorQuote,
): Omit<BatteryQuoteEvaluation, "rank"> & { rank: null } {
  const complete =
    quote.vendor.trim().length > 0 &&
    quote.model.trim().length > 0 &&
    quote.quotedPriceThb > 0 &&
    quote.usableCapacityKwh > 0 &&
    quote.continuousPowerKw > 0 &&
    quote.roundTripEfficiencyPercent > 0 &&
    quote.warrantyYears > 0 &&
    quote.warrantedCycles > 0;
  const failures: string[] = [];
  const warnings: string[] = [];

  if (complete) {
    if (quote.usableCapacityKwh < requirements.minimumUsableCapacityKwh)
      failures.push("ความจุใช้ได้ต่ำกว่าสเปกขั้นต่ำ");
    if (quote.continuousPowerKw < requirements.minimumContinuousPowerKw)
      failures.push("กำลังจ่ายต่อเนื่องต่ำกว่าสเปกขั้นต่ำ");
    if (
      quote.roundTripEfficiencyPercent <
      requirements.minimumRoundTripEfficiencyPercent
    )
      failures.push("ประสิทธิภาพต่ำกว่าเกณฑ์คัดกรอง");
    if (quote.warrantyYears < requirements.minimumWarrantyYears)
      failures.push("ระยะรับประกันต่ำกว่าเกณฑ์คัดกรอง");
    if (requirements.backupRequired && !quote.supportsBackup)
      failures.push("ไม่รองรับวงจรสำรองและการทำงานขณะไฟดับ");
    if (quote.quotedPriceThb > requirements.referenceBudgetHighThb)
      warnings.push("ราคาสูงกว่างบประมาณอ้างอิงจากแบบจำลอง");
  }

  const warrantedThroughputKwh = complete
    ? quote.usableCapacityKwh * quote.warrantedCycles
    : null;

  return {
    ...quote,
    status: !complete ? "incomplete" : failures.length === 0 ? "pass" : "fail",
    rank: null,
    failures,
    warnings,
    costPerUsableKwhThb: complete
      ? quote.quotedPriceThb / quote.usableCapacityKwh
      : null,
    warrantedThroughputKwh,
    costPerWarrantedKwhThb:
      complete && warrantedThroughputKwh
        ? quote.quotedPriceThb / warrantedThroughputKwh
        : null,
    priceDeltaFromBudgetHighThb: complete
      ? quote.quotedPriceThb - requirements.referenceBudgetHighThb
      : null,
  };
}
