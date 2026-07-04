"use client";

import { useMemo, useState } from "react";
import {
  defaultColumnMapping,
  parseCsvLoadProfile,
  parseXlsxLoadProfile,
  type LoadProfilePreview
} from "@thai-energy-planner/calculation-engine";
import { Button } from "@/components/ui/button";

export function LoadProfileImporter() {
  const [preview, setPreview] = useState<LoadProfilePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState<15 | 30 | 60>(60);
  const [mapping, setMapping] = useState({
    timestamp: "timestamp",
    energyKwh: "energy_kwh",
    powerKw: "power_kw"
  });

  const options = useMemo(
    () => ({
      mapping: {
        ...defaultColumnMapping,
        timestamp: mapping.timestamp,
        energyKwh: mapping.energyKwh || undefined,
        powerKw: mapping.powerKw || undefined
      },
      intervalMinutes,
      timezone: "Asia/Bangkok" as const
    }),
    [intervalMinutes, mapping]
  );

  async function handleFile(file: File | null) {
    setError(null);
    setPreview(null);
    if (!file) return;

    setIsLoading(true);
    try {
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("ขนาดไฟล์เกิน 50MB กรุณาแบ่งไฟล์หรือลดขนาดไฟล์");
      }

      const fileName = file.name.toLowerCase();
      if (fileName.endsWith(".csv")) {
        setPreview(parseCsvLoadProfile(await file.text(), options));
      } else if (fileName.endsWith(".xlsx")) {
        setPreview(parseXlsxLoadProfile(await file.arrayBuffer(), options));
      } else {
        setError("รองรับเฉพาะ CSV หรือ XLSX");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "อ่านไฟล์ไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium">
          File
          <input
            accept=".csv,.xlsx"
            className="rounded-md border border-input bg-white px-3 py-2 text-sm"
            onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
            type="file"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Timestamp column
          <input
            className="h-10 rounded-md border border-input px-3 text-sm"
            onChange={(event) => setMapping((current) => ({ ...current, timestamp: event.target.value }))}
            value={mapping.timestamp}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          energy_kwh column
          <input
            className="h-10 rounded-md border border-input px-3 text-sm"
            onChange={(event) => setMapping((current) => ({ ...current, energyKwh: event.target.value }))}
            value={mapping.energyKwh}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          power_kw column
          <input
            className="h-10 rounded-md border border-input px-3 text-sm"
            onChange={(event) => setMapping((current) => ({ ...current, powerKw: event.target.value }))}
            value={mapping.powerKw}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Interval
          <select
            className="h-10 rounded-md border border-input px-3 text-sm"
            onChange={(event) => setIntervalMinutes(Number(event.target.value) as 15 | 30 | 60)}
            value={intervalMinutes}
          >
            <option value={15}>15 นาที</option>
            <option value={30}>30 นาที</option>
            <option value={60}>60 นาที</option>
          </select>
        </label>
        <div className="flex items-end gap-3">
          <a
            className="inline-flex h-10 items-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
            href="/analysis/load-data/import/sample"
          >
            ดาวน์โหลด CSV ตัวอย่าง
          </a>
          <Button
            onClick={() =>
              setPreview(
                parseCsvLoadProfile(
                  ["timestamp,energy_kwh,power_kw,meter_id", "2026-01-05 00:00,1,1,m1", "2026-01-05 01:00,2,2,m1"].join("\n"),
                  options
                )
              )
            }
          >
            ใช้ demo data
          </Button>
        </div>
      </div>

      {isLoading ? <StateBox text="กำลังอ่านไฟล์..." /> : null}
      {error ? <StateBox tone="error" text={error} /> : null}
      {!preview && !isLoading && !error ? <StateBox text="เลือกไฟล์ CSV/XLSX เพื่อดู Data Preview ก่อน import จริง" /> : null}

      {preview ? (
        <div className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-5">
            <Metric label="Rows" value={preview.rowCount.toString()} />
            <Metric label="Interval" value={preview.detectedIntervalMinutes ? `${preview.detectedIntervalMinutes} นาที` : "-"} />
            <Metric label="Total kWh" value={formatNumber(preview.totalKwh)} />
            <Metric label="Peak kW" value={formatNumber(preview.peakKw)} />
            <Metric label="Warnings/Errors" value={`${preview.warningCount}/${preview.errorCount}`} />
          </div>

          {preview.issues.length > 0 ? (
            <div className="rounded-md border border-border bg-card p-4">
              <h3 className="font-semibold">Validation issues</h3>
              <ul className="mt-3 grid gap-2 text-sm">
                {preview.issues.map((issue, index) => (
                  <li key={`${issue.code}-${index}`} className={issue.severity === "error" ? "text-destructive" : "text-warning-foreground"}>
                    {issue.severity.toUpperCase()} {issue.code}: {issue.messageTh}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">timestamp</th>
                  <th className="px-3 py-2">energy_kwh</th>
                  <th className="px-3 py-2">power_kw</th>
                  <th className="px-3 py-2">meter_id</th>
                </tr>
              </thead>
              <tbody>
                {preview.previewRows.map((row) => (
                  <tr key={row.timestamp} className="border-t border-border">
                    <td className="px-3 py-2">{row.timestamp}</td>
                    <td className="px-3 py-2">{row.energyKwh}</td>
                    <td className="px-3 py-2">{row.powerKw ?? "-"}</td>
                    <td className="px-3 py-2">{row.meterId ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-normal">{value}</p>
    </div>
  );
}

function StateBox({ text, tone = "empty" }: { text: string; tone?: "empty" | "error" }) {
  return (
    <div className={`rounded-md border p-4 text-sm ${tone === "error" ? "border-destructive text-destructive" : "border-border bg-muted/40 text-muted-foreground"}`}>
      {text}
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}
