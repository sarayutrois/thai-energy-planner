"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CarFront, PlugZap, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readLocalBillReportSnapshot } from "@/lib/local-bill-report";
import type { LocalBillReportSnapshot } from "@/lib/local-analysis-snapshot";

const audienceProfile = {
  home: "ev_evening",
  shop: "low_export_home",
  business: "low_export_home"
} satisfies Record<LocalBillReportSnapshot["audience"], string>;

const audienceStrategy = {
  home: "OFF_PEAK",
  shop: "SMART",
  business: "SMART"
} satisfies Record<LocalBillReportSnapshot["audience"], string>;

export function LocalEvStart() {
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
    const dailyDistanceKm = clamp(Math.round((averageMonthlyKwh / 30) * (snapshot.audience === "home" ? 1.6 : 1.1)), 20, 120);
    const chargerPowerKw = snapshot.audience === "home" ? 7 : 11;
    const arrivalTime = snapshot.audience === "home" ? "18:30" : "19:30";
    const departureTime = snapshot.audience === "home" ? "07:00" : "08:30";

    return {
      arrivalTime,
      averageMonthlyCost: snapshot.averageMonthlyCostThb,
      averageMonthlyKwh,
      chargerPowerKw,
      dailyDistanceKm,
      departureTime,
      initialSocPercent: 35,
      profile: audienceProfile[snapshot.audience],
      strategy: audienceStrategy[snapshot.audience],
      targetSocPercent: 85
    };
  }, [snapshot]);

  const evHref = useMemo(() => {
    if (!suggested) return "/analysis/ev/results";

    const params = new URLSearchParams({
      audience: snapshot?.audience ?? "home",
      profile: suggested.profile,
      strategy: suggested.strategy,
      dailyDistanceKm: String(suggested.dailyDistanceKm),
      chargerPowerKw: String(suggested.chargerPowerKw),
      arrivalTime: suggested.arrivalTime,
      departureTime: suggested.departureTime,
      targetSocPercent: String(suggested.targetSocPercent),
      initialSocPercent: String(suggested.initialSocPercent),
      source: "bills"
    });
    return `/analysis/ev/results?${params.toString()}`;
  }, [suggested]);

  if (!snapshot || !suggested) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText aria-hidden="true" className="h-5 w-5 text-primary" />
            ยังไม่มีบิลสำหรับตั้งค่า EV อัตโนมัติ
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm leading-6 text-muted-foreground">
            กรุณาเพิ่มบิลหรือสร้าง Load Profile ก่อน ระบบจึงจะแนะนำช่วงเวลาชาร์จ EV จากข้อมูลการใช้ไฟของคุณได้
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
              <CarFront aria-hidden="true" className="h-5 w-5 text-primary" />
              ตั้งค่า EV จากบิลที่บันทึกไว้
            </CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              แนะนำค่าเริ่มต้นจากบิล {snapshot.monthCount} เดือนในเซสชันนี้ โดยยังใช้ EV charging profile แบบประเมินเบื้องต้น
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
          <Metric label="ใช้ไฟเฉลี่ยเดิม" value={`${formatNumber(suggested.averageMonthlyKwh)} kWh/เดือน`} />
          <Metric label="ระยะทางตั้งต้น" value={`${formatNumber(suggested.dailyDistanceKm)} กม./วัน`} />
          <Metric label="กำลังชาร์จ" value={`${formatNumber(suggested.chargerPowerKw)} kW`} />
          <Metric label="เวลาชาร์จ" value={`${suggested.arrivalTime}-${suggested.departureTime}`} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring"
            href={evHref}
          >
            รัน EV จากข้อมูลนี้
            <PlugZap aria-hidden="true" className="h-4 w-4" />
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}
