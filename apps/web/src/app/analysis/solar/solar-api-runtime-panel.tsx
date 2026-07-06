"use client";

import { useCallback, useEffect, useState } from "react";
import { FileUp, RefreshCw, ServerCog } from "lucide-react";
import type { SolarAnalysisResult } from "@thai-energy-planner/calculation-engine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readLocalLoadProfileSnapshot, type LocalLoadProfileSnapshot } from "@/lib/local-load-profile";
import type { SolarDemoSettings } from "@/lib/solar-demo";

type SolarAnalyzeResponse =
  | {
      ok: true;
      analysis: SolarAnalysisResult;
      trace: {
        authority: "PEA" | "MEA";
        customerSegment: "residential" | "small_business";
        billDate: string;
        inputIntervalCount: number;
        uploadedSolarIntervalCount: number;
        tariffVersionIds: string[];
      };
      warnings: string[];
    }
  | {
      ok: false;
      error: string;
      issues?: Array<{ path: string; message: string }>;
    };

const solarApiTimeoutMs = 12_000;

export function SolarApiRuntimePanel({ settings }: { settings: SolarDemoSettings }) {
  const [snapshot, setSnapshot] = useState<LocalLoadProfileSnapshot | null>(null);
  const [payload, setPayload] = useState<Extract<SolarAnalyzeResponse, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runAnalysis = useCallback(async (profileSnapshot: LocalLoadProfileSnapshot) => {
    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), solarApiTimeoutMs);

    try {
      const response = await fetch("/api/solar/analyze", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          province: settings.province,
          profile: settings.profile,
          modelMode: settings.modelMode,
          billDate: "2026-07-01",
          voltageLevel: "low_voltage",
          customerSegment: settings.profile === "daytime_shop" ? "small_business" : "residential",
          systemSizeKwp: settings.systemSizeKwp,
          roofAreaSqm: settings.roofAreaSqm,
          roofAzimuth: settings.roofAzimuth,
          roofTilt: settings.roofTilt,
          systemLossPercent: settings.systemLossPercent,
          shadingLossPercent: settings.shadingLossPercent,
          degradationPercentPerYear: settings.degradationPercentPerYear,
          capexThb: settings.capexThb,
          oAndMCostPerYear: settings.oAndMCostPerYear,
          projectLifeYears: settings.projectLifeYears,
          discountRatePercent: settings.discountRatePercent,
          electricityEscalationRatePercent: settings.electricityEscalationRatePercent,
          inverterReplacementCostThb: settings.inverterReplacementCostThb,
          inverterReplacementYear: settings.inverterReplacementYear,
          exportEnabled: settings.exportEnabled,
          exportRateThbPerKwh: settings.exportRateThbPerKwh,
          exportLimitKw: settings.exportLimitKw,
          loadIntervals: profileSnapshot.rows
        })
      });
      const result = (await response.json()) as SolarAnalyzeResponse;

      if (!response.ok || !result.ok) {
        const issueText = result.ok ? "" : result.issues?.map((issue) => issue.message).join(", ");
        throw new Error((result.ok ? null : result.error) || issueText || "Solar analysis failed.");
      }

      setPayload(result);
    } catch (caught) {
      setPayload(null);
      setError(getRuntimeErrorMessage(caught));
    } finally {
      window.clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [settings]);

  useEffect(() => {
    const nextSnapshot = readLocalLoadProfileSnapshot();
    setSnapshot(nextSnapshot);
    if (nextSnapshot) void runAnalysis(nextSnapshot);
  }, [runAnalysis]);

  if (!snapshot) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp aria-hidden="true" className="h-5 w-5 text-primary" />
            Uploaded interval data
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm leading-6 text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>ยังไม่มี load profile ที่บันทึกไว้ใน browser นี้ ระบบจึงใช้ generated screening profile ก่อน</p>
          <a className="inline-flex h-10 items-center rounded-md border border-border bg-card px-4 font-medium text-foreground hover:bg-muted" href="/analysis/load-data/import">
            Upload load profile
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ServerCog aria-hidden="true" className="h-5 w-5 text-primary" />
              API analysis from uploaded interval data
            </CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              ใช้ profile `{snapshot.sourceName}` จำนวน {snapshot.rowCount.toLocaleString("th-TH")} intervals แล้วส่งเข้า /api/solar/analyze
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{snapshot.detectedIntervalMinutes ? `${snapshot.detectedIntervalMinutes} min` : "interval"}</Badge>
            <Badge variant="outline">{formatNumber(snapshot.totalKwh)} kWh</Badge>
            {payload ? <Badge variant="success">{payload.trace.authority}</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {isLoading ? (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
            กำลังรัน Solar API จาก load profile ที่อัปโหลดไว้ ถ้าใช้เวลานานเกินไป ระบบจะหยุดและแสดง fallback แทน
          </div>
        ) : null}
        {error ? <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
        {payload ? <RuntimeMetrics analysis={payload.analysis} trace={payload.trace} /> : null}
        {payload?.warnings.length ? (
          <div className="rounded-md border border-warning bg-warning/10 p-3 text-sm leading-6 text-warning-foreground">
            {payload.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button disabled={isLoading} onClick={() => void runAnalysis(snapshot)} type="button" variant="outline">
            <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />
            {isLoading ? "Running..." : "Run API analysis again"}
          </Button>
          <a className="inline-flex h-10 items-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-muted" href="/analysis/load-data/import">
            Replace load profile
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

function getRuntimeErrorMessage(caught: unknown) {
  if (caught instanceof DOMException && caught.name === "AbortError") {
    return "Solar API ใช้เวลานานเกินไป ระบบหยุดการคำนวณรอบนี้แล้ว และยังคงแสดงผล screening profile ด้านล่างให้ใช้งานต่อได้";
  }
  return caught instanceof Error ? caught.message : "Solar analysis failed.";
}

function RuntimeMetrics({
  analysis,
  trace
}: {
  analysis: SolarAnalysisResult;
  trace: Extract<SolarAnalyzeResponse, { ok: true }>["trace"];
}) {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      <Metric label="Best after solar" value={analysis.billComparison.bestWithSolar.label} />
      <Metric label="Annual benefit" value={`${formatNumber(analysis.billComparison.netAnnualBenefit)} baht`} />
      <Metric label="Payback" value={analysis.financial.simplePaybackYears ? `${analysis.financial.simplePaybackYears} years` : "-"} />
      <Metric label="Self-use" value={`${formatNumber(analysis.selfConsumption.selfConsumptionRatio * 100)}%`} />
      <Metric label="API intervals" value={trace.inputIntervalCount.toLocaleString("th-TH")} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}
