"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BatteryCharging, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readLocalBillReportSnapshot } from "@/lib/local-bill-report";
import type { LocalBillReportSnapshot } from "@/lib/local-analysis-snapshot";

const audienceProfile = {
  home: "export_home",
  shop: "low_export_home",
  business: "low_export_home"
} satisfies Record<LocalBillReportSnapshot["audience"], string>;

const audienceStrategy = {
  home: "SOLAR_SELF_CONSUMPTION",
  shop: "PEAK_SHAVING",
  business: "PEAK_SHAVING"
} satisfies Record<LocalBillReportSnapshot["audience"], string>;

export function LocalBatteryStart() {
  const [snapshot, setSnapshot] = useState<LocalBillReportSnapshot | null>(null);

  useEffect(() => {
    try {
      setSnapshot(readLocalBillReportSnapshot());
    } catch {
      setSnapshot(null);
    }
  }, []);

  const suggested = useMemo(() => {
    if (!snapshot) return null;

    const averageMonthlyKwh = snapshot.monthCount > 0 ? snapshot.totalKwh / snapshot.monthCount : 0;
    const dailyKwh = averageMonthlyKwh / 30;
    const capacityKwh = clamp(roundToStep(dailyKwh * (snapshot.audience === "home" ? 0.28 : 0.18), 0.5), 5, 40);
    const usableCapacityKwh = roundToStep(capacityKwh * 0.9, 0.5);
    const dischargePowerKw = clamp(roundToStep(capacityKwh / 2.5, 0.5), 2, 15);
    const capexThb = Math.round(capacityKwh * 26000);
    const peakShavingThresholdKw = snapshot.audience === "home" ? 4.5 : Math.max(8, roundToStep(dailyKwh / 3, 0.5));

    return {
      averageMonthlyCost: snapshot.averageMonthlyCostThb,
      averageMonthlyKwh,
      capacityKwh,
      capexThb,
      chargePowerKw: dischargePowerKw,
      dischargePowerKw,
      peakShavingThresholdKw,
      profile: audienceProfile[snapshot.audience],
      strategy: audienceStrategy[snapshot.audience],
      usableCapacityKwh
    };
  }, [snapshot]);

  const batteryHref = useMemo(() => {
    if (!suggested) return "/analysis/battery/results";

    const params = new URLSearchParams({
      audience: snapshot?.audience ?? "home",
      profile: suggested.profile,
      strategy: suggested.strategy,
      capacityKwh: String(suggested.capacityKwh),
      usableCapacityKwh: String(suggested.usableCapacityKwh),
      capexThb: String(suggested.capexThb),
      chargePowerKw: String(suggested.chargePowerKw),
      dischargePowerKw: String(suggested.dischargePowerKw),
      backupReservePercent: "20",
      peakShavingThresholdKw: String(suggested.peakShavingThresholdKw),
      source: "bills"
    });
    return `/analysis/battery/results?${params.toString()}`;
  }, [suggested]);

  if (!snapshot || !suggested) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText aria-hidden="true" className="h-5 w-5 text-primary" />
            ยังไม่มีบิลสำหรับตั้งค่า Battery อัตโนมัติ
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm leading-6 text-muted-foreground">
            เพิ่มบิลหรือใช้ข้อมูลตัวอย่างก่อน แล้วหน้านี้จะแนะนำขนาด Battery เริ่มต้นจากค่าใช้ไฟเฉลี่ยให้
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

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BatteryCharging aria-hidden="true" className="h-5 w-5 text-primary" />
              ตั้งค่า Battery จากบิลที่บันทึกไว้
            </CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              แนะนำค่าเริ่มต้นจากบิล {snapshot.monthCount} เดือนใน browser นี้ โดยยังใช้ dispatch profile แบบ demo/draft
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">{snapshot.dataQualityLabel}</Badge>
            <Badge variant="outline">{snapshot.audience}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="ใช้ไฟเฉลี่ย" value={`${formatNumber(suggested.averageMonthlyKwh)} kWh/เดือน`} />
          <Metric label="ขนาดเริ่มต้น" value={`${formatNumber(suggested.capacityKwh)} kWh`} />
          <Metric label="กำลังจ่ายไฟ" value={`${formatNumber(suggested.dischargePowerKw)} kW`} />
          <Metric label="งบคร่าว ๆ" value={`${formatNumber(suggested.capexThb)} บาท`} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring"
            href={batteryHref}
          >
            รัน Battery จากข้อมูลนี้
            <BatteryCharging aria-hidden="true" className="h-4 w-4" />
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}
