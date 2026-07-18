"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BatteryOperationResult } from "@/lib/battery-mvp";

export function BatteryOperationChart({
  operation,
}: {
  operation: BatteryOperationResult;
}) {
  const data = operation.typicalDay.map((item) => ({
    ...item,
    batteryKw: item.chargeKw > 0 ? item.chargeKw : -item.dischargeKw,
  }));
  return (
    <div>
      <div
        aria-label="กราฟการทำงานเฉลี่ย 24 ชั่วโมง แสดงโหลด ไฟจากโครงข่าย กำลังชาร์จหรือคายประจุ และระดับพลังงาน Battery"
        className="h-[300px] w-full"
        role="img"
      >
        <ResponsiveContainer height="100%" width="100%">
          <ComposedChart data={data} margin={{ left: -18, right: 0, top: 16 }}>
            <defs>
              <linearGradient
                id="battery-load-fill"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="hsl(var(--chart-primary))"
                  stopOpacity={0.28}
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
              dataKey="label"
              interval={5}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickFormatter={(value: number) => `${value}`}
              tickLine={false}
              width={48}
              yAxisId="power"
            />
            <YAxis
              axisLine={false}
              domain={[0, 100]}
              orientation="right"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickFormatter={(value: number) => `${value}%`}
              tickLine={false}
              width={42}
              yAxisId="soc"
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.8rem",
                boxShadow: "0 14px 35px rgb(15 23 42 / 0.12)",
              }}
              formatter={(value, name) => [
                name === "SOC"
                  ? `${formatNumber(Number(value))}%`
                  : `${formatNumber(Number(value))} kW`,
                name,
              ]}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Area
              dataKey="loadKw"
              fill="url(#battery-load-fill)"
              name="โหลด"
              stroke="hsl(var(--chart-primary))"
              strokeWidth={2}
              type="monotone"
              yAxisId="power"
            />
            <Line
              dataKey="gridAfterKw"
              dot={false}
              name="ไฟจากโครงข่ายหลัง Battery"
              stroke="hsl(var(--foreground))"
              strokeDasharray="5 4"
              strokeWidth={2}
              type="monotone"
              yAxisId="power"
            />
            <Bar
              dataKey="batteryKw"
              fill="hsl(var(--solar))"
              name="Battery +ชาร์จ / −คาย"
              opacity={0.75}
              radius={[3, 3, 0, 0]}
              yAxisId="power"
            />
            <Line
              dataKey="socPercent"
              dot={false}
              name="SOC"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              type="monotone"
              yAxisId="soc"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
        <ChartKey color="bg-chart-primary" label="โหลด" />
        <ChartKey color="bg-foreground" label="ไฟจากโครงข่ายหลัง Battery" />
        <ChartKey color="bg-chart-solar" label="Battery +ชาร์จ / −คาย" />
        <ChartKey color="bg-primary" label="SOC (%)" />
      </div>
    </div>
  );
}

function ChartKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 rounded-full ${color}`}
      />
      {label}
    </span>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}
