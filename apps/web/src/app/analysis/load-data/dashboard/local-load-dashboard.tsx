"use client";

import { useEffect, useState } from "react";
import {
  canonicalLoadProfileToLoadIntervals,
  summarizeLoadProfile,
  type LoadSummaryMetrics,
} from "@thai-energy-planner/calculation-engine";
import { LoadDashboardChartCard } from "@/components/load-dashboard-chart-card";
import { readLocalLoadProfileSnapshot } from "@/lib/local-load-profile";

export function LocalLoadDashboard() {
  const [summary, setSummary] = useState<LoadSummaryMetrics | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const profile = readLocalLoadProfileSnapshot()?.canonicalProfile;
    if (!profile) return;
    setName(profile.name);
    setSummary(
      summarizeLoadProfile(canonicalLoadProfileToLoadIntervals(profile)),
    );
  }, []);

  if (!summary) {
    return (
      <div className="mt-6 rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
        ยังไม่มี Load Profile สำหรับแสดงผล
        กรุณานำเข้าไฟล์หรือสร้างจากเครื่องใช้ไฟฟ้าก่อน
      </div>
    );
  }

  return (
    <>
      <p className="mt-6 text-sm text-muted-foreground">
        กำลังแสดงข้อมูลจาก:{" "}
        <span className="font-medium text-foreground">{name}</span>
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Metric title="Total kWh" value={summary.totalKwh} />
        <Metric title="Average daily kWh" value={summary.averageDailyKwh} />
        <Metric title="Average load kW" value={summary.averageLoadKw} />
        <Metric title="Peak demand kW" value={summary.peakDemandKw} />
        <Metric title="Load factor" value={summary.loadFactor} />
        <Metric title="Daytime kWh" value={summary.daytimeKwh} />
        <Metric title="Nighttime kWh" value={summary.nighttimeKwh} />
        <Metric title="Peak/Off-Peak" value="ต้องเลือกอัตรา TOU ก่อน" />
      </div>
      <LoadDashboardChartCard summary={summary} />
    </>
  );
}

function Metric({ title, value }: { title: string; value: number | string }) {
  const formatted =
    typeof value === "number"
      ? new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
          value,
        )
      : value;
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="mt-2 text-xl font-semibold tracking-normal">{formatted}</p>
    </div>
  );
}
