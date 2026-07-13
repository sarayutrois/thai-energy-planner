"use client";

import { useState } from "react";
import type { LoadProfilePreview } from "@thai-energy-planner/calculation-engine/load-data";
import type { LoadProfileSourceKind } from "@thai-energy-planner/shared-types";
import { Button } from "@/components/ui/button";
import { saveLocalLoadProfileSnapshot } from "@/lib/local-load-profile";

type LoadProfilePreviewResponse =
  | {
      ok: true;
      preview: LoadProfilePreview;
    }
  | {
      ok: false;
      error: string;
    };

export function LoadProfileImporter() {
  const [preview, setPreview] = useState<LoadProfilePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sourceName, setSourceName] = useState("ข้อมูล Load Profile ที่นำเข้า");
  const [intervalMinutes, setIntervalMinutes] = useState<15 | 30 | 60>(60);
  const [mapping, setMapping] = useState({
    timestamp: "timestamp",
    energyKwh: "energy_kwh",
    powerKw: "power_kw",
  });

  async function handleFile(file: File | null) {
    setError(null);
    setPreview(null);
    setSavedMessage(null);
    if (!file) return;

    await requestPreview(file);
  }

  async function loadTestCsv() {
    setError(null);
    setPreview(null);
    setSavedMessage(null);
    setIsLoading(true);
    try {
      const response = await fetch("/test-upload-15min.csv");
      if (!response.ok) throw new Error("ไม่สามารถโหลดไฟล์ CSV ทดสอบได้");
      const file = new File([await response.blob()], "test-upload-15min.csv", {
        type: "text/csv",
      });
      await requestPreview(file, 15);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "โหลดไฟล์ CSV ทดสอบไม่สำเร็จ",
      );
      setIsLoading(false);
    }
  }

  async function loadInlineDemo() {
    setError(null);
    setPreview(null);
    setSavedMessage(null);

    const file = new File(
      [
        [
          "timestamp,energy_kwh,power_kw,meter_id",
          "2026-07-01 09:00,1.0,1.0,m1",
          "2026-07-01 10:00,1.2,1.2,m1",
          "2026-07-01 11:00,1.4,1.4,m1",
          "2026-07-01 12:00,1.1,1.1,m1",
        ].join("\n"),
      ],
      "inline-demo.csv",
      { type: "text/csv" },
    );
    await requestPreview(file, 60);
  }

  async function requestPreview(
    file: File,
    overrideIntervalMinutes = intervalMinutes,
  ) {
    setSourceName(file.name);
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("intervalMinutes", String(overrideIntervalMinutes));
      formData.set("timestamp", mapping.timestamp);
      formData.set("energyKwh", mapping.energyKwh);
      formData.set("powerKw", mapping.powerKw);

      const response = await fetch("/api/load-profiles/preview", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as LoadProfilePreviewResponse;
      if (!response.ok || !result.ok) {
        throw new Error(
          result.ok ? "Load profile preview failed." : result.error,
        );
      }

      setPreview(result.preview);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "อ่านไฟล์โหลดโปรไฟล์ไม่สำเร็จ",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function saveForAnalysis(sourceName = "ข้อมูล Load Profile ที่นำเข้า") {
    if (!preview?.canImport || preview.rowCount === 0) return;
    const resolvedIntervalMinutes =
      preview.detectedIntervalMinutes ?? intervalMinutes;

    const snapshot = saveLocalLoadProfileSnapshot({
      sourceName,
      totalKwh: preview.totalKwh,
      peakKw: preview.peakKw,
      detectedIntervalMinutes: resolvedIntervalMinutes,
      rows: preview.rows.map((row) => ({
        timestamp: row.timestamp,
        energyKwh: row.energyKwh,
        ...(row.powerKw === undefined ? {} : { powerKw: row.powerKw }),
        ...(row.meterId === undefined ? {} : { meterId: row.meterId }),
      })),
      sourceKind: sourceKindFromFileName(sourceName),
      warnings: preview.issues
        .filter((issue) => issue.severity === "warning")
        .map((issue) => `${issue.code}: ${issue.messageTh}`),
    });

    setSavedMessage(
      `บันทึก ${snapshot.rowCount.toLocaleString("th-TH")} intervals แล้ว พร้อมใช้ใน Solar Analysis`,
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium">
          ไฟล์ข้อมูล
          <input
            accept=".csv,.xlsx"
            className="rounded-md border border-input bg-white px-3 py-2 text-sm"
            onChange={(event) =>
              void handleFile(event.target.files?.[0] ?? null)
            }
            type="file"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          คอลัมน์วันและเวลา
          <input
            className="h-10 rounded-md border border-input px-3 text-sm"
            onChange={(event) =>
              setMapping((current) => ({
                ...current,
                timestamp: event.target.value,
              }))
            }
            value={mapping.timestamp}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          คอลัมน์พลังงาน (kWh)
          <input
            className="h-10 rounded-md border border-input px-3 text-sm"
            onChange={(event) =>
              setMapping((current) => ({
                ...current,
                energyKwh: event.target.value,
              }))
            }
            value={mapping.energyKwh}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          คอลัมน์กำลังไฟ (kW)
          <input
            className="h-10 rounded-md border border-input px-3 text-sm"
            onChange={(event) =>
              setMapping((current) => ({
                ...current,
                powerKw: event.target.value,
              }))
            }
            value={mapping.powerKw}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          ช่วงเวลา
          <select
            className="h-10 rounded-md border border-input px-3 text-sm"
            onChange={(event) =>
              setIntervalMinutes(Number(event.target.value) as 15 | 30 | 60)
            }
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
          <Button onClick={() => void loadInlineDemo()}>
            โหลดชุดข้อมูลสำหรับทดสอบ (ไม่ใช่ข้อมูลจริง)
          </Button>
          <Button onClick={() => void loadTestCsv()} variant="outline">
            ทดลองด้วยไฟล์ตัวอย่าง
          </Button>
        </div>
      </div>

      {isLoading ? <StateBox text="กำลังอ่านไฟล์..." /> : null}
      {error ? <StateBox tone="error" text={error} /> : null}
      {!preview && !isLoading && !error ? (
        <StateBox text="เลือกไฟล์ CSV/XLSX เพื่อดูตัวอย่างข้อมูลก่อนนำเข้าจริง" />
      ) : null}

      {preview ? (
        <div className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-5">
            <Metric label="จำนวนแถว" value={preview.rowCount.toString()} />
            <Metric
              label="ช่วงเวลา"
              value={
                preview.detectedIntervalMinutes
                  ? `${preview.detectedIntervalMinutes} นาที`
                  : "-"
              }
            />
            <Metric label="พลังงานรวม (kWh)" value={formatNumber(preview.totalKwh)} />
            <Metric label="กำลังไฟสูงสุด (kW)" value={formatNumber(preview.peakKw)} />
            <Metric
              label="คำเตือน/ข้อผิดพลาด"
              value={`${preview.warningCount}/${preview.errorCount}`}
            />
          </div>

          {preview.canImport && preview.rowCount > 0 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-success bg-success/10 p-4 text-sm">
              <Button onClick={() => saveForAnalysis(sourceName)} type="button">
                บันทึกข้อมูลนี้เพื่อใช้วิเคราะห์ Solar
              </Button>
              <a
                className="inline-flex h-10 items-center rounded-md border border-border bg-card px-4 font-medium hover:bg-muted"
                href="/analysis/solar?source=interval"
              >
                ไปหน้าประเมิน Solar
              </a>
              <span className="text-muted-foreground">
                {savedMessage ??
                  "ข้อมูลจะถูกเก็บใน browser นี้และส่งเข้า /api/solar/analyze"}
              </span>
            </div>
          ) : null}

          {preview.issues.length > 0 ? (
            <div className="rounded-md border border-border bg-card p-4">
              <h3 className="font-semibold">รายการที่ควรตรวจสอบ</h3>
              <ul className="mt-3 grid gap-2 text-sm">
                {preview.issues.map((issue, index) => (
                  <li
                    key={`${issue.code}-${index}`}
                    className={
                      issue.severity === "error"
                        ? "text-destructive"
                        : "text-warning-foreground"
                    }
                  >
                    {issue.severity.toUpperCase()} {issue.code}:{" "}
                    {issue.messageTh}
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

function StateBox({
  text,
  tone = "empty",
}: {
  text: string;
  tone?: "empty" | "error";
}) {
  return (
    <div
      className={`rounded-md border p-4 text-sm ${tone === "error" ? "border-destructive text-destructive" : "border-border bg-muted/40 text-muted-foreground"}`}
    >
      {text}
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function sourceKindFromFileName(fileName: string): LoadProfileSourceKind {
  const normalized = fileName.toLowerCase();
  if (normalized.endsWith(".xlsx")) return "xlsx";
  if (normalized.endsWith(".csv")) return "csv";
  return "demo";
}
