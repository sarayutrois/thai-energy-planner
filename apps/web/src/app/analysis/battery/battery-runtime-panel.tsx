"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BatteryCharging,
  CheckCircle2,
  CircleDollarSign,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  SunMedium,
  Zap,
} from "lucide-react";
import type { Authority } from "@thai-energy-planner/shared-types";
import { DecisionStory } from "@/components/decision-story";
import { LocalBillResultContext } from "@/components/local-bill-result-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  defaultBatteryMvpSettings,
  evaluateBatteryMvp,
  type BatteryGoal,
  type BatteryMvpDecision,
  type BatteryMvpSettings,
} from "@/lib/battery-mvp";
import { readStoredBillWorkspace } from "@/lib/local-bill-workspace";
import {
  isSampleLocalLoadProfile,
  readLocalLoadProfileSnapshot,
  type LocalLoadProfileSnapshot,
} from "@/lib/local-load-profile";
import type { LocalAnalysisReportDraft } from "@/lib/local-analysis-snapshot";
import { batteryMvpStorageKey } from "@/lib/analysis-storage";

const goals: Array<{
  value: BatteryGoal;
  title: string;
  description: string;
  icon: typeof BatteryCharging;
}> = [
  {
    value: "bill_savings",
    title: "ลดค่าไฟ",
    description: "ชาร์จช่วง Off-Peak แล้วใช้ช่วง Peak เพื่อดูว่าคุ้มทุนหรือไม่",
    icon: CircleDollarSign,
  },
  {
    value: "backup",
    title: "สำรองไฟ",
    description: "เลือกขนาดจากโหลดจำเป็นและจำนวนชั่วโมงที่ต้องการสำรอง",
    icon: ShieldCheck,
  },
  {
    value: "solar_storage",
    title: "เก็บ Solar ส่วนเกิน",
    description: "เก็บไฟกลางวันไว้ใช้ภายหลังและประเมินระบบ Hybrid",
    icon: SunMedium,
  },
];

