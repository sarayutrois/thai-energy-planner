export type TariffStatus = "DRAFT" | "VERIFIED" | "PUBLISHED" | "RETIRED";

export interface VersioningState {
  status: TariffStatus;
}

export function validateTariffStatusTransition(
  currentStatus: TariffStatus,
  newStatus: TariffStatus,
): boolean {
  const transitions: Record<TariffStatus, TariffStatus[]> = {
    DRAFT: ["VERIFIED", "RETIRED"],
    VERIFIED: ["DRAFT", "PUBLISHED", "RETIRED"],
    PUBLISHED: ["RETIRED"], // cannot go back to DRAFT or VERIFIED directly, must rollback by retiring and creating new
    RETIRED: [], // terminal state
  };
  return transitions[currentStatus]?.includes(newStatus) ?? false;
}

export function validateTierOverlap(
  tiers: { fromKwh: number; toKwh: number | null }[],
): boolean {
  if (!tiers || tiers.length === 0) return true;
  // sort by fromKwh
  const sorted = [...tiers].sort((a, b) => a.fromKwh - b.fromKwh);
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (!current || !next) continue;
    if (current.toKwh === null) return false; // a tier with no end cannot be followed by another tier
    if (current.toKwh > next.fromKwh) return false; // overlap
  }
  return true;
}

export function validateTouPeriodOverlap(
  periods: { startTime: string; endTime: string; daysOfWeek: number[] }[],
): boolean {
  if (!periods || periods.length === 0) return true;

  // convert hh:mm to minutes for comparison
  const toMinutes = (time: string) => {
    const parts = time.split(":").map(Number);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    return h * 60 + m;
  };

  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const p1 = periods[i];
      const p2 = periods[j];

      if (!p1 || !p2) continue;

      // check if days overlap
      const daysOverlap = p1.daysOfWeek.some((day) =>
        p2.daysOfWeek.includes(day),
      );
      if (!daysOverlap) continue;

      const p1Start = toMinutes(p1.startTime);
      const p1End = toMinutes(p1.endTime) || 24 * 60; // if 00:00 end, treat as 24:00

      const p2Start = toMinutes(p2.startTime);
      const p2End = toMinutes(p2.endTime) || 24 * 60;

      // check time overlap
      if (p1Start < p2End && p2Start < p1End) {
        return false;
      }
    }
  }

  return true;
}

export function validateFtPeriodOverlap(
  periods: {
    effectiveFrom: Date;
    effectiveTo: Date | null;
    rateThbPerKwh?: number;
  }[],
): boolean {
  if (!periods || periods.length === 0) return true;
  const sorted = [...periods].sort(
    (a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime(),
  );

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    if (!current) continue;
    // reject negative Ft rate
    if (current.rateThbPerKwh !== undefined && current.rateThbPerKwh < 0)
      return false;
    // reject effectiveTo before effectiveFrom
    if (current.effectiveTo && current.effectiveFrom >= current.effectiveTo)
      return false;
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (!current || !next) continue;
    if (current.effectiveTo === null) return false; // Open-ended period cannot be followed by another
    if (current.effectiveTo > next.effectiveFrom) return false;
  }
  return true;
}

export function validateTariffRates(tariff: {
  energyRateTiers?: { rateThbPerKwh: number }[];
  touPeriods?: { rateThbPerKwh: number }[];
  demandRates?: { rateThbPerKw: number }[];
  serviceChargeThb?: number | null;
  taxRates?: { ratePercent: number }[];
}): boolean {
  if (tariff.energyRateTiers?.some((t) => t.rateThbPerKwh < 0)) return false;
  if (tariff.touPeriods?.some((p) => p.rateThbPerKwh < 0)) return false;
  if (tariff.demandRates?.some((r) => r.rateThbPerKw < 0)) return false;
  if (
    tariff.serviceChargeThb !== undefined &&
    tariff.serviceChargeThb !== null &&
    tariff.serviceChargeThb < 0
  )
    return false;

  // check tax ranges (e.g. VAT 0-100)
  if (tariff.taxRates?.some((t) => t.ratePercent < 0 || t.ratePercent > 100))
    return false;

  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateTariffForPublish(tariff: any): boolean {
  if (!tariff.effectiveFrom) return false;
  if (
    tariff.effectiveTo &&
    new Date(tariff.effectiveTo) <= new Date(tariff.effectiveFrom)
  )
    return false;
  if (!tariff.sourceUrl && !tariff.notes) return false;

  if (!validateTierOverlap(tariff.energyRateTiers || [])) return false;
  if (!validateTouPeriodOverlap(tariff.touPeriods || [])) return false;
  if (!validateFtPeriodOverlap(tariff.ftPeriods || [])) return false;
  if (!validateTariffRates(tariff)) return false;

  return true;
}
