"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, ReceiptText, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readLocalBillReportSnapshot } from "@/lib/local-bill-report";
import type { LocalBillReportSnapshot } from "@/lib/local-analysis-snapshot";

const audienceProfile = {
  home: "evening_home",
  shop: "daytime_shop",
  business: "daytime_shop"
} satisfies Record<LocalBillReportSnapshot["audience"], string>;

const audienceSourceWindow = {
  home: { start: "18:00", end: "22:00", target: "22:00-06:00" },
  shop: { start: "10:00", end: "16:00", target: "16:00-20:00" },
  business: { start: "09:00", end: "17:00", target: "17:00-21:00" }
} satisfies Record<LocalBillReportSnapshot["audience"], { start: string; end: string; target: string }>;

export function LocalScenarioStart() {
  const [snapshot, setSnapshot] = useState<LocalBillReportSnapshot | null>(null);

  useEffect(() => {
    try {
      setSnapshot(readLocalBillReportSnapshot());
    } catch {
      setSnapshot(null);
    }
  }, []);

  const scenarioHref = useMemo(() => {
    if (!snapshot) return "/analysis/scenarios/results";

    const averageKwh = snapshot.monthCount > 0 ? snapshot.totalKwh / snapshot.monthCount : 0;
    const shiftPercent = averageKwh >= 900 ? 30 : averageKwh >= 500 ? 25 : 18;
    const window = audienceSourceWindow[snapshot.audience];
    const params = new URLSearchParams({
      profile: audienceProfile[snapshot.audience],
      normalTariff: "demo-normal",
      touTariff: "demo-tou",
      meterCost: "2500",
      shiftPercent: String(shiftPercent),
      sourceStart: window.start,
      sourceEnd: window.end,
      targetWindow: window.target
    });
    return `/analysis/scenarios/results?${params.toString()}`;
  }, [snapshot]);

  if (!snapshot) {
    return (
      <Card className="mt-6 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText aria-hidden="true" className="h-5 w-5 text-primary" />
            ยังไม่มีข้อมูลบิลสำหรับตั้ง scenario
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm leading-6 text-muted-foreground">
            เพิ่มบิลหรือใช้ข้อมูลตัวอย่างก่อน แล้วหน้านี้จะแนะนำ profile และช่วงเวลาย้ายโหลดให้ใกล้กับข้อมูลของคุณมากขึ้น
          </p>
          <Link
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring"
            href="/analysis/new"
          >
            ไปเริ่มวิเคราะห์
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  const averageKwh = snapshot.monthCount > 0 ? snapshot.totalKwh / snapshot.monthCount : 0;
  const averageCost = snapshot.averageMonthlyCostThb;
  const window = audienceSourceWindow[snapshot.audience];

  return (
    <Card className="mt-6 border-primary/40 bg-primary/5">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap aria-hidden="true" className="h-5 w-5 text-primary" />
              ตั้ง scenario จากบิลที่บันทึกไว้
            </CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              ใช้ข้อมูล {snapshot.monthCount} เดือนใน browser นี้เพื่อเลือก profile และช่วงเวลาย้ายโหลดเบื้องต้น
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">{snapshot.dataQualityLabel}</Badge>
            <Badge variant="outline">{snapshot.audience}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="ใช้ไฟเฉลี่ย" value={`${formatNumber(averageKwh)} kWh/เดือน`} />
          <Metric label="ค่าไฟเฉลี่ย" value={`${formatNumber(averageCost)} บาท/เดือน`} />
          <Metric label="ช่วงที่ควรลองย้าย" value={`${window.start}-${window.end} -> ${window.target}`} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring"
            href={scenarioHref}
          >
            ดูผล Normal / TOU จากข้อมูลนี้
            <BarChart3 aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            href="/analysis/load-data/bills"
          >
            แก้ไขบิลก่อน
            <ReceiptText aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}
