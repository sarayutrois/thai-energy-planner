"use client";

import dynamic from "next/dynamic";
import { Gauge } from "lucide-react";
import type { LoadSummaryMetrics } from "@thai-energy-planner/calculation-engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LazyLoadDashboardCharts = dynamic(
  () => import("@/components/load-dashboard-charts").then((mod) => mod.LoadDashboardCharts),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);

export function LoadDashboardChartCard({ summary }: { summary: LoadSummaryMetrics }) {
  return (
    <Card className="mt-5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge aria-hidden="true" className="h-5 w-5 text-primary" />
          Load charts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <LazyLoadDashboardCharts summary={summary} />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-label="Loading load charts">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="h-[320px] rounded-lg border border-border bg-muted/35 p-4" key={index}>
          <div className="h-4 w-36 rounded bg-muted-foreground/20" />
          <div className="mt-6 h-[240px] rounded bg-muted-foreground/10" />
        </div>
      ))}
      <div className="h-[320px] rounded-lg border border-border bg-muted/35 p-4 lg:col-span-2">
        <div className="h-4 w-40 rounded bg-muted-foreground/20" />
        <div className="mt-6 h-[240px] rounded bg-muted-foreground/10" />
      </div>
    </div>
  );
}
