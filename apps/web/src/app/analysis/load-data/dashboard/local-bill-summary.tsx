"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BatteryCharging,
  CalendarDays,
  CarFront,
  Database,
  ReceiptText,
  SunMedium,
  Zap,
  type LucideIcon
} from "lucide-react";
import type { CanonicalLoadProfile, MonthlyBillInput } from "@thai-energy-planner/shared-types";
import { calibrateLoadProfileAgainstBills, estimateDataQuality, summarizeBills, validateMonthlyBills } from "@thai-energy-planner/calculation-engine";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { billWorkspaceStorageKey, localBillReportId, type StoredBillWorkspace } from "@/lib/local-analysis-snapshot";
import { readLocalLoadProfileSnapshot } from "@/lib/local-load-profile";

const audienceSegment: Record<StoredBillWorkspace["audience"], MonthlyBillInput["customerSegment"]> = {
  home: "residential",
  shop: "small_business",
  business: "medium_business"
};

export function LocalBillSummary() {
  const [workspace, setWorkspace] = useState<StoredBillWorkspace | null>(null);
  const [profile, setProfile] = useState<CanonicalLoadProfile | null>(null);
  const [readError, setReadError] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(billWorkspaceStorageKey);
      const parsed = raw ? (JSON.parse(raw) as Partial<StoredBillWorkspace>) : null;
      setWorkspace(parsed && Array.isArray(parsed.rows) ? normalizeWorkspace(parsed) : null);
      setProfile(readLocalLoadProfileSnapshot()?.canonicalProfile ?? null);
      setReadError(false);
    } catch {
      setWorkspace(null);
      setProfile(null);
      setReadError(true);
    }
  }, []);

  const bills = useMemo(() => (workspace ? workspace.rows.map((row) => toBillInput(row, workspace)) : []), [workspace]);
  const completeBills = useMemo(
    () => bills.filter((bill) => bill.month && Number.isFinite(bill.energyKwh) && Number.isFinite(bill.totalCostThb)),
    [bills]
  );
  const validation = useMemo(() => validateMonthlyBills(completeBills), [completeBills]);
  const summary = useMemo(() => summarizeBills(validation.bills), [validation.bills]);
  const dataQuality = useMemo(
    () =>
      estimateDataQuality({
        source: "bill",
        intervalMonths: 0,
        hasTwelveMonthBills: validation.bills.length >= 12
      }),
    [validation.bills.length]
  );
  const calibration = useMemo(
    () => profile && validation.bills.length > 0
      ? calibrateLoadProfileAgainstBills({ profile, bills: validation.bills })
      : null,
    [profile, validation.bills],
  );
  const latestRows = summary.monthlyTrend.slice(-4).reverse();
  const averageMonthlyCost = summary.monthCount > 0 ? summary.totalCostThb / summary.monthCount : 0;
  const billHref = `/analysis/load-data/bills${workspace ? `?audience=${workspace.audience}&source=bills` : ""}`;
  const savedBillQuery = workspace ? `?audience=${workspace.audience}&source=bills` : "";

  if (readError) {
    return (
      <Card className="mt-6 border-warning/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle aria-hidden="true" className="h-5 w-5 text-warning" />
            อ่านข้อมูลบิลในเครื่องนี้ไม่ได้
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            ข้อมูลที่บันทึกไว้ใน browser อาจเสียรูปแบบ ลองกลับไปหน้าเพิ่มบิลแล้วบันทึกใหม่อีกครั้ง
          </p>
          <ActionLink href="/analysis/load-data/bills" label="ไปหน้าเพิ่มบิล" />
        </CardContent>
      </Card>
    );
  }

  if (!workspace || validation.bills.length === 0) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText aria-hidden="true" className="h-5 w-5 text-primary" />
                ข้อมูลบิลในเครื่องนี้
              </CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                ยังไม่มีบิลที่บันทึกไว้ใน browser นี้ เริ่มจากกรอกบิลหรือ import CSV เพื่อให้ dashboard ใช้ข้อมูลจริงของคุณ
              </p>
            </div>
            <Badge variant="outline">Local</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ActionLink href="/analysis/load-data/bills" label="เริ่มเพิ่มบิลค่าไฟ" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText aria-hidden="true" className="h-5 w-5 text-primary" />
              ข้อมูลบิลในเครื่องนี้
            </CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              สรุปจากบิลที่บันทึกไว้ใน browser นี้ อัปเดตล่าสุด {formatDateTime(workspace.updatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">{dataQuality.labelTh}</Badge>
            <Badge variant="outline">{workspace.audience}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric icon={CalendarDays} label="จำนวนเดือน" value={`${summary.monthCount}`} />
          <Metric icon={Database} label="ใช้ไฟรวม" value={`${formatNumber(summary.totalKwh)} kWh`} />
          <Metric icon={ReceiptText} label="ค่าไฟรวม" value={`${formatNumber(summary.totalCostThb)} บาท`} />
          <Metric icon={BarChart3} label="เฉลี่ย/เดือน" value={`${formatNumber(averageMonthlyCost)} บาท`} />
        </div>

        {calibration ? (
          <section className="rounded-md border border-primary/40 bg-primary/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Load Profile เทียบบิลจริง</h2>
              <Badge variant={calibration.comparedMonths.length > 0 ? "success" : "outline"}>
                {calibration.comparedMonths.length} เดือนที่เทียบได้
              </Badge>
            </div>
            {calibration.comparedMonths.length > 0 ? (
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <Metric icon={Zap} label="Profile" value={`${formatNumber(calibration.profileKwh)} kWh`} />
                <Metric icon={ReceiptText} label="Bill" value={`${formatNumber(calibration.billKwh)} kWh`} />
                <Metric icon={BarChart3} label="Difference" value={`${formatNumber(calibration.varianceKwh)} kWh`} />
              </div>
            ) : null}
            {calibration.warnings.map((warning) => <p className="mt-2 text-sm text-warning" key={warning}>{warning}</p>)}
          </section>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-md border border-border bg-muted/25 p-4">
            <h2 className="text-sm font-semibold">เดือนล่าสุด</h2>
            <div className="mt-3 grid gap-2">
              {latestRows.map((row) => (
                <div
                  className="grid grid-cols-[1fr_auto] gap-3 rounded-md border border-border bg-card p-3 text-sm"
                  key={row.month}
                >
                  <div>
                    <p className="font-medium">{formatMonth(row.month)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatNumber(row.energyKwh)} kWh</p>
                  </div>
                  <p className="font-semibold">{formatNumber(row.totalCostThb)} บาท</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-border bg-muted/25 p-4">
            <h2 className="text-sm font-semibold">อ่านค่าด่วน</h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
              <p>
                ค่าเฉลี่ยต่อหน่วยคือ{" "}
                <span className="font-semibold text-foreground">
                  {summary.averageCostPerKwh ? `${formatNumber(summary.averageCostPerKwh)} บาท/kWh` : "ยังคำนวณไม่ได้"}
                </span>
              </p>
              <p>
                เดือนที่ใช้ไฟสูงสุดคือ{" "}
                <span className="font-semibold text-foreground">
                  {summary.highestMonth
                    ? `${formatMonth(summary.highestMonth.month)} (${formatNumber(summary.highestMonth.energyKwh)} kWh)`
                    : "ยังไม่มีข้อมูล"}
                </span>
              </p>
              {validation.issues.length > 0 ? (
                <p className="text-warning">มีรายการที่ควรตรวจสอบ {validation.issues.length} จุด ก่อนใช้วิเคราะห์จริง</p>
              ) : (
                <p>ข้อมูลชุดนี้พร้อมใช้ต่อกับรายงานและการจำลองสถานการณ์เบื้องต้น</p>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-md border border-border bg-muted/25 p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold">ต่อยอดจากข้อมูลบิลนี้</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              เลือกงานถัดไปได้เลย ทุกหน้าด้านล่างจะอ่านข้อมูลบิลที่บันทึกไว้ใน browser นี้เพื่อแนะนำค่าเริ่มต้นให้
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <NextStepLink
              description="เทียบ Normal / TOU และลองย้ายโหลดจากช่วงที่เหมาะกับประเภทผู้ใช้"
              href={`/analysis/scenarios${savedBillQuery}`}
              icon={Zap}
              label="เทียบค่าไฟ"
            />
            <NextStepLink
              description="แนะนำขนาด Solar เริ่มต้น พื้นที่หลังคา และงบลงทุนคร่าว ๆ"
              href={`/analysis/solar${savedBillQuery}`}
              icon={SunMedium}
              label="ลอง Solar"
            />
            <NextStepLink
              description="ประเมินขนาด Battery, กำลังจ่ายไฟ และ CAPEX เบื้องต้น"
              href={`/analysis/battery${savedBillQuery}`}
              icon={BatteryCharging}
              label="ลอง Battery"
            />
            <NextStepLink
              description="ตั้งค่าการชาร์จ EV จากรูปแบบค่าไฟและช่วงเวลาการใช้งาน"
              href={`/analysis/ev${savedBillQuery}`}
              icon={CarFront}
              label="ลอง EV"
            />
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <ActionLink href={billHref} label="แก้ไขข้อมูลบิล" />
          <ActionLink href={`/analysis/reports/${localBillReportId}`} label="เปิดรายงานบิล" variant="outline" />
          <ActionLink href={`/analysis/scenarios${savedBillQuery}`} label="ไปจำลองสถานการณ์" variant="outline" />
        </div>
      </CardContent>
    </Card>
  );
}

function normalizeWorkspace(input: Partial<StoredBillWorkspace>): StoredBillWorkspace {
  return {
    audience: input.audience === "shop" || input.audience === "business" ? input.audience : "home",
    rows: (input.rows ?? []).map((row) => ({
      id: row.id || crypto.randomUUID(),
      month: row.month ?? "",
      energyKwh: row.energyKwh ?? "",
      totalCostThb: row.totalCostThb ?? "",
      authority: row.authority === "MEA" ? "MEA" : "PEA",
      meterMode: row.meterMode === "tou" ? "tou" : "normal"
    })),
    updatedAt: input.updatedAt ?? new Date().toISOString()
  };
}

function toBillInput(row: StoredBillWorkspace["rows"][number], workspace: StoredBillWorkspace): MonthlyBillInput {
  return {
    month: row.month,
    energyKwh: parseLocalizedNumber(row.energyKwh),
    totalCostThb: parseLocalizedNumber(row.totalCostThb),
    authority: row.authority,
    meterMode: row.meterMode,
    customerSegment: audienceSegment[workspace.audience]
  };
}

function Metric({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon aria-hidden="true" className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold tracking-normal">{value}</p>
    </div>
  );
}

function NextStepLink({
  description,
  href,
  icon: Icon,
  label
}: {
  description: string;
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      className="rounded-md border border-border bg-card p-4 transition hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
      href={href}
    >
      <div className="flex items-center gap-2 font-semibold">
        <Icon aria-hidden="true" className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary">
        เปิดดู
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </span>
    </Link>
  );
}

function ActionLink({
  href,
  label,
  variant = "default"
}: {
  href: string;
  label: string;
  variant?: "default" | "outline";
}) {
  const className =
    variant === "outline"
      ? "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
      : "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <Link className={className} href={href}>
      {label}
      <ArrowRight aria-hidden="true" className="h-4 w-4" />
    </Link>
  );
}

function parseLocalizedNumber(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  return normalized ? Number(normalized) : Number.NaN;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  const date = new Date(Number(year), Number(monthNumber) - 1, 1);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString("th-TH-u-ca-gregory", { month: "short", year: "numeric" });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ไม่ทราบเวลา";
  return date.toLocaleString("th-TH-u-ca-gregory", { dateStyle: "medium", timeStyle: "short" });
}
