import type { LoadSummaryMetrics } from "@thai-energy-planner/calculation-engine";

type HourlyLoadSummary = Pick<
  LoadSummaryMetrics,
  "averageDailyKwh" | "hourlyProfile" | "totalKwh"
>;

export function buildAverageHourlyLoadProfile(summary: HourlyLoadSummary) {
  const representedDays =
    summary.averageDailyKwh > 0
      ? Math.max(1, summary.totalKwh / summary.averageDailyKwh)
      : 1;

  return summary.hourlyProfile.map((row) => ({
    hour: `${String(row.hour).padStart(2, "0")}:00`,
    // hourlyProfile is aggregate energy for each clock hour across all days.
    // kWh per represented day over a one-hour bucket equals average kW.
    loadKw: Number((row.energyKwh / representedDays).toFixed(3)),
  }));
}
