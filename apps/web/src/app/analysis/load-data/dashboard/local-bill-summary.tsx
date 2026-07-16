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
  type LucideIcon,
} from "lucide-react";
import type {
  CanonicalLoadProfile,
  MonthlyBillInput,
} from "@thai-energy-planner/shared-types";
import {
  calibrateLoadProfileAgainstBills,
  estimateDataQuality,
  summarizeBills,
  validateMonthlyBills,
} from "@thai-energy-planner/calculation-engine";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  localBillReportId,
  type StoredBillWorkspace,
} from "@/lib/local-analysis-snapshot";
import { readStoredBillWorkspace } from "@/lib/local-bill-workspace";
import {
  persistLocalLoadProfile,
  readLocalLoadProfileSnapshot,
  saveLocalLoadProfileSnapshot,
  type LocalLoadProfileSnapshot,
} from "@/lib/local-load-profile";

const audienceSegment: Record<
  StoredBillWorkspace["audience"],
  MonthlyBillInput["customerSegment"]
> = {
  home: "residential",
  shop: "small_business",
  business: "medium_business",
};

export function LocalBillSummary() {
  const [workspace, setWorkspace] = useState<StoredBillWorkspace | null>(null);
  const [snapshot, setSnapshot] = useState<LocalLoadProfileSnapshot | null>(
    null,
  );
  const [profile, setProfile] = useState<CanonicalLoadProfile | null>(null);
  const [readError, setReadError] = useState(false);
  const [applyStatus, setApplyStatus] = useState<
    "idle" | "saving" | "saved" | "local_only"
  >("idle");

  useEffect(() => {
    try {
      const parsed = readStoredBillWorkspace();
      setWorkspace(parsed?.mode === "user" ? normalizeWorkspace(parsed) : null);
      const nextSnapshot = readLocalLoadProfileSnapshot();
      setSnapshot(nextSnapshot);
      setProfile(nextSnapshot?.canonicalProfile ?? null);
      setReadError(false);
    } catch {
      setWorkspace(null);
      setProfile(null);
      setReadError(true);
    }
  }, []);

  const bills = useMemo(
    () =>
      workspace ? workspace.rows.map((row) => toBillInput(row, workspace)) : [],
    [workspace],
  );
  const completeBills = useMemo(
    () =>
      bills.filter(
        (bill) =>
          bill.month &&
          Number.isFinite(bill.energyKwh) &&
          Number.isFinite(bill.totalCostThb),
      ),
    [bills],
  );
  const validation = useMemo(
    () => validateMonthlyBills(completeBills),
    [completeBills],
  );
  const summary = useMemo(
    () => summarizeBills(validation.bills),
    [validation.bills],
  );
  const dataQuality = useMemo(
    () =>
      estimateDataQuality({
        source: "bill",
        intervalMonths: 0,
        hasTwelveMonthBills: validation.bills.length >= 12,
      }),
    [validation.bills.length],
  );
  const calibration = useMemo(
    () =>
      profile && validation.bills.length > 0
        ? calibrateLoadProfileAgainstBills({ profile, bills: validation.bills })
        : null,
    [profile, validation.bills],
  );
  const lowestCalibrationCoverage = calibration?.comparedMonths.reduce(
    (lowest, month) => Math.min(lowest, month.coverageRatio),
    1,
  );
  const latestRows = summary.monthlyTrend.slice(-4).reverse();
  const averageMonthlyCost =
    summary.monthCount > 0 ? summary.totalCostThb / summary.monthCount : 0;
  const estimatedProfileMonthlyKwh = useMemo(() => {
    if (!snapshot || snapshot.rows.length === 0) return null;
    const days = new Set(snapshot.rows.map((row) => bangkokDate(row.timestamp)))
      .size;
    return days > 0 ? (snapshot.totalKwh / days) * 30.44 : null;
  }, [snapshot]);
  const averageBillMonthlyKwh =
    summary.monthCount > 0 ? summary.totalKwh / summary.monthCount : null;
  const calibrationFactor =
    estimatedProfileMonthlyKwh && averageBillMonthlyKwh
      ? averageBillMonthlyKwh / estimatedProfileMonthlyKwh
      : null;
  const isCalibrated = snapshot?.calibration !== undefined;
  const profileMonthlyKwhBeforeCalibration =
    snapshot?.calibration?.profileMonthlyKwhBefore ??
    estimatedProfileMonthlyKwh;
  const unexplainedKwh =
    profileMonthlyKwhBeforeCalibration && averageBillMonthlyKwh
      ? averageBillMonthlyKwh - profileMonthlyKwhBeforeCalibration
      : null;
  const unexplainedPercent =
    unexplainedKwh !== null && averageBillMonthlyKwh
      ? Math.abs(unexplainedKwh / averageBillMonthlyKwh) * 100
      : null;
  const calibrationReliability = getCalibrationReliability({
    billMonthCount: validation.bills.length,
    unexplainedPercent,
    isCalibrated,
  });
  const billHref = `/analysis/load-data/bills${workspace ? `?audience=${workspace.audience}&source=bills` : ""}`;
  const savedBillQuery = workspace
    ? `?audience=${workspace.audience}&source=bills`
    : "";

  async function applyBillCalibration() {
    if (
      !snapshot ||
      !calibrationFactor ||
      !Number.isFinite(calibrationFactor) ||
      calibrationFactor <= 0
    )
      return;
    setApplyStatus("saving");
    const rows = snapshot.rows.map((row) => ({
      ...row,
      energyKwh: row.energyKwh * calibrationFactor,
      ...(row.powerKw === undefined
        ? {}
        : { powerKw: row.powerKw * calibrationFactor }),
    }));
    const nextSnapshot = saveLocalLoadProfileSnapshot({
      sourceName: `${snapshot.sourceName.replace(" (ปรับเทียบกับบิล)", "")} (ปรับเทียบกับบิล)`,
      sourceKind: snapshot.canonicalProfile?.source.kind ?? "appliance",
      totalKwh: rows.reduce((sum, row) => sum + row.energyKwh, 0),
      peakKw: Math.max(0, ...rows.map((row) => row.powerKw ?? 0)),
      detectedIntervalMinutes: snapshot.detectedIntervalMinutes,
      rows,
      warnings: [
        `ปรับสเกล ${calibrationFactor.toFixed(3)} เท่า จากค่าเฉลี่ยบิล ${formatNumber(averageBillMonthlyKwh ?? 0)} kWh/เดือน`,
        "รูปแบบเวลาการใช้ไฟยังมาจาก Load Profile เดิม; การปรับเทียบนี้ใช้ค่าเฉลี่ยบิลต่อเดือน",
      ],
      calibration: {
        appliedAt: new Date().toISOString(),
        factor: calibrationFactor,
        billMonthlyKwh: averageBillMonthlyKwh ?? 0,
        profileMonthlyKwhBefore: estimatedProfileMonthlyKwh ?? 0,
      },
      persist: false,
    });
    const result = await persistLocalLoadProfile(nextSnapshot);
    setSnapshot(nextSnapshot);
    setProfile(nextSnapshot.canonicalProfile ?? null);
    setApplyStatus(result.status === "saved" ? "saved" : "local_only");
  }

  if (readError) {
    return (
      <Card className="mt-6 border-warning/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle
              aria-hidden="true"
              className="h-5 w-5 text-warning"
            />
            อ่านข้อมูลบิลในเครื่องนี้ไม่ได้
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            ข้อมูลที่บันทึกไว้ใน browser อาจเสียรูปแบบ
            ลองกลับไปหน้าเพิ่มบิลแล้วบันทึกใหม่อีกครั้ง
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
                <ReceiptText
                  aria-hidden="true"
                  className="h-5 w-5 text-primary"
                />
                ข้อมูลบิลในเครื่องนี้
              </CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                ยังไม่มีบิลที่บันทึกไว้ใน browser นี้ เริ่มจากกรอกบิลหรือ import
                CSV เพื่อให้ dashboard ใช้ข้อมูลจริงของคุณ
              </p>
            </div>
            <Badge variant="outline">Local</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ActionLink
            href="/analysis/load-data/bills"
            label="เริ่มเพิ่มบิลค่าไฟ"
          />
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
              <ReceiptText
                aria-hidden="true"
                className="h-5 w-5 text-primary"
              />
              ข้อมูลบิลในเครื่องนี้
            </CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              สรุปจากบิลที่บันทึกไว้ใน browser นี้ อัปเดตล่าสุด{" "}
              {formatDateTime(workspace.updatedAt)}
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
          <Metric
            icon={CalendarDays}
            label="จำนวนเดือน"
            value={`${summary.monthCount}`}
          />
          <Metric
            icon={Database}
            label="ใช้ไฟรวม"
            value={`${formatNumber(summary.totalKwh)} kWh`}
          />
          <Metric
            icon={ReceiptText}
            label="ค่าไฟรวม"
            value={`${formatNumber(summary.totalCostThb)} บาท`}
          />
          <Metric
            icon={BarChart3}
            label="เฉลี่ย/เดือน"
            value={`${formatNumber(averageMonthlyCost)} บาท`}
          />
        </div>

        {calibration ? (
          <section className="rounded-md border border-primary/40 bg-primary/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">
                Load Profile เทียบบิลจริง
              </h2>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={
                    calibration.comparedMonths.length > 0
                      ? "success"
                      : "outline"
                  }
                >
                  {calibration.comparedMonths.length} เดือนที่เทียบได้
                </Badge>
                <Badge variant={calibrationReliability.variant}>
                  {calibrationReliability.label}
                </Badge>
              </div>
            </div>
            {calibration.comparedMonths.length > 0 ? (
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <Metric
                  icon={Zap}
                  label="Load จากรายการเครื่องใช้"
                  value={`${formatNumber(calibration.profileKwh)} kWh`}
                />
                <Metric
                  icon={ReceiptText}
                  label="ข้อมูลจากบิล"
                  value={`${formatNumber(calibration.billKwh)} kWh`}
                />
                <Metric
                  icon={BarChart3}
                  label="ส่วนต่างที่ตรวจพบ"
                  value={`${formatNumber(calibration.varianceKwh)} kWh`}
                />
                <Metric
                  icon={Database}
                  label="ความครอบคลุมต่ำสุด"
                  value={`${formatNumber((lowestCalibrationCoverage ?? 0) * 100)}%`}
                />
              </div>
            ) : null}
            {calibration.warnings.map((warning) => (
              <p className="mt-2 text-sm text-warning" key={warning}>
                {warning}
              </p>
            ))}
            {estimatedProfileMonthlyKwh &&
            averageBillMonthlyKwh &&
            calibrationFactor ? (
              <div className="mt-4 rounded-md border border-primary/30 bg-background p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">
                      สรุปการเทียบกับบิล
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      ระบบจะปรับเฉพาะปริมาณไฟรวมให้ใกล้บิล
                      โดยคงรูปแบบเวลาใช้งานจาก Load Profile เดิมไว้
                    </p>
                  </div>
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                    disabled={
                      applyStatus === "saving" ||
                      Math.abs(calibrationFactor - 1) < 0.005
                    }
                    onClick={() => void applyBillCalibration()}
                    type="button"
                  >
                    {applyStatus === "saving"
                      ? "กำลังบันทึก..."
                      : isCalibrated
                        ? "ปรับเทียบใหม่ตามบิลล่าสุด"
                        : "ยืนยันใช้บิลปรับสเกล"}
                  </button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <Metric
                    icon={Zap}
                    label="Load ก่อนปรับ"
                    value={`${formatNumber(profileMonthlyKwhBeforeCalibration ?? 0)} kWh/เดือน`}
                  />
                  <Metric
                    icon={ReceiptText}
                    label="เฉลี่ยจากบิล"
                    value={`${formatNumber(averageBillMonthlyKwh)} kWh/เดือน`}
                  />
                  <Metric
                    icon={AlertTriangle}
                    label="ส่วนต่างที่ยังอธิบายไม่ได้"
                    value={
                      unexplainedKwh === null
                        ? "-"
                        : `${formatNumber(Math.abs(unexplainedKwh))} kWh (${formatNumber(unexplainedPercent ?? 0)}%)`
                    }
                  />
                  <Metric
                    icon={Database}
                    label="Load ที่ Solar จะใช้"
                    value={`${formatNumber(isCalibrated ? estimatedProfileMonthlyKwh : averageBillMonthlyKwh)} kWh/เดือน`}
                  />
                  <Metric
                    icon={BarChart3}
                    label="ตัวคูณที่ใช้"
                    value={`${formatNumber(calibrationFactor)} เท่า`}
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {calibrationReliability.explanation}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {applyStatus === "saved"
                    ? "บันทึก Profile ที่ปรับเทียบแล้วในบัญชีเรียบร้อย"
                    : applyStatus === "local_only"
                      ? "บันทึก Profile ที่ปรับเทียบแล้วในอุปกรณ์นี้"
                      : isCalibrated
                        ? `ปรับเทียบล่าสุด ${formatDateTime(snapshot?.calibration?.appliedAt ?? "")}; ปรับใหม่ได้เมื่อข้อมูลบิลเปลี่ยน`
                        : "ผลเปรียบเทียบค่าไฟและ Solar จะใช้ Profile ที่ปรับเทียบแล้วหลังคุณยืนยัน"}
                </p>
              </div>
            ) : null}
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
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatNumber(row.energyKwh)} kWh
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatNumber(row.totalCostThb)} บาท
                  </p>
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
                  {summary.averageCostPerKwh
                    ? `${formatNumber(summary.averageCostPerKwh)} บาท/kWh`
                    : "ยังคำนวณไม่ได้"}
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
                <p className="text-warning">
                  มีรายการที่ควรตรวจสอบ {validation.issues.length} จุด
                  ก่อนใช้วิเคราะห์จริง
                </p>
              ) : (
                <p>
                  ข้อมูลชุดนี้พร้อมใช้ต่อกับรายงานและการจำลองสถานการณ์เบื้องต้น
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-md border border-border bg-muted/25 p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold">ขั้นต่อไปที่แนะนำ</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {profile
                ? "เริ่มจากเทียบค่าไฟ Normal / TOU แล้วระบบจะพาไปประเมิน Solar ต่อ"
                : "สร้าง Load Profile ก่อน เพื่อให้ระบบรู้ว่าคุณใช้ไฟช่วงเวลาใดและคำนวณ TOU กับ Solar ได้"}
            </p>
          </div>
          <Link
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-primary/92"
            href={
              profile
                ? `/analysis/scenarios${savedBillQuery}`
                : "/analysis/load-data/appliances"
            }
          >
            {profile ? "เทียบค่าไฟ Normal / TOU" : "สร้าง Load Profile"}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            ทางเลือกเสริม
          </p>
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
              description="ประเมินขนาด Battery งบ ระยะสำรอง และความคุ้มค่าจาก Load Profile"
              href={`/analysis/battery${savedBillQuery}`}
              icon={BatteryCharging}
              label="ลอง Battery"
            />
            <NextStepLink
              description="เทียบแผนชาร์จ Normal, TOU, Solar และกำลังเครื่องชาร์จที่เหมาะสม"
              href={`/analysis/ev${savedBillQuery}`}
              icon={CarFront}
              label="วางแผนชาร์จ EV"
            />
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <ActionLink href={billHref} label="แก้ไขข้อมูลบิล" />
          <ActionLink
            href={`/analysis/reports/${localBillReportId}`}
            label="เปิดรายงานบิล"
            variant="outline"
          />
          <ActionLink
            href={`/analysis/scenarios${savedBillQuery}`}
            label="ไปจำลองสถานการณ์"
            variant="outline"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function getCalibrationReliability(input: {
  billMonthCount: number;
  unexplainedPercent: number | null;
  isCalibrated: boolean;
}) {
  if (!input.isCalibrated) {
    return {
      label: "รอยืนยันการปรับเทียบ",
      variant: "outline" as const,
      explanation:
        "ยังไม่ได้ยืนยันให้ใช้บิลปรับสเกล ผลเปรียบเทียบค่าไฟและ Solar ยังอ้างอิง Load Profile เดิม",
    };
  }
  if (input.billMonthCount >= 3 && (input.unexplainedPercent ?? 100) <= 15) {
    return {
      label: "ความน่าเชื่อถือสูง",
      variant: "success" as const,
      explanation:
        "มีข้อมูลบิลอย่างน้อย 3 เดือนและ Load Profile ใกล้เคียงบิลมากพอสำหรับใช้เป็นข้อมูลตั้งต้น",
    };
  }
  if (input.billMonthCount >= 1 && (input.unexplainedPercent ?? 100) <= 35) {
    return {
      label: "ความน่าเชื่อถือปานกลาง",
      variant: "outline" as const,
      explanation:
        "ใช้บิลปรับปริมาณรวมแล้ว แต่ควรเพิ่มเครื่องใช้หรือบิลอีกหลายเดือนเพื่อยืนยันรูปแบบการใช้ไฟ",
    };
  }
  return {
    label: "ความน่าเชื่อถือต่ำ",
    variant: "warning" as const,
    explanation:
      "ส่วนต่างจากบิลยังมากหรือข้อมูลบิลยังน้อย ควรเพิ่มเครื่องใช้ที่ตกหล่นและตรวจเวลาใช้งานก่อนตัดสินใจลงทุน",
  };
}

function normalizeWorkspace(
  input: Partial<StoredBillWorkspace>,
): StoredBillWorkspace {
  return {
    audience:
      input.audience === "shop" || input.audience === "business"
        ? input.audience
        : "home",
    rows: (input.rows ?? []).map((row) => ({
      id: row.id || crypto.randomUUID(),
      month: row.month ?? "",
      energyKwh: row.energyKwh ?? "",
      totalCostThb: row.totalCostThb ?? "",
      authority: row.authority === "MEA" ? "MEA" : "PEA",
      meterMode: row.meterMode === "tou" ? "tou" : "normal",
    })),
    mode: "user",
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

function toBillInput(
  row: StoredBillWorkspace["rows"][number],
  workspace: StoredBillWorkspace,
): MonthlyBillInput {
  return {
    month: row.month,
    energyKwh: parseLocalizedNumber(row.energyKwh),
    totalCostThb: parseLocalizedNumber(row.totalCostThb),
    authority: row.authority,
    meterMode: row.meterMode,
    customerSegment: audienceSegment[workspace.audience],
  };
}

function Metric({
  icon: Icon,
  label,
  value,
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
  label,
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
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
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
  variant = "default",
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
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  const date = new Date(Number(year), Number(monthNumber) - 1, 1);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString("th-TH-u-ca-gregory", {
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ไม่ทราบเวลา";
  return date.toLocaleString("th-TH-u-ca-gregory", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function bangkokDate(timestamp: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : timestamp;
}
