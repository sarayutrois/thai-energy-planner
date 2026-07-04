"use client";

import type { ReactNode } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export type SolarIntervalChartDatum = {
  label: string;
  loadKwh: number;
  solarKwh: number;
  gridImportKwh: number;
  gridExportKwh: number;
};

export type SolarMonthlyChartDatum = {
  month: string;
  generationKwh: number;
};

export type SolarShareChartDatum = {
  name: string;
  kwh: number;
};

export type SolarCashFlowChartDatum = {
  year: number;
  netCashFlowThb: number;
  cumulativeCashFlowThb: number;
};

export type SolarSizingChartDatum = {
  systemSizeKwp: number;
  npvThb: number;
  paybackYears: number | null;
  annualNetBenefitThb: number;
};

export function SolarAnalysisCharts({
  intervals,
  monthlyGeneration,
  selfConsumption,
  cashFlows,
  sizing
}: {
  intervals: SolarIntervalChartDatum[];
  monthlyGeneration: SolarMonthlyChartDatum[];
  selfConsumption: SolarShareChartDatum[];
  cashFlows: SolarCashFlowChartDatum[];
  sizing: SolarSizingChartDatum[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartPanel title="Load vs Solar">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={intervals}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={3} />
            <YAxis width={72} />
            <Tooltip formatter={(value) => `${formatNumber(Number(value))} kWh`} />
            <Legend />
            <Area type="monotone" dataKey="loadKwh" name="Load" fill="#bfdbfe" stroke="#2563eb" />
            <Line type="monotone" dataKey="solarKwh" name="Solar" stroke="#d97706" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Grid Import / Export">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={intervals}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={3} />
            <YAxis width={72} />
            <Tooltip formatter={(value) => `${formatNumber(Number(value))} kWh`} />
            <Legend />
            <Bar dataKey="gridImportKwh" name="Import" fill="#0f766e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="gridExportKwh" name="Export" fill="#f59e0b" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Monthly Generation">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyGeneration}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis width={72} />
            <Tooltip formatter={(value) => `${formatNumber(Number(value))} kWh`} />
            <Bar dataKey="generationKwh" name="kWh" fill="#ca8a04" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Self-consumption vs Export">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={selfConsumption}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis width={72} />
            <Tooltip formatter={(value) => `${formatNumber(Number(value))} kWh`} />
            <Bar dataKey="kwh" name="kWh" fill="#16a34a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Annual Cash Flow">
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={cashFlows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis width={82} />
            <Tooltip formatter={(value) => `${formatNumber(Number(value))} THB`} />
            <Legend />
            <Bar dataKey="netCashFlowThb" name="Cash flow" fill="#2563eb" radius={[3, 3, 0, 0]} />
            <Line type="monotone" dataKey="cumulativeCashFlowThb" name="Cumulative" stroke="#dc2626" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="NPV / Payback by Size">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={sizing}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="systemSizeKwp" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" width={82} />
            <YAxis yAxisId="right" orientation="right" width={72} />
            <Tooltip formatter={(value) => formatNumber(Number(value))} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="npvThb" name="NPV" stroke="#0f766e" strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="paybackYears" name="Payback" stroke="#d97706" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartPanel>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}
