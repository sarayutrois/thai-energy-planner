"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BatteryCharging,
  CarFront,
  CheckCircle2,
  Clock3,
  RefreshCw,
  SunMedium,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Authority } from "@thai-energy-planner/shared-types";
import { DecisionStory } from "@/components/decision-story";
import { LocalBillResultContext } from "@/components/local-bill-result-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { evMvpStorageKey } from "@/lib/analysis-storage";
import {
  defaultEvMvpSettings,
  evaluateEvMvp,
  type EvMvpDecision,
  type EvMvpSettings,
} from "@/lib/ev-mvp";
import { readStoredBillWorkspace } from "@/lib/local-bill-workspace";
import {
  isSampleLocalLoadProfile,
  readLocalLoadProfileSnapshot,
  type LocalLoadProfileSnapshot,
} from "@/lib/local-load-profile";
import type { LocalAnalysisReportDraft } from "@/lib/local-analysis-snapshot";
import {
  readStoredSolarAnalysis,
  readStoredSolarAssumptions,
} from "@/lib/local-solar-analysis";

export function EvRuntimePanel() {
  const [profileSnapshot, setProfileSnapshot] =
    useState<LocalLoadProfileSnapshot | null>(null);
  const [settings, setSettings] = useState(defaultEvMvpSettings);
  const [decision, setDecision] = useState<EvMvpDecision | null>(null);
  const [hasBills, setHasBills] = useState(false);
  const [billMonthCount, setBillMonthCount] = useState(0);
  const [solarDefaultSource, setSolarDefaultSource] = useState<string | null>(
    null,
  );
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
    const currentMeterMode =
      validBills.length > 0 &&
      validBills.every((row) => row.meterMode === "tou")
        ? "tou"
        : "normal";
    const customerSegment =
      workspace?.audience === "shop" || workspace?.audience === "business"
        ? "small_business"
        : "residential";
    const storedSolarAnalysis = readStoredSolarAnalysis(window.localStorage);
    const storedSolarAssumptions = readStoredSolarAssumptions(
      window.localStorage,
    );
    const recommendedSolarSize =
      storedSolarAnalysis &&
      snapshot &&
      storedSolarAnalysis.profileSnapshotId === snapshot.id
        ? (storedSolarAnalysis.result.analysis.sizing.recommended
            ?.systemSizeKwp ?? null)
        : null;
    const solarSystemSizeKwp =
      recommendedSolarSize ??
      storedSolarAssumptions?.systemSizeKwp ??
      defaultEvMvpSettings().solarSystemSizeKwp;
    if (recommendedSolarSize)
      setSolarDefaultSource("ใช้ขนาดจากผล Solar ล่าสุดเป็นค่าเริ่มต้น");
    else if (storedSolarAssumptions)
      setSolarDefaultSource("ใช้ขนาดจากสมมติฐาน Solar ที่บันทึกไว้");
    const defaults: EvMvpSettings = {
      ...defaultEvMvpSettings(),
      authority,
      currentMeterMode,
      customerSegment,
      solarSystemSizeKwp,
    };
    const stored = readStoredEvMvp();
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
    () => (decision ? buildEvReportDraft(decision) : undefined),
    [decision],
  );

  function updateSettings(values: Partial<EvMvpSettings>) {
    setSettings((current) => ({ ...current, ...values }));
    setDecision(null);
    setError(null);
  }

  function runAnalysis() {
    if (!profileSnapshot?.canonicalProfile) return;
    try {
      const nextDecision = evaluateEvMvp({
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
      persistEvMvp({
        profileSnapshotId: profileSnapshot.id,
        settings,
        decision: nextDecision,
      });
    } catch (caught) {
      setDecision(null);
      setError(
        caught instanceof Error
          ? caught.message
          : "ไม่สามารถประเมินแผนชาร์จ EV ได้ในขณะนี้",
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
          <CardTitle>เพิ่ม Load Profile ก่อนวางแผนชาร์จ EV</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm leading-6 text-muted-foreground">
            ระบบต้องรู้ว่าโหลดบ้านสูงช่วงไหน เพื่อหลีกเลี่ยง Peak
            และเทียบต้นทุนชาร์จบน Normal, TOU และ Solar
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
                <CarFront aria-hidden="true" className="h-5 w-5 text-primary" />
                ข้อมูลรถและรูปแบบชาร์จ
              </CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                ใช้ “{profileSnapshot.sourceName}” จำนวน{" "}
                {profileSnapshot.rowCount.toLocaleString("th-TH")} ช่วงข้อมูล
                แล้วลองทุกแผนชาร์จให้โดยอัตโนมัติ
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
          <InputSection
            icon={CarFront}
            title="1. การเดินทางและตัวรถ"
            description="ใช้หาพลังงานที่ต้องเติมในวันที่ขับรถ"
          >
            <NumberField
              label="ระยะทางต่อวัน (km)"
              min={0}
              step={5}
              value={settings.dailyDistanceKm}
              onChange={(value) => updateSettings({ dailyDistanceKm: value })}
            />
            <NumberField
              label="จำนวนวันที่ขับต่อสัปดาห์"
              min={0}
              max={7}
              step={1}
              value={settings.weeklyDrivingDays}
              onChange={(value) =>
                updateSettings({
                  weeklyDrivingDays: Math.round(Math.min(7, value)),
                })
              }
            />
            <NumberField
              label="ขนาดแบตรถ (kWh)"
              min={10}
              step={5}
              value={settings.vehicleBatteryKwh}
              onChange={(value) => updateSettings({ vehicleBatteryKwh: value })}
            />
            <NumberField
              label="ประสิทธิภาพรถ (km/kWh)"
              min={1}
              step={0.5}
              value={settings.efficiencyKmPerKwh}
              onChange={(value) =>
                updateSettings({ efficiencyKmPerKwh: value })
              }
            />
          </InputSection>

          <InputSection
            icon={Clock3}
            title="2. เวลาจอดบ้านและเครื่องชาร์จ"
            description="ระบบจะตรวจว่าชาร์จทันก่อนออกเดินทางหรือไม่"
          >
            <NumberField
              label="กำลังเครื่องชาร์จ (kW)"
              min={1}
              step={0.1}
              value={settings.chargerPowerKw}
              onChange={(value) => updateSettings({ chargerPowerKw: value })}
            />
            <TimeField
              label="รถถึงบ้าน"
              value={settings.arrivalTime}
              onChange={(value) => updateSettings({ arrivalTime: value })}
            />
            <TimeField
              label="รถออกจากบ้าน"
              value={settings.departureTime}
              onChange={(value) => updateSettings({ departureTime: value })}
            />
            <NumberField
              label="ค่าชาร์จนอกบ้าน (บาท/kWh)"
              min={0}
              step={0.5}
              value={settings.outsideChargingCostPerKwh}
              onChange={(value) =>
                updateSettings({ outsideChargingCostPerKwh: value })
              }
            />
          </InputSection>

          <InputSection
            icon={Zap}
            title="3. ค่าไฟและ Solar"
            description="ใช้เทียบ Normal, TOU และไฟกลางวันที่มีอยู่"
          >
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
            <SelectField
              label="มิเตอร์ปัจจุบัน"
              value={settings.currentMeterMode}
              onChange={(value) =>
                updateSettings({
                  currentMeterMode: value as "normal" | "tou",
                })
              }
              options={[
                { value: "normal", label: "มิเตอร์ปกติ" },
                { value: "tou", label: "มิเตอร์ TOU" },
              ]}
            />
            <button
              aria-pressed={settings.hasSolar}
              className={`rounded-md border p-3 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-ring ${settings.hasSolar ? "border-primary bg-primary/10" : "border-input bg-background"}`}
              onClick={() => updateSettings({ hasSolar: !settings.hasSolar })}
              type="button"
            >
              <span className="flex items-center gap-2 font-medium">
                <SunMedium
                  aria-hidden="true"
                  className="h-4 w-4 text-primary"
                />
                บ้านมี Solar ใช้งานอยู่
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                เปิดเมื่อมีระบบจริง ไม่ใช่แค่เคยประเมิน
              </span>
            </button>
            {settings.hasSolar ? (
              <NumberField
                label="ขนาด Solar (kWp)"
                min={0.5}
                step={0.5}
                value={settings.solarSystemSizeKwp}
                onChange={(value) =>
                  updateSettings({ solarSystemSizeKwp: value })
                }
                {...(solarDefaultSource ? { hint: solarDefaultSource } : {})}
              />
            ) : null}
          </InputSection>

          <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs leading-5 text-warning-foreground">
            ผลนี้ประเมินค่าไฟและความพร้อมในการชาร์จที่บ้าน
            ไม่ใช่การเปรียบเทียบราคาซื้อ EV กับรถน้ำมัน
          </div>
          {error ? (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {formatEvError(error)}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={runAnalysis}>
              {decision ? (
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
              ) : (
                <CarFront aria-hidden="true" className="h-4 w-4" />
              )}
              {decision ? "คำนวณใหม่" : "เริ่มวางแผนชาร์จ EV"}
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
                  {hasBills ? "บันทึกผล EV" : "เพิ่มบิลเพื่อทำรายงาน"}
                </Link>
              </>
            }
            confidence={decision.confidenceLabel}
            evidence={[
              {
                label: "มิเตอร์ / วิธีชาร์จ",
                value: `${decision.selectedMeterMode === "tou" ? "TOU" : "Normal"} · ${decision.strategyLabel}`,
              },
              {
                label: "เครื่องชาร์จ",
                value: decision.chargerRecommendationLabel,
              },
              {
                label: "ไฟสำหรับ EV",
                value: `${formatNumber(decision.monthlyEvEnergyKwh)} kWh/เดือน`,
              },
              {
                label: "ต้นทุนชาร์จรวม",
                value: `${formatMoney(decision.monthlyChargingCostThb)} บาท/เดือน`,
              },
              {
                label: "ต้นทุนต่อระยะทาง",
                value:
                  decision.costPer100Km === null
                    ? "ยังคำนวณไม่ได้"
                    : `${formatMoney(decision.costPer100Km)} บาท/100 km`,
              },
            ]}
            limitations={decision.limitations.slice(0, 3)}
            nextAction={decision.nextAction}
            reason={decision.reasons.slice(0, 3).join(" ")}
            title={decision.headline}
            tone={decision.verdict === "ready" ? "positive" : "caution"}
          />
          <EvSystemDetails decision={decision} />
          <LocalBillResultContext
            enabled={Boolean(reportDraft && hasBills)}
            moduleName="EV"
            reportDraft={reportDraft}
          />
        </>
      ) : null}
    </div>
  );
}

function EvSystemDetails({ decision }: { decision: EvMvpDecision }) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap aria-hidden="true" className="h-5 w-5 text-primary" />
            แผนชาร์จที่ระบบเลือก
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
            <FlowNode
              icon={decision.solarChargingSharePercent > 0 ? SunMedium : Zap}
              label="แหล่งพลังงาน"
              value={
                decision.solarChargingSharePercent > 0
                  ? `กริด + Solar ${formatNumber(decision.solarChargingSharePercent)}%`
                  : decision.selectedMeterMode === "tou"
                    ? "กริด · TOU"
                    : "กริด · มิเตอร์ปกติ"
              }
            />
            <ArrowRight className="mx-auto h-4 w-4 rotate-90 self-center text-primary md:rotate-0" />
            <FlowNode
              icon={BatteryCharging}
              label="เครื่องชาร์จ"
              value={`${formatNumber(decision.configuredChargerPowerKw)} kW · ${decision.strategyLabel}`}
            />
            <ArrowRight className="mx-auto h-4 w-4 rotate-90 self-center text-primary md:rotate-0" />
            <FlowNode
              icon={CarFront}
              label="รถ EV"
              value={`${formatNumber(decision.monthlyDistanceKm)} km/เดือน`}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <DetailMetric
              label="ค่าไฟก่อน EV"
              value={`${formatMoney(decision.billBeforeEvThb)} บาท/เดือน`}
            />
            <DetailMetric
              label="ค่าไฟหลัง EV"
              value={`${formatMoney(decision.billAfterEvThb)} บาท/เดือน`}
            />
            <DetailMetric
              label="ชาร์จที่บ้าน"
              value={`${formatNumber(decision.homeChargingSharePercent)}%`}
            />
            <DetailMetric
              label="Peak เพิ่มขึ้น"
              value={`${formatNumber(decision.peakDemandIncreaseKw)} kW`}
            />
          </div>
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
            <p className="flex items-center gap-2 font-semibold">
              <BatteryCharging
                aria-hidden="true"
                className="h-5 w-5 text-primary"
              />
              ควรมี Battery หรือไม่
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {decision.batteryGuidance}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>เทียบมิเตอร์จากแผนชาร์จที่ดีที่สุด</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            {decision.alternatives.map((alternative) => (
              <div
                className={`rounded-xl border p-4 ${alternative.meterMode === decision.selectedMeterMode ? "border-primary bg-primary/5" : "border-border"}`}
                key={alternative.meterMode}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{alternative.meterLabel}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {alternative.strategyLabel}
                    </p>
                  </div>
                  {alternative.meterMode === decision.selectedMeterMode ? (
                    <Badge variant="success">แนะนำ</Badge>
                  ) : null}
                </div>
                <dl className="mt-4 grid gap-2 text-sm">
                  <InfoRow
                    label="ต้นทุนชาร์จรวม"
                    value={`${formatMoney(alternative.monthlyChargingCostThb)} บาท/เดือน`}
                  />
                  <InfoRow
                    label="บิลบ้านเพิ่ม"
                    value={`${formatMoney(alternative.monthlyBillIncreaseThb)} บาท/เดือน`}
                  />
                  <InfoRow
                    label="ชาร์จครบ"
                    value={alternative.chargingComplete ? "ครบ" : "ไม่ครบ"}
                  />
                </dl>
              </div>
            ))}
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-4 text-sm leading-6">
            <span className="font-semibold">คำแนะนำเรื่องมิเตอร์: </span>
            <span className="text-muted-foreground">
              {decision.meterRecommendationLabel}
            </span>
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
    </div>
  );
}

function InputSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {children}
      </div>
    </section>
  );
}

function FlowNode({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
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
  max,
  step,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  step: number;
  hint?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      <input
        className="h-10 rounded-md border border-input bg-background px-3"
        max={max}
        min={min}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next) && next >= min) onChange(next);
        }}
        step={step}
        type="number"
        value={value}
      />
      {hint ? (
        <span className="text-xs font-normal text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      <input
        className="h-10 rounded-md border border-input bg-background px-3"
        onChange={(event) => onChange(event.target.value)}
        type="time"
        value={value}
      />
    </label>
  );
}

function buildEvReportDraft(decision: EvMvpDecision): LocalAnalysisReportDraft {
  return {
    module: "ev",
    moduleLabel: "EV",
    title: "รายงานวางแผนชาร์จ EV จาก Load Profile",
    summary: decision.headline,
    metrics: [
      { label: "สถานะ", value: decision.verdictLabel },
      {
        label: "มิเตอร์ / วิธีชาร์จ",
        value: decision.meterRecommendationLabel,
      },
      { label: "เครื่องชาร์จ", value: decision.chargerRecommendationLabel },
      {
        label: "ต้นทุนชาร์จ",
        value: `${formatMoney(decision.monthlyChargingCostThb)} บาท/เดือน`,
      },
    ],
    assumptions: [
      {
        label: "ระยะทาง",
        value: `${formatNumber(decision.monthlyDistanceKm)} km/เดือน`,
      },
      {
        label: "พลังงาน EV",
        value: `${formatNumber(decision.monthlyEvEnergyKwh)} kWh/เดือน`,
      },
      {
        label: "เวลาชาร์จในวันที่ขับ",
        value: `${formatNumber(decision.dailyChargingHours)} ชั่วโมง`,
      },
      { label: "ความมั่นใจ", value: decision.confidenceLabel },
    ],
    resultRows: decision.alternatives.map((alternative) => ({
      meter: alternative.meterLabel,
      chargingPlan: alternative.strategyLabel,
      monthlyChargingCostThb: roundReportNumber(
        alternative.monthlyChargingCostThb,
      ),
      monthlyBillIncreaseThb: roundReportNumber(
        alternative.monthlyBillIncreaseThb,
      ),
      costPer100Km: roundReportNumber(alternative.costPer100Km),
      peakDemandIncreaseKw: roundReportNumber(alternative.peakDemandIncreaseKw),
    })),
    recommendations: [
      {
        title: decision.headline,
        description: decision.reasons.join(" "),
        nextAction: decision.nextAction,
      },
      {
        title: "คำแนะนำเรื่อง Battery",
        description: decision.batteryGuidance,
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

type StoredEvMvp = {
  schemaVersion: 1;
  profileSnapshotId: string;
  settingsFingerprint: string;
  settings: EvMvpSettings;
  decision: EvMvpDecision;
};

function persistEvMvp(input: {
  profileSnapshotId: string;
  settings: EvMvpSettings;
  decision: EvMvpDecision;
}) {
  try {
    const stored: StoredEvMvp = {
      schemaVersion: 1,
      profileSnapshotId: input.profileSnapshotId,
      settingsFingerprint: settingsFingerprint(input.settings),
      settings: input.settings,
      decision: input.decision,
    };
    window.localStorage.setItem(evMvpStorageKey, JSON.stringify(stored));
  } catch {
    // The result remains available in memory when local storage is unavailable.
  }
}

function readStoredEvMvp(): StoredEvMvp | null {
  try {
    const raw = window.localStorage.getItem(evMvpStorageKey);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredEvMvp>;
    if (
      value.schemaVersion !== 1 ||
      typeof value.profileSnapshotId !== "string" ||
      typeof value.settingsFingerprint !== "string" ||
      !value.settings ||
      !value.decision
    )
      return null;
    return value as StoredEvMvp;
  } catch {
    return null;
  }
}

function settingsFingerprint(settings: EvMvpSettings) {
  return JSON.stringify(settings);
}

function formatEvError(value: string) {
  if (value.includes("No FT period matches"))
    return "ยังไม่มีข้อมูล Ft ที่ตรงกับวันที่ของ Load Profile กรุณาเลือกข้อมูลช่วงเวลาปัจจุบันหรือตรวจอัตราค่าไฟ";
  if (value.includes("Invalid EV config"))
    return "ข้อมูลรถหรือเวลาชาร์จไม่ถูกต้อง กรุณาตรวจระยะทาง แบตรถ กำลังชาร์จ และเวลาอีกครั้ง";
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

function roundReportNumber(value: number | null) {
  return value === null ? null : Number(value.toFixed(2));
}
