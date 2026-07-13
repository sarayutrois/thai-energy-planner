"use client";

import dynamic from "next/dynamic";
import type {
  SolarCashFlowChartDatum,
  SolarIntervalChartDatum,
  SolarMonthlyChartDatum,
  SolarShareChartDatum,
  SolarSizingChartDatum,
} from "@/components/solar-analysis-charts";

const LazySolarAnalysisCharts = dynamic(
  () =>
    import("@/components/solar-analysis-charts").then(
      (module) => module.SolarAnalysisCharts,
    ),
  {
    loading: () => <SolarChartSkeleton />,
    ssr: false,
  },
);

export function SolarAnalysisChartPanel({
  intervals,
  monthlyGeneration,
  selfConsumption,
  cashFlows,
  sizing,
}: {
  intervals: SolarIntervalChartDatum[];
  monthlyGeneration: SolarMonthlyChartDatum[];
  selfConsumption: SolarShareChartDatum[];
  cashFlows: SolarCashFlowChartDatum[];
  sizing: SolarSizingChartDatum[];
}) {
  return (
    <LazySolarAnalysisCharts
      intervals={intervals}
      monthlyGeneration={monthlyGeneration}
      selfConsumption={selfConsumption}
      cashFlows={cashFlows}
      sizing={sizing}
    />
  );
}

function SolarChartSkeleton() {
  return (
    <div
      aria-label="กำลังโหลดกราฟ Solar"
      aria-live="polite"
      className="grid gap-4 lg:grid-cols-2"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          className="h-72 animate-pulse rounded-2xl border border-border bg-muted/35 p-5"
          key={index}
        >
          <div className="h-4 w-36 rounded-full bg-muted-foreground/20" />
          <div className="mt-6 h-52 rounded-xl bg-muted-foreground/10" />
        </div>
      ))}
    </div>
  );
}
