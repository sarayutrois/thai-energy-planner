"use client";

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
  YAxis
} from "recharts";
import type { LoadSummaryMetrics } from "@thai-energy-planner/calculation-engine";

export function LoadDashboardCharts({ summary }: { summary: LoadSummaryMetrics }) {
  const hourly = summary.hourlyProfile.map((row) => ({
    hour: `${row.hour}:00`,
    energy: row.energyKwh,
    averageKw: row.averageKw
  }));
  const dayOfWeekLabels = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  const dayOfWeek = summary.energyByDayOfWeek.map((row) => ({
    day: dayOfWeekLabels[row.dayOfWeek] ?? String(row.dayOfWeek),
    energy: row.energyKwh
  }));
  const peakOffPeak = [
    { label: "Peak", energy: summary.peakPeriodKwh },
    { label: "Off-Peak", energy: summary.offPeakPeriodKwh }
  ];
  const duration = summary.loadDurationCurve.slice(0, 24).map((row) => ({
    rank: row.rank,
    powerKw: row.powerKw
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartFrame title="Load profile 24 ชั่วโมง">
        <ResponsiveContainer height={260} width="100%">
          <LineChart data={hourly}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line dataKey="energy" name="kWh" stroke="#0369a1" strokeWidth={2} type="monotone" />
            <Line dataKey="averageKw" name="Average kW" stroke="#16a34a" strokeWidth={2} type="monotone" />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Energy by month">
        <ResponsiveContainer height={260} width="100%">
          <BarChart data={summary.energyByMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="energyKwh" fill="#0f766e" name="kWh" />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Energy by day of week">
        <ResponsiveContainer height={260} width="100%">
          <BarChart data={dayOfWeek}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="energy" fill="#ca8a04" name="kWh" />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Peak vs Off-Peak">
        <ResponsiveContainer height={260} width="100%">
          <BarChart data={peakOffPeak}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="energy" fill="#2563eb" name="kWh" />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <div className="lg:col-span-2">
        <ChartFrame title="Load duration curve">
          <ResponsiveContainer height={260} width="100%">
            <LineChart data={duration}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="rank" />
              <YAxis />
              <Tooltip />
              <Line dataKey="powerKw" name="kW" stroke="#dc2626" strokeWidth={2} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>
    </div>
  );
}

function ChartFrame({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {children}
    </section>
  );
}
