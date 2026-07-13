"use client";

import { useEffect, useState } from "react";
import {
  canonicalLoadProfileToLoadIntervals,
  summarizeLoadProfile,
  type LoadSummaryMetrics,
} from "@thai-energy-planner/calculation-engine";
import { LoadDashboardChartCard } from "@/components/load-dashboard-chart-card";
import {
  formatLocalLoadProfileLabel,
  listDistinctLocalLoadProfileSnapshots,
  readLocalLoadProfileSnapshot,
  selectLocalLoadProfileSnapshot,
  type LocalLoadProfileSnapshot,
} from "@/lib/local-load-profile";

export function LocalLoadDashboard() {
  const [summary, setSummary] = useState<LoadSummaryMetrics | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<LocalLoadProfileSnapshot[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  function refreshProfiles() {
    setProfiles(listDistinctLocalLoadProfileSnapshots());
    loadProfile(readLocalLoadProfileSnapshot());
  }

  function loadProfile(snapshot: LocalLoadProfileSnapshot | null) {
    const profile = snapshot?.canonicalProfile;
    if (!snapshot || !profile) {
      setSummary(null);
      setName(null);
      return;
    }
    setActiveId(snapshot.id);
    setName(profile.name);
    setSummary(
      summarizeLoadProfile(canonicalLoadProfileToLoadIntervals(profile)),
    );
  }

  useEffect(() => {
    refreshProfiles();
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
      {profiles.length > 1 ? (
        <label className="mt-6 flex max-w-md flex-col gap-2 text-sm font-medium">
          Load Profile ที่ใช้วิเคราะห์
          <select
            className="h-10 rounded-md border border-input bg-background px-3"
            onChange={(event) =>
              loadProfile(selectLocalLoadProfileSnapshot(event.target.value))
            }
            value={activeId ?? ""}
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {formatLocalLoadProfileLabel(profile)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <p className="mt-6 text-sm text-muted-foreground">
        กำลังแสดงข้อมูลจาก:{" "}
        <span className="font-medium text-foreground">{name}</span>
        <button
          className="ml-3 text-primary underline underline-offset-4"
          type="button"
          onClick={refreshProfiles}
        >
          รีเฟรชข้อมูลล่าสุด
        </button>
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
