"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ReceiptText, SunMedium } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readLocalBillReportSnapshot } from "@/lib/local-bill-report";
import type { LocalBillReportSnapshot } from "@/lib/local-analysis-snapshot";

const audienceProfile = {
  home: "evening_home",
  shop: "daytime_shop",
  business: "daytime_shop"
} satisfies Record<LocalBillReportSnapshot["audience"], string>;

export function LocalSolarStart() {
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
    const daytimeBias = snapshot.audience === "home" ? 0.42 : 0.62;
    const targetSolarKwhPerMonth = averageMonthlyKwh * daytimeBias * 0.85;
    const systemSizeKwp = clamp(roundToStep(targetSolarKwhPerMonth / 120, 0.5), 2, snapshot.audience === "home" ? 10 : 30);
    const capexThb = Math.round(systemSizeKwp * (snapshot.audience === "home" ? 43000 : 40000));

    return {
      averageMonthlyKwh,
      averageMonthlyCost: snapshot.averageMonthlyCostThb,
      capexThb,
      profile: audienceProfile[snapshot.audience],
      roofAreaSqm: Math.round(systemSizeKwp * 6),
      systemSizeKwp
    };
  }, [snapshot]);

  const solarHref = useMemo(() => {
    if (!suggested) return "/analysis/solar/results";

    const params = new URLSearchParams({
      audience: snapshot?.audience ?? "home",
      profile: suggested.profile,
      baseline: snapshot?.audience === "home" ? "normal" : "tou",
      systemSizeKwp: String(suggested.systemSizeKwp),
      roofAreaSqm: String(suggested.roofAreaSqm),
      province: "Bangkok",
      capexThb: String(suggested.capexThb),
      oAndMCostPerYear: String(Math.round(suggested.capexThb * 0.01)),
      projectLifeYears: "20",
      discountRatePercent: "6",
      exportEnabled: "true",
      exportRateThbPerKwh: "2.2",
      source: "bills"
    });
    return `/analysis/solar/results?${params.toString()}`;
  }, [snapshot?.audience, suggested]);

  if (!snapshot || !suggested) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText aria-hidden="true" className="h-5 w-5 text-primary" />
            ยังไม่มีบิลสำหรับตั้งค่า Solar อัตโนมัติ
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm leading-6 text-muted-foreground">
            เพิ่มบิลหรือใช้ข้อมูลตัวอย่างก่อน แล้วหน้านี้จะแนะนำขนาด Solar เริ่มต้นจากค่าใช้ไฟเฉลี่ยให้
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
              <SunMedium aria-hidden="true" className="h-5 w-5 text-primary" />
              ตั้งค่า Solar จากบิลที่บันทึกไว้
            </CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              แนะนำค่าเริ่มต้นจากบิล {snapshot.monthCount} เดือนในเซสชันนี้ เป็นข้อมูลประกอบการตัดสินใจเบื้องต้นก่อนตรวจหน้างานและใบเสนอราคาจริง
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
          <Metric label="ค่าไฟเฉลี่ย" value={`${formatNumber(suggested.averageMonthlyCost)} บาท/เดือน`} />
          <Metric label="ขนาดเริ่มต้น" value={`${formatNumber(suggested.systemSizeKwp)} kWp`} />
          <Metric label="งบคร่าว ๆ" value={`${formatNumber(suggested.capexThb)} บาท`} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring"
            href={solarHref}
          >
            รัน Solar จากข้อมูลนี้
            <SunMedium aria-hidden="true" className="h-4 w-4" />
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
