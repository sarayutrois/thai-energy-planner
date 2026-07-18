"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LoadSummaryMetrics } from "@thai-energy-planner/calculation-engine";
import { buildAverageHourlyLoadProfile } from "@/lib/energy-dashboard";

export function EnergyLoadOverviewChart({
  summary,
}: {
  summary: LoadSummaryMetrics;
}) {
  const data = buildAverageHourlyLoadProfile(summary);
  const peakHour = data.reduce(
    (highest, row) => (row.loadKw > highest.loadKw ? row : highest),
    data[0] ?? { hour: "00:00", loadKw: 0 },
  );

  return (
    <div>
      <div className="h-[260px] w-full md:h-[300px]">
        <ResponsiveContainer height="100%" width="100%">
          <AreaChart data={data} margin={{ left: -18, right: 8, top: 12 }}>
            <defs>
              <linearGradient id="energy-load-fill" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="hsl(var(--chart-primary))"
                  stopOpacity={0.38}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--chart-primary))"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="hsl(var(--chart-grid))"
              strokeDasharray="4 5"
              vertical={false}
            />
            <XAxis
              axisLine={false}
              dataKey="hour"
              interval={3}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickFormatter={(value: number) => `${value}`}
              tickLine={false}
              width={48}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.8rem",
                boxShadow: "0 14px 35px rgb(15 23 42 / 0.12)",
              }}
              formatter={(value) => [
                `${format(Number(value))} kW`,
                "โหลดเฉลี่ย",
              ]}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <ReferenceLine
              stroke="hsl(var(--solar))"
              strokeDasharray="4 4"
              x="12:00"
            />
            <Area
              dataKey="loadKw"
              fill="url(#energy-load-fill)"
              name="โหลดเฉลี่ย"
              stroke="hsl(var(--chart-primary))"
              strokeWidth={2.5}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
        <span>เส้นประเวลา 12:00 แบ่งช่วงเช้าและบ่าย</span>
        <span className="font-medium text-foreground">
          สูงสุดราว {peakHour.hour} · {format(peakHour.loadKw)} kW
        </span>
      </div>
    </div>
  );
}

function format(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}