export function BatteryRuntimePanel() {
  const [profileSnapshot, setProfileSnapshot] =
    useState<LocalLoadProfileSnapshot | null>(null);
  const [settings, setSettings] = useState(defaultBatteryMvpSettings);
  const [decision, setDecision] = useState<BatteryMvpDecision | null>(null);
  const [hasBills, setHasBills] = useState(false);
  const [billMonthCount, setBillMonthCount] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const snapshot = readLocalLoadProfileSnapshot();
    const workspace = readStoredBillWorkspace();
    const validBills =
      workspace?.mode === "user"
        ? workspace.rows.filter(
            (row) => Number(row.energyKwh) > 0 && Number(row.totalCostThb) > 0,
          )
        : [];
    const authority =
      validBills.length > 0 &&
      validBills.every((row) => row.authority === validBills[0]?.authority)
        ? validBills[0]!.authority
        : "PEA";
    const meterMode =
      validBills.length > 0 &&
      validBills.every((row) => row.meterMode === "tou")
        ? "tou"
        : "normal";
    const customerSegment =
      workspace?.audience === "shop" || workspace?.audience === "business"
        ? "small_business"
        : "residential";
    const defaults: BatteryMvpSettings = {
      ...defaultBatteryMvpSettings(),
      authority,
      meterMode,
      customerSegment,
    };
    const stored = readStoredBatteryMvp();
    const restoredSettings = stored?.settings ?? defaults;
    const restoredDecision =
      stored &&
      snapshot &&
      stored.profileSnapshotId === snapshot.id &&
      stored.settingsFingerprint === settingsFingerprint(restoredSettings)
        ? stored.decision
        : null;
    setProfileSnapshot(snapshot);
    setSettings(restoredSettings);
    setDecision(restoredDecision);
    setHasBills(validBills.length > 0);
    setBillMonthCount(validBills.length);
    setIsHydrated(true);
  }, []);

  const reportDraft = useMemo(
    () => (decision ? buildBatteryReportDraft(decision) : undefined),
    [decision],
  );

  function updateSettings(values: Partial<BatteryMvpSettings>) {
    setSettings((current) => ({ ...current, ...values }));
    setDecision(null);
    setError(null);
  }

  function runAnalysis() {
    if (!profileSnapshot?.canonicalProfile) return;
    try {
      const nextDecision = evaluateBatteryMvp({
        profile: profileSnapshot.canonicalProfile,
        settings,
        hasBills,
        hasCalibratedBills: Boolean(
          profileSnapshot.calibration && billMonthCount >= 3,
        ),
        isSample: isSampleLocalLoadProfile(profileSnapshot),
      });
      setDecision(nextDecision);
      setError(null);
      persistBatteryMvp({
        profileSnapshotId: profileSnapshot.id,
        settings,
        decision: nextDecision,
      });
    } catch (caught) {
      setDecision(null);
      setError(
        caught instanceof Error
          ? caught.message
          : "ไม่สามารถประเมิน Battery ได้ในขณะนี้",
      );
    }
  }

  if (!isHydrated) {
    return (
      <Card className="mt-6 border-dashed">
        <CardContent className="p-6 text-sm text-muted-foreground">
          กำลังตรวจข้อมูลการใช้ไฟที่บันทึกไว้…
        </CardContent>
      </Card>
    );
  }

  if (!profileSnapshot?.canonicalProfile) {
    return (
      <Card className="mt-6 border-dashed">
        <CardHeader>
          <CardTitle>เพิ่ม Load Profile ก่อนประเมิน Battery</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Battery ต้องรู้ว่าคุณใช้ไฟเวลาใด เพื่อจำลองการชาร์จ Off-Peak, การใช้
            Solar ส่วนเกิน และระยะสำรองของโหลดจำเป็น
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              href="/analysis/load-data/appliances"
            >
              สร้างจากเครื่องใช้ไฟฟ้า
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium"
              href="/analysis/load-data/import"
            >
              นำเข้าไฟล์โหลด
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-6 grid gap-6">
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BatteryCharging
                  aria-hidden="true"
                  className="h-5 w-5 text-primary"
                />
                กำหนดเป้าหมาย Battery
              </CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                ใช้ “{profileSnapshot.sourceName}” จำนวน{" "}
                {profileSnapshot.rowCount.toLocaleString("th-TH")} ช่วงข้อมูล
                ระบบจะลองขนาดมาตรฐานแล้วเลือกคำตอบให้
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={
                  isSampleLocalLoadProfile(profileSnapshot)
                    ? "warning"
                    : "success"
                }
              >
                {isSampleLocalLoadProfile(profileSnapshot)
                  ? "ข้อมูลตัวอย่าง"
                  : "Load Profile พร้อมใช้"}
              </Badge>
              <Badge variant="outline">
                {hasBills ? `มีบิล ${billMonthCount} เดือน` : "ยังไม่มีบิล"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div>
            <p className="text-sm font-semibold">
              1. ต้องการ Battery เพื่ออะไร
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {goals.map((goal) => (
                <button
                  aria-pressed={settings.goal === goal.value}
                  className={`rounded-xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-ring ${settings.goal === goal.value ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/45"}`}
                  key={goal.value}
                  onClick={() => updateSettings({ goal: goal.value })}
                  type="button"
                >
                  <goal.icon
                    aria-hidden="true"
                    className="h-5 w-5 text-primary"
                  />
                  <span className="mt-3 block font-semibold">{goal.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {goal.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2 lg:grid-cols-4">
            <SelectField
              label="การไฟฟ้า"
              value={settings.authority}
              onChange={(value) =>
                updateSettings({ authority: value as Authority })
              }
              options={[
                { value: "PEA", label: "PEA" },
                { value: "MEA", label: "MEA" },
              ]}
            />
            {settings.goal === "bill_savings" ? (
              <FixedField
                label="มิเตอร์ที่ใช้จำลอง"
                value="TOU — ชาร์จ Off-Peak / ใช้ช่วง Peak"
              />
            ) : (
              <SelectField
                label="มิเตอร์ปัจจุบัน"
                value={settings.meterMode}
                onChange={(value) =>
                  updateSettings({ meterMode: value as "normal" | "tou" })
                }
                options={[
                  { value: "normal", label: "มิเตอร์ปกติ" },
                  { value: "tou", label: "มิเตอร์ TOU" },
                ]}
              />
            )}
            <NumberField
              label="ต้นทุน Battery (บาท/kWh)"
              min={1_000}
              step={1_000}
              value={settings.batteryCostPerKwhThb}
              onChange={(value) =>
                updateSettings({ batteryCostPerKwhThb: value })
              }
            />
            {settings.goal === "solar_storage" ? (
              <NumberField
                label="ขนาด Solar (kWp)"
                min={0.5}
                step={0.5}
                value={settings.solarSystemSizeKwp}
                onChange={(value) =>
                  updateSettings({ solarSystemSizeKwp: value })
                }
              />
            ) : null}
            {settings.goal === "backup" ? (
              <>
                <NumberField
                  label="โหลดจำเป็น (kW)"
                  min={0.1}
                  step={0.1}
                  value={settings.criticalLoadKw}
                  onChange={(value) =>
                    updateSettings({ criticalLoadKw: value })
                  }
                />
                <NumberField
                  label="ต้องการสำรอง (ชั่วโมง)"
                  min={0.5}
                  step={0.5}
                  value={settings.backupHours}
                  onChange={(value) => updateSettings({ backupHours: value })}
                />
                <SelectField
                  label="แหล่งชาร์จสำรอง"
                  value={settings.useSolarForBackup ? "solar" : "grid"}
                  onChange={(value) =>
                    updateSettings({ useSolarForBackup: value === "solar" })
                  }
                  options={[
                    { value: "grid", label: "โครงข่ายไฟฟ้า" },
                    { value: "solar", label: "Solar + โครงข่าย" },
                  ]}
                />
                {settings.useSolarForBackup ? (
                  <NumberField
                    label="ขนาด Solar (kWp)"
                    min={0.5}
                    step={0.5}
                    value={settings.solarSystemSizeKwp}
                    onChange={(value) =>
                      updateSettings({ solarSystemSizeKwp: value })
                    }
                  />
                ) : null}
              </>
            ) : null}
          </div>

          <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs leading-5 text-warning-foreground">
            ราคาตั้งต้นเป็นสมมติฐานสำหรับคัดกรอง ไม่ใช่ราคาตลาดหรือใบเสนอราคา
            กรุณาแก้ให้ตรงกับราคาที่ได้รับก่อนใช้ตัดสินใจ
          </div>
          {error ? (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {formatBatteryError(error)}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={runAnalysis}>
              {decision ? (
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
              ) : (
                <BatteryCharging aria-hidden="true" className="h-4 w-4" />
              )}
              {decision ? "คำนวณใหม่" : "เริ่มประเมิน Battery"}
            </Button>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
              href="/analysis/load-data"
            >
              แก้ไขข้อมูลการใช้ไฟ
            </Link>
          </div>
        </CardContent>
      </Card>

      {decision ? (
        <>
          <DecisionStory
            actions={
              <>
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-card px-4 text-sm font-semibold text-primary shadow-sm"
                  href="/analysis/ecosystem"
                >
                  รวมเป็นแผนพลังงาน
                </Link>
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-primary-foreground/35 px-4 text-sm font-semibold text-primary-foreground"
                  href={
                    hasBills
                      ? "#save-analysis-report"
                      : "/analysis/load-data/bills"
                  }
                >
                  {hasBills ? "บันทึกผล Battery" : "เพิ่มบิลเพื่อทำรายงาน"}
                </Link>
              </>
            }
            confidence={decision.confidenceLabel}
            evidence={[
              { label: "รูปแบบระบบ", value: decision.strategyLabel },
              {
                label: "ขนาด Battery / กำลัง",
                value: `${formatNumber(decision.capacityKwh)} kWh · ${formatNumber(decision.dischargePowerKw)} kW`,
              },
              {
                label: "งบติดตั้งเบื้องต้น",
                value: `${formatMoney(decision.budgetLowThb)}–${formatMoney(decision.budgetHighThb)} บาท`,
              },
              {
                label:
                  settings.goal === "backup"
                    ? "ระยะสำรองโดยประมาณ"
                    : "ประหยัดค่าไฟโดยประมาณ",
                value:
                  settings.goal === "backup"
                    ? `${formatNumber(decision.estimatedBackupHours ?? 0)} ชั่วโมง`
                    : `${formatMoney(decision.annualSavingsThb)} บาท/ปี`,
              },
              {
                label: "ระยะคืนทุน",
                value:
                  settings.goal === "backup"
                    ? "ไม่ใช้เป็นเกณฑ์หลัก"
                    : decision.simplePaybackYears === null
                      ? "ไม่คืนทุนในอายุโครงการ"
                      : `${formatNumber(decision.simplePaybackYears)} ปี`,
              },
            ]}
            limitations={decision.limitations.slice(0, 3)}
            nextAction={decision.nextAction}
            reason={decision.reasons.slice(0, 2).join(" ")}
            title={decision.headline}
            tone={
              decision.verdict === "recommend"
                ? "positive"
                : decision.verdict === "not_recommended"
                  ? "caution"
                  : "neutral"
            }
          />
          <BatterySystemDetails decision={decision} />
          <LocalBillResultContext
            enabled={Boolean(reportDraft && hasBills)}
            moduleName="Battery"
            reportDraft={reportDraft}
          />
        </>
      ) : null}
    </div>
  );
}

function BatterySystemDetails({ decision }: { decision: BatteryMvpDecision }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlugZap aria-hidden="true" className="h-5 w-5 text-primary" />
          ระบบที่กำลังประเมิน
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
          <FlowNode
            icon={decision.sourceLabel.includes("Solar") ? SunMedium : Zap}
            label="แหล่งชาร์จ"
            value={decision.sourceLabel}
          />
          <ArrowRight className="mx-auto h-4 w-4 rotate-90 self-center text-primary md:rotate-0" />
          <FlowNode
            icon={BatteryCharging}
            label="Battery"
            value={`${formatNumber(decision.capacityKwh)} kWh · ใช้ได้ ${formatNumber(decision.usableCapacityKwh)} kWh`}
          />
          <ArrowRight className="mx-auto h-4 w-4 rotate-90 self-center text-primary md:rotate-0" />
          <FlowNode
            icon={PlugZap}
            label="โหลดภายใน"
            value={`จ่ายได้สูงสุดประมาณ ${formatNumber(decision.dischargePowerKw)} kW`}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <DetailMetric
            label="ค่าไฟก่อน Battery"
            value={`${formatMoney(decision.billBeforeBatteryThb)} บาท/เดือน`}
          />
          <DetailMetric
            label="ค่าไฟหลัง Battery"
            value={`${formatMoney(decision.billAfterBatteryThb)} บาท/เดือน`}
          />
          <DetailMetric
            label="Peak ก่อน / หลัง"
            value={`${formatNumber(decision.peakDemandBeforeKw)} → ${formatNumber(decision.peakDemandAfterKw)} kW`}
          />
          <DetailMetric
            label="NPV โดยประมาณ"
            value={`${formatMoney(decision.npvThb)} บาท`}
          />
        </div>
        <details className="group rounded-md border border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold">
            <span>ดูเหตุผล ข้อจำกัด และแหล่งคำนวณทั้งหมด</span>
            <span className="text-xs text-muted-foreground group-open:hidden">
              เปิดรายละเอียด
            </span>
            <span className="hidden text-xs text-muted-foreground group-open:inline">
              ซ่อนรายละเอียด
            </span>
          </summary>
          <div className="grid gap-4 border-t border-border p-4 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold">เหตุผล</p>
              <ul className="mt-2 grid gap-1 text-sm leading-6 text-muted-foreground">
                {decision.reasons.map((reason) => (
                  <li className="flex gap-2" key={reason}>
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold">ข้อจำกัด</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                {decision.limitations.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-muted-foreground lg:col-span-2">
              Engine {decision.engineVersion} · Tariff{" "}
              {decision.tariffVersionIds.join(", ")} · คำนวณ{" "}
              {new Date(decision.calculatedAt).toLocaleString(
                "th-TH-u-ca-gregory",
              )}
            </p>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function FlowNode({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BatteryCharging;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-4 text-center">
      <Icon aria-hidden="true" className="mx-auto h-5 w-5 text-primary" />
      <p className="mt-2 text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{value}</p>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}

function FixedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      <div className="flex min-h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm">
        {value}
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      <select
        className="h-10 rounded-md border border-input bg-background px-3"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      <input
        className="h-10 rounded-md border border-input bg-background px-3"
        min={min}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next) && next >= min) onChange(next);
        }}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}

function buildBatteryReportDraft(
  decision: BatteryMvpDecision,
): LocalAnalysisReportDraft {
  return {
    module: "battery",
    moduleLabel: "Battery",
    title: "รายงานประเมิน Battery จาก Load Profile",
    summary: decision.headline,
    metrics: [
      { label: "คำแนะนำ", value: decision.verdictLabel },
      {
        label: "ขนาด Battery",
        value: `${formatNumber(decision.capacityKwh)} kWh`,
      },
      {
        label: "กำลังจ่าย",
        value: `${formatNumber(decision.dischargePowerKw)} kW`,
      },
      {
        label: "งบประมาณ",
        value: `${formatMoney(decision.budgetLowThb)}–${formatMoney(decision.budgetHighThb)} บาท`,
      },
    ],
    assumptions: [
      { label: "รูปแบบระบบ", value: decision.strategyLabel },
      { label: "แหล่งชาร์จ", value: decision.sourceLabel },
      { label: "ความมั่นใจ", value: decision.confidenceLabel },
    ],
    resultRows: [
      {
        case: "ก่อน Battery",
        monthlyBillThb: roundReportNumber(decision.billBeforeBatteryThb),
        gridImportKwh: roundReportNumber(decision.gridImportBeforeKwh),
        peakDemandKw: roundReportNumber(decision.peakDemandBeforeKw),
      },
      {
        case: "หลัง Battery",
        monthlyBillThb: roundReportNumber(decision.billAfterBatteryThb),
        gridImportKwh: roundReportNumber(decision.gridImportAfterKwh),
        peakDemandKw: roundReportNumber(decision.peakDemandAfterKw),
      },
    ],
    recommendations: [
      {
        title: decision.headline,
        description: decision.reasons.join(" "),
        nextAction: decision.nextAction,
      },
    ],
    limitations: decision.limitations.map((limitation) => ({
      title: "ข้อจำกัดของการประเมิน",
      description: limitation,
    })),
    references: [
      { label: "Calculation engine", value: decision.engineVersion },
      { label: "Tariff versions", value: decision.tariffVersionIds.join(", ") },
    ],
  };
}

type StoredBatteryMvp = {
  schemaVersion: 1;
  profileSnapshotId: string;
  settingsFingerprint: string;
  settings: BatteryMvpSettings;
  decision: BatteryMvpDecision;
};

function persistBatteryMvp(input: {
  profileSnapshotId: string;
  settings: BatteryMvpSettings;
  decision: BatteryMvpDecision;
}) {
  try {
    const stored: StoredBatteryMvp = {
      schemaVersion: 1,
      profileSnapshotId: input.profileSnapshotId,
      settingsFingerprint: settingsFingerprint(input.settings),
      settings: input.settings,
      decision: input.decision,
    };
    window.localStorage.setItem(batteryMvpStorageKey, JSON.stringify(stored));
  } catch {
    // The result remains available in memory when local storage is unavailable.
  }
}

function readStoredBatteryMvp(): StoredBatteryMvp | null {
  try {
    const raw = window.localStorage.getItem(batteryMvpStorageKey);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredBatteryMvp>;
    if (
      value.schemaVersion !== 1 ||
      typeof value.profileSnapshotId !== "string" ||
      typeof value.settingsFingerprint !== "string" ||
      !value.settings ||
      !value.decision
    )
      return null;
    return value as StoredBatteryMvp;
  } catch {
    return null;
  }
}

function settingsFingerprint(settings: BatteryMvpSettings) {
  return JSON.stringify(settings);
}

function formatBatteryError(value: string) {
  if (value.includes("No FT period matches"))
    return "ยังไม่มีข้อมูล Ft ที่ตรงกับวันที่ของ Load Profile กรุณาเลือกข้อมูลช่วงเวลาปัจจุบันหรือตรวจอัตราค่าไฟ";
  return value;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(
    value,
  );
}

function roundReportNumber(value: number) {
  return Number(value.toFixed(2));
}
