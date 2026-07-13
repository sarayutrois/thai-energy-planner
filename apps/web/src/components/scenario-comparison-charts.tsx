"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ScenarioChartDatum = {
  name: string;
  monthlyBill: number;
  annualBill: number;
  peakKwh: number;
  offPeakKwh: number;
  annualSavings: number;
};

export type LoadShiftChartDatum = {
  label: string;
  peakKwh: number;
  offPeakKwh: number;
};

export function ScenarioComparisonCharts({
  scenarios,
  loadShift,
}: {
  scenarios: ScenarioChartDatum[];
  loadShift: LoadShiftChartDatum[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartPanel title="ค่าไฟรายเดือน">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={scenarios}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis width={72} />
            <Tooltip formatter={(value) => formatNumber(Number(value))} />
            <Bar
              dataKey="monthlyBill"
              name="บาท/เดือน"
              fill="#2563eb"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Peak vs Off-Peak">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={scenarios}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis width={72} />
            <Tooltip
              formatter={(value) => `${formatNumber(Number(value))} kWh`}
            />
            <Legend />
            <Bar
              dataKey="peakKwh"
              name="Peak"
              stackId="energy"
              fill="#dc2626"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="offPeakKwh"
              name="Off-Peak"
              stackId="energy"
              fill="#16a34a"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="เงินประหยัดต่อปี">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={scenarios}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis width={72} />
            <Tooltip
              formatter={(value) => `${formatNumber(Number(value))} บาท`}
            />
            <Bar
              dataKey="annualSavings"
              name="บาท/ปี"
              fill="#0f766e"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="ก่อน/หลัง Load Shift">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={loadShift}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis width={72} />
            <Tooltip
              formatter={(value) => `${formatNumber(Number(value))} kWh`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="peakKwh"
              name="Peak"
              stroke="#dc2626"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="offPeakKwh"
              name="Off-Peak"
              stroke="#16a34a"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartPanel>
    </div>
  );
}

function ChartPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}
