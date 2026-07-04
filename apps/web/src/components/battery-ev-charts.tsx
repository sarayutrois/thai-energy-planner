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

export type BatteryDispatchChartDatum = {
  label: string;
  socKwh: number;
  chargeKwh: number;
  dischargeKwh: number;
  gridImportBeforeKwh: number;
  gridImportAfterKwh: number;
  gridExportBeforeKwh: number;
  gridExportAfterKwh: number;
};

export type PeakChartDatum = {
  name: string;
  beforeKw: number;
  afterKw: number;
};

export type CashFlowChartDatum = {
  year: number;
  netCashFlowThb: number;
  cumulativeCashFlowThb: number;
};

export type EvChargingChartDatum = {
  label: string;
  energyKwh: number;
  gridEnergyKwh: number;
  solarEnergyKwh: number;
  baseLoadKwh: number;
  loadAfterEvKwh: number;
};

export type EvStrategyChartDatum = {
  strategy: string;
  monthlyBillIncreaseThb: number;
  costPer100Km: number;
  peakDemandIncreaseKw: number;
};

export function BatteryAnalysisCharts({
  dispatch,
  peak,
  cashFlows
}: {
  dispatch: BatteryDispatchChartDatum[];
  peak: PeakChartDatum[];
  cashFlows: CashFlowChartDatum[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartPanel title="Battery SOC">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={dispatch}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={3} />
            <YAxis width={72} />
            <Tooltip formatter={(value) => `${formatNumber(Number(value))} kWh`} />
            <Line type="monotone" dataKey="socKwh" name="SOC" stroke="#0f766e" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Charge / Discharge">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dispatch}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={3} />
            <YAxis width={72} />
            <Tooltip formatter={(value) => `${formatNumber(Number(value))} kWh`} />
            <Legend />
            <Bar dataKey="chargeKwh" name="Charge" fill="#2563eb" radius={[3, 3, 0, 0]} />
            <Bar dataKey="dischargeKwh" name="Discharge" fill="#d97706" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Grid Import Before / After">
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={dispatch}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={3} />
            <YAxis width={72} />
            <Tooltip formatter={(value) => `${formatNumber(Number(value))} kWh`} />
            <Legend />
            <Area type="monotone" dataKey="gridImportBeforeKwh" name="Before" fill="#bfdbfe" stroke="#2563eb" />
            <Line type="monotone" dataKey="gridImportAfterKwh" name="After" stroke="#dc2626" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Solar Export Before / After">
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={dispatch}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={3} />
            <YAxis width={72} />
            <Tooltip formatter={(value) => `${formatNumber(Number(value))} kWh`} />
            <Legend />
            <Area type="monotone" dataKey="gridExportBeforeKwh" name="Before" fill="#fed7aa" stroke="#ea580c" />
            <Line type="monotone" dataKey="gridExportAfterKwh" name="After" stroke="#16a34a" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Peak Demand">
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={peak}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis width={72} />
            <Tooltip formatter={(value) => `${formatNumber(Number(value))} kW`} />
            <Legend />
            <Bar dataKey="beforeKw" name="Before" fill="#64748b" radius={[3, 3, 0, 0]} />
            <Bar dataKey="afterKw" name="After" fill="#0f766e" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Annual Cash Flow">
        <ResponsiveContainer width="100%" height={230}>
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
    </div>
  );
}

export function EvAnalysisCharts({
  charging,
  strategies
}: {
  charging: EvChargingChartDatum[];
  strategies: EvStrategyChartDatum[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartPanel title="EV Charging Load">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={charging}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={3} />
            <YAxis width={72} />
            <Tooltip formatter={(value) => `${formatNumber(Number(value))} kWh`} />
            <Legend />
            <Bar dataKey="gridEnergyKwh" name="Grid" fill="#2563eb" radius={[3, 3, 0, 0]} />
            <Bar dataKey="solarEnergyKwh" name="Solar surplus" fill="#d97706" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Total Load Before / After EV">
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={charging}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={3} />
            <YAxis width={72} />
            <Tooltip formatter={(value) => `${formatNumber(Number(value))} kWh`} />
            <Legend />
            <Area type="monotone" dataKey="baseLoadKwh" name="Before" fill="#bfdbfe" stroke="#2563eb" />
            <Line type="monotone" dataKey="loadAfterEvKwh" name="After" stroke="#dc2626" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Charging Cost by Strategy">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={strategies}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="strategy" tick={{ fontSize: 11 }} />
            <YAxis width={82} />
            <Tooltip formatter={(value) => `${formatNumber(Number(value))} THB`} />
            <Bar dataKey="monthlyBillIncreaseThb" name="Monthly bill increase" fill="#0f766e" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Cost and Peak Impact">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={strategies}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="strategy" tick={{ fontSize: 11 }} />
            <YAxis width={82} />
            <Tooltip formatter={(value) => formatNumber(Number(value))} />
            <Legend />
            <Bar dataKey="costPer100Km" name="THB / 100 km" fill="#d97706" radius={[3, 3, 0, 0]} />
            <Bar dataKey="peakDemandIncreaseKw" name="Peak kW impact" fill="#dc2626" radius={[3, 3, 0, 0]} />
          </BarChart>
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
