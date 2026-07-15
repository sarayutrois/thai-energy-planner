"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { SolarAnalysisResult } from "@thai-energy-planner/calculation-engine";
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Calculator,
  CircleDollarSign,
  Info,
  Settings,
  ShieldCheck,
  SunMedium,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SolarAnalysisChartPanel } from "@/components/solar-analysis-chart-panel";
import { SolarLocationFields } from "@/components/solar-location-fields";
import {
  getSolarAssumptionDraft,
  solarProfileOptions,
  type SolarAssumptionSettings,
} from "@/lib/solar-assumptions";
import {
  clearStoredSolarAssumptions,
  persistSolarAssumptions,
  readStoredSolarAssumptions,
  solarSettingsFingerprint,
} from "@/lib/local-solar-analysis";
import {
  formatApproximateMoneyRange,
  solarReadinessCopy,
} from "@/lib/solar-readiness-copy";
import { PageHeader } from "@/components/ui/page-layout";
import { DecisionStory } from "@/components/decision-story";

type SavedBillContext = {
  audience?: string | undefined;
  source?: string | undefined;
};

const tabs = [
  { key: "overview", href: "/analysis/solar", label: "1. ข้อมูลประเมิน" },
  {
    key: "config",
    href: "/analysis/solar/config",
    label: "2. สมมติฐาน",
  },
];

export function SolarPageShell({
  active,
  children,
}: {
  active: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <PageHeader
          eyebrow={
            <>
              <Badge>ประเมินโซลาร์เซลล์</Badge>
              <Badge className="ml-2" variant="warning">
                ข้อมูลเพื่อประกอบการตัดสินใจ
              </Badge>
            </>
          }
          title="จำลองการติดตั้งโซลาร์เซลล์บนหลังคา"
          description="ประเมินสัดส่วนไฟ Solar ที่ใช้เอง ระยะเวลาคืนทุน ขนาดระบบที่เหมาะสม และความไวของผลลัพธ์ โดยไม่ใช่ใบเสนอราคาหรือการรับประกันผลประหยัด"
        />
        <div className="mt-5 rounded-2xl border border-border/80 bg-card/70 p-4 shadow-panel md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                ขั้นตอนการประเมิน Solar
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                ตรวจข้อมูลและสมมติฐานก่อนเริ่มประเมิน
                ระบบจะยังไม่แสดงผลลัพธ์จนกว่าคุณจะสั่งคำนวณ
              </p>
            </div>
            <nav
              aria-label="ขั้นตอนการประเมิน Solar"
              className="flex flex-wrap gap-2"
            >
              {tabs.map((tab) => (
                <a
                  key={tab.href}
                  href={tab.href}
                  aria-current={active === tab.key ? "step" : undefined}
                  className={`inline-flex h-9 items-center rounded-full border px-3 text-sm font-medium transition ${
                    active === tab.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
        <div className="mt-6 grid gap-6">{children}</div>
      </section>
    </main>
  );
}

export function SolarControls({
  settings,
  action,
  preferInitialSettings = false,
  savedBillContext,
  submitLabel = "คำนวณผลใหม่",
  showSizingLink = true,
}: {
  settings: SolarAssumptionSettings;
  action: string;
  preferInitialSettings?: boolean;
  savedBillContext?: SavedBillContext | undefined;
  submitLabel?: string;
  showSizingLink?: boolean;
}) {
  const [formSettings, setFormSettings] = useState(settings);
  const [settingsSource, setSettingsSource] = useState<
    "system" | "stored" | "explicit"
  >(preferInitialSettings ? "explicit" : "system");
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (preferInitialSettings) {
      setFormSettings(settings);
      setSettingsSource("explicit");
      setIsHydrated(true);
      return;
    }
    const stored = readStoredSolarAssumptions(window.localStorage);
    setFormSettings(stored ?? settings);
    setSettingsSource(stored ? "stored" : "system");
    setIsHydrated(true);
  }, [preferInitialSettings, settings]);

  function submitAssumptions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = Object.fromEntries(
      Array.from(formData.entries()).flatMap(([key, value]) =>
        typeof value === "string" ? [[key, value]] : [],
      ),
    );
    const nextSettings = getSolarAssumptionDraft(params).settings;
    if (!persistSolarAssumptions(window.localStorage, nextSettings)) {
      setStorageError(
        "บันทึกสมมติฐานในอุปกรณ์นี้ไม่ได้ กรุณาตรวจพื้นที่จัดเก็บหรือการตั้งค่าความเป็นส่วนตัวแล้วลองใหม่",
      );
      return;
    }
    const destination = new URL(action, window.location.origin);
    if (formData.get("source") === "bills") {
      destination.searchParams.set("source", "bills");
      const audience = formData.get("audience");
      if (typeof audience === "string" && audience)
        destination.searchParams.set("audience", audience);
    }
    window.location.assign(`${destination.pathname}${destination.search}`);
  }

  function restoreSystemDefaults() {
    clearStoredSolarAssumptions(window.localStorage);
    setFormSettings(getSolarAssumptionDraft({}).settings);
    setSettingsSource("system");
    setStorageError(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings aria-hidden="true" className="h-5 w-5 text-primary" />
          ข้อมูลสำหรับจำลอง
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-md border border-warning bg-warning/10 p-3 text-sm leading-6 text-warning-foreground">
          {solarReadinessCopy.globalDisclaimer}
        </div>
        <div className="mb-4 rounded-md border border-information/40 bg-information/10 p-3 text-sm leading-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="information">ค่าเริ่มต้นของระบบ</Badge>
            <span className="font-medium">
              สมมติฐาน Solar แยกจากข้อมูลการใช้ไฟของคุณ
            </span>
          </div>
          <p className="mt-1 text-muted-foreground">
            ค่าเหล่านี้แยกจาก Load Profile ของคุณและยังไม่ใช่ผลการประเมิน
            กรุณาตรวจสอบก่อนกลับไปกดเริ่มคำนวณ
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge
              variant={settingsSource === "system" ? "information" : "success"}
            >
              {settingsSource === "system"
                ? "กำลังใช้ค่าแนะนำของระบบ"
                : settingsSource === "stored"
                  ? "ผู้ใช้แก้ไขและบันทึกในอุปกรณ์นี้แล้ว"
                  : "ค่าจากลิงก์ที่เปิด — ยังไม่ได้บันทึก"}
            </Badge>
            <Button
              type="button"
              variant="outline"
              onClick={restoreSystemDefaults}
            >
              คืนค่าแนะนำของระบบ
            </Button>
          </div>
        </div>
        {storageError ? (
          <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {storageError}
          </div>
        ) : null}
        {formSettings.validationMessages.length > 0 ? (
          <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-3 text-sm leading-6 text-destructive">
            {formSettings.validationMessages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        ) : null}
        <form
          key={solarSettingsFingerprint(formSettings)}
          onSubmit={submitAssumptions}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <SavedBillHiddenInputs context={savedBillContext} />
          <Field label="ลักษณะสถานที่ (ใช้กำหนดค่าเริ่มต้น)">
            <select
              name="profile"
              defaultValue={formSettings.profile}
              className={inputClassName}
            >
              {solarProfileOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="รูปแบบมิเตอร์ฐาน">
            <select
              name="baseline"
              defaultValue={formSettings.baseline}
              className={inputClassName}
            >
              <option value="normal">Normal</option>
              <option value="tou">TOU</option>
            </select>
          </Field>
          <Field label="Model detail">
            <select
              name="modelMode"
              defaultValue={formSettings.modelMode}
              className={inputClassName}
            >
              <option value="easy">แบบประเมินเบื้องต้น</option>
              <option value="advanced">สมมติฐานขั้นสูง</option>
              <option value="xhigh">ตรวจสอบรายละเอียด</option>
            </select>
          </Field>
          <SolarLocationFields
            province={formSettings.province}
            latitude={formSettings.latitude}
            longitude={formSettings.longitude}
          />
          <Field label="Solar size (kWp)">
            <input
              name="systemSizeKwp"
              type="number"
              min="0.1"
              step="0.1"
              defaultValue={formSettings.systemSizeKwp}
              className={inputClassName}
            />
          </Field>
          <Field label="พื้นที่หลังคา (ตร.ม.)">
            <input
              name="roofAreaSqm"
              type="number"
              min="0"
              step="1"
              defaultValue={formSettings.roofAreaSqm}
              className={inputClassName}
            />
          </Field>
          <Field label="ทิศหลังคา (องศา)">
            <input
              name="roofAzimuth"
              type="number"
              min="0"
              max="360"
              step="1"
              defaultValue={formSettings.roofAzimuth}
              className={inputClassName}
            />
          </Field>
          <Field label="ความเอียงหลังคา (องศา)">
            <input
              name="roofTilt"
              type="number"
              min="0"
              max="60"
              step="1"
              defaultValue={formSettings.roofTilt}
              className={inputClassName}
            />
          </Field>
          <Field label="System loss (%)">
            <input
              name="systemLossPercent"
              type="number"
              min="0"
              max="100"
              step="0.1"
              defaultValue={formSettings.systemLossPercent}
              className={inputClassName}
            />
          </Field>
          <Field label="Shading loss (%)">
            <input
              name="shadingLossPercent"
              type="number"
              min="0"
              max="100"
              step="0.1"
              defaultValue={formSettings.shadingLossPercent}
              className={inputClassName}
            />
          </Field>
          <Field label="การเสื่อมประสิทธิภาพ (%/ปี)">
            <input
              name="degradationPercentPerYear"
              type="number"
              min="0"
              max="100"
              step="0.1"
              defaultValue={formSettings.degradationPercentPerYear}
              className={inputClassName}
            />
          </Field>
          <Field label="เงินลงทุนเริ่มต้น (บาท)">
            <input
              name="capexThb"
              type="number"
              min="0"
              step="1000"
              defaultValue={formSettings.capexThb}
              className={inputClassName}
            />
          </Field>
          <Field label="ค่าดูแลรักษา (บาท/ปี)">
            <input
              name="oAndMCostPerYear"
              type="number"
              min="0"
              step="100"
              defaultValue={formSettings.oAndMCostPerYear}
              className={inputClassName}
            />
          </Field>
          <Field label="อายุโครงการ (ปี)">
            <input
              name="projectLifeYears"
              type="number"
              min="1"
              step="1"
              defaultValue={formSettings.projectLifeYears}
              className={inputClassName}
            />
          </Field>
          <Field label="Discount rate (%)">
            <input
              name="discountRatePercent"
              type="number"
              min="0"
              step="0.1"
              defaultValue={formSettings.discountRatePercent}
              className={inputClassName}
            />
          </Field>
          <Field label="Electricity escalation (%)">
            <input
              name="electricityEscalationRatePercent"
              type="number"
              min="0"
              step="0.1"
              defaultValue={formSettings.electricityEscalationRatePercent}
              className={inputClassName}
            />
          </Field>
          <Field label="ค่าเปลี่ยนอินเวอร์เตอร์ (บาท)">
            <input
              name="inverterReplacementCostThb"
              type="number"
              min="0"
              step="100"
              defaultValue={formSettings.inverterReplacementCostThb}
              className={inputClassName}
            />
          </Field>
          <Field label="Inverter year (0 = none)">
            <input
              name="inverterReplacementYear"
              type="number"
              min="0"
              step="1"
              defaultValue={formSettings.inverterReplacementYear}
              className={inputClassName}
            />
          </Field>
          <Field label="เปิดรับไฟฟ้าที่ส่งกลับเข้าสู่ระบบ">
            <select
              name="exportEnabled"
              defaultValue={String(formSettings.exportEnabled)}
              className={inputClassName}
            >
              <option value="true">เปิดใช้</option>
              <option value="false">ไม่เปิดใช้</option>
            </select>
          </Field>
          <Field label="อัตรารับซื้อไฟฟ้า (บาท/kWh)">
            <input
              name="exportRateThbPerKwh"
              type="number"
              min="0"
              step="0.01"
              defaultValue={formSettings.exportRateThbPerKwh}
              className={inputClassName}
            />
          </Field>
          <Field label="กำลังส่งกลับสูงสุด (kW)">
            <input
              name="exportLimitKw"
              type="number"
              min="0"
              step="0.1"
              defaultValue={formSettings.exportLimitKw}
              className={inputClassName}
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={!isHydrated}>
              {submitLabel}
            </Button>
          </div>
          {showSizingLink ? (
            <div className="flex items-end">
              <a
                href={withSavedBillContext("/analysis/solar", savedBillContext)}
                className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
              >
                กลับไปตรวจข้อมูลและคำนวณ
              </a>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function SavedBillHiddenInputs({
  context,
}: {
  context?: SavedBillContext | undefined;
}) {
  if (context?.source !== "bills") return null;
  return (
    <>
      <input name="source" type="hidden" value="bills" />
      {context.audience ? (
        <input name="audience" type="hidden" value={context.audience} />
      ) : null}
    </>
  );
}

function withSavedBillContext(
  path: string,
  context?: SavedBillContext | undefined,
) {
  if (context?.source !== "bills") return path;

  const params = new URLSearchParams();
  params.set("source", "bills");
  if (context.audience) params.set("audience", context.audience);
  return `${path}?${params.toString()}`;
}

export function SolarSummary({ analysis }: { analysis: SolarAnalysisResult }) {
  const comparison = analysis.billComparison;
  const recommended = analysis.sizing.recommended;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
      <Metric
        label="รูปแบบค่าไฟที่เหมาะหลังติด Solar"
        value={comparison.bestWithSolar.label}
      />
      <Metric
        helpText={solarReadinessCopy.estimatedSavingsHint}
        label="ผลประโยชน์รวมโดยประมาณ/ปี"
        value={`${formatApproximateMoneyRange(comparison.netAnnualBenefit)}/ปี`}
      />
      <Metric
        label="สัดส่วนไฟ Solar ที่ใช้ภายในสถานที่"
        value={formatPercent(analysis.selfConsumption.selfConsumptionRatio)}
      />
      <Metric
        label="ขนาดที่ผ่านเกณฑ์"
        value={
          recommended
            ? `${formatNumber(recommended.systemSizeKwp)} kWp`
            : "ยังไม่มี"
        }
      />
      <Metric
        label="ระยะเวลาคืนทุน"
        value={
          analysis.financial.simplePaybackYears
            ? `${analysis.financial.simplePaybackYears} ปี`
            : "-"
        }
      />
      <Metric
        label="NPV"
        value={`${formatNumber(analysis.financial.npvThb)} บาท`}
      />
      <Metric
        label="IRR"
        value={
          analysis.financial.irrPercent === null
            ? "-"
            : `${formatNumber(analysis.financial.irrPercent)}%`
        }
      />
    </div>
  );
}

export function SolarDecisionSummary({
  analysis,
}: {
  analysis: SolarAnalysisResult;
}) {
  const recommended = analysis.sizing.recommended;
  const recommendation = analysis.recommendations[0];
  const decision =
    recommendation?.title ??
    (recommended
      ? `Solar มีแนวโน้มเหมาะที่ขนาด ${formatNumber(recommended.systemSizeKwp)} kWp`
      : "ยังไม่แนะนำติดตั้ง Solar ตามข้อมูลปัจจุบัน");
  const reason =
    recommendation?.explanation ??
    (recommended
      ? "ขนาดนี้ผ่านเกณฑ์ความคุ้มค่าของแบบจำลองภายใต้สมมติฐานปัจจุบัน"
      : "ยังไม่มีขนาดระบบที่ผ่านเกณฑ์ความคุ้มค่าของแบบจำลอง");
  const firstRisk = analysis.modelQuality.risks[0];
  return (
    <DecisionStory
      eyebrow="คำแนะนำ Solar หลัก"
      title={decision}
      reason={reason}
      evidence={[
        {
          label: "ผลประโยชน์รวมโดยประมาณ",
          value: `${formatApproximateMoneyRange(analysis.billComparison.netAnnualBenefit)}/ปี`,
        },
        {
          label: "ระยะเวลาคืนทุน",
          value: analysis.financial.simplePaybackYears
            ? `${analysis.financial.simplePaybackYears} ปี`
            : "ยังประเมินไม่ได้",
        },
        {
          label: "ขนาดที่ผ่านเกณฑ์",
          value: recommended
            ? `${formatNumber(recommended.systemSizeKwp)} kWp`
            : "ไม่มี",
        },
      ]}
      limitations={
        firstRisk
          ? [`${firstRisk.title}: ${firstRisk.explanation}`]
          : [
              "ผลนี้เป็นแบบจำลองเบื้องต้น ควรตรวจสอบหน้างานและใบเสนอราคาจริงก่อนลงทุน",
            ]
      }
      nextAction={
        recommendation?.nextAction ??
        "ตรวจสอบพื้นที่ติดตั้งและข้อมูลการใช้ไฟกลางวันก่อนขอใบเสนอราคา"
      }
      confidence={`ความมั่นใจ ${analysis.modelQuality.label} · ${analysis.modelQuality.score}/100`}
      tone={analysis.modelQuality.score >= 70 ? "positive" : "caution"}
    />
  );
}

export function ModelQualityPanel({
  analysis,
}: {
  analysis: SolarAnalysisResult;
}) {
  const quality = analysis.modelQuality;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="h-5 w-5 text-primary" />
          ความน่าเชื่อถือของโมเดลและความเสี่ยง
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="ระดับความมั่นใจ" value={quality.label} />
          <Metric label="คะแนนความมั่นใจ" value={`${quality.score}/100`} />
          <Metric
            label="ระดับรายละเอียด"
            value={quality.detailLevel.toUpperCase()}
          />
          <Metric
            label="จำนวนความเสี่ยงที่พบ"
            value={String(quality.risks.length)}
          />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {quality.risks.map((risk) => (
            <div
              key={risk.code}
              className="rounded-md border border-border p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <AlertTriangle
                  aria-hidden="true"
                  className="h-4 w-4 text-warning"
                />
                <Badge
                  variant={
                    risk.severity === "critical" || risk.severity === "warning"
                      ? "warning"
                      : "outline"
                  }
                >
                  {risk.severity}
                </Badge>
              </div>
              <h3 className="mt-2 font-semibold">{risk.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {risk.explanation}
              </p>
              <p className="mt-2 text-sm font-medium">{risk.mitigation}</p>
            </div>
          ))}
        </div>
        {quality.risks.length === 0 ? (
          <EmptyState
            title="ไม่พบความเสี่ยงสำคัญจากแบบจำลอง"
            text="ยังควรตรวจสอบข้อมูลหน้างานและแหล่งข้อมูลทางการก่อนลงทุนจริง"
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SolarChartsSection({
  analysis,
}: {
  analysis: SolarAnalysisResult;
}) {
  if (analysis.selfConsumption.intervalResults.length === 0) {
    return (
      <EmptyState
        title="ยังไม่มีข้อมูลรายช่วงเวลา"
        text="นำเข้าข้อมูลการใช้ไฟและข้อมูล Solar ก่อนแสดงกราฟ"
      />
    );
  }

  return (
    <SolarAnalysisChartPanel
      intervals={analysis.selfConsumption.intervalResults
        .slice(0, 48)
        .map((row) => ({
          label: formatBangkokHour(row.timestamp),
          loadKwh: row.loadKwh,
          solarKwh: row.solarKwh,
          gridImportKwh: row.gridImportKwh,
          gridExportKwh: row.gridExportKwh,
        }))}
      monthlyGeneration={analysis.solarProfile.monthlyGenerationKwh.map(
        (row) => ({
          month: row.month,
          generationKwh: row.generationKwh,
        }),
      )}
      selfConsumption={[
        { name: "Self-used", kwh: analysis.selfConsumption.selfConsumedKwh },
        { name: "Exported", kwh: analysis.selfConsumption.gridExportKwh },
      ]}
      cashFlows={analysis.financial.cashFlows.map((row) => ({
        year: row.year,
        netCashFlowThb: row.netCashFlowThb,
        cumulativeCashFlowThb: row.cumulativeCashFlowThb,
      }))}
      sizing={analysis.sizing.options.map((row) => ({
        systemSizeKwp: row.systemSizeKwp,
        npvThb: row.npvThb,
        paybackYears: row.simplePaybackYears,
        annualNetBenefitThb: row.annualNetBenefitThb,
      }))}
    />
  );
}

export function BillComparisonTable({
  analysis,
}: {
  analysis: SolarAnalysisResult;
}) {
  const rows = [
    analysis.billComparison.normalWithoutSolar,
    analysis.billComparison.touWithoutSolar,
    analysis.billComparison.normalWithSolar,
    analysis.billComparison.touWithSolar,
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator aria-hidden="true" className="h-5 w-5 text-primary" />
          เปรียบเทียบค่าไฟ
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <Th>ทางเลือก</Th>
              <Th>ค่าไฟ/เดือน</Th>
              <Th>ค่าไฟ/ปี</Th>
              <Th>ไฟฟ้าจากโครงข่าย (kWh/ปี)</Th>
              <Th>ไฟฟ้าที่ส่งกลับเข้าสู่ระบบ (kWh/ปี)</Th>
              <Th>ประหยัดค่าไฟ/ปี</Th>
              <Th>รายได้จากไฟฟ้าที่ส่งกลับ (บาท/ปี)</Th>
              <Th>สุทธิ/เดือน</Th>
              <Th>สถานะอัตราค่าไฟ</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <Td strong>{row.label}</Td>
                <Td>{formatNumber(row.monthlyBillThb)}</Td>
                <Td>{formatNumber(row.annualBillThb)}</Td>
                <Td>{formatNumber(row.annualGridImportKwh)}</Td>
                <Td>{formatNumber(row.annualGridExportKwh)}</Td>
                <Td>{formatSigned(row.annualBillSavingsThb)}</Td>
                <Td>{formatNumber(row.annualExportRevenueThb)}</Td>
                <Td>{formatNumber(row.netMonthlyCostThb)}</Td>
                <Td>{row.bill.tariffStatus}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function SizingTable({ analysis }: { analysis: SolarAnalysisResult }) {
  const recommended = analysis.sizing.recommended;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 aria-hidden="true" className="h-5 w-5 text-primary" />
          เปรียบเทียบขนาดระบบ Solar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 md:grid-cols-5">
          <Metric
            label="ขนาดที่ผ่านเกณฑ์"
            value={
              recommended
                ? `${formatSizing(recommended.systemSizeKwp)} · NPV ${formatNumber(recommended.npvThb)}`
                : "ไม่มีขนาดที่ผ่านเกณฑ์"
            }
          />
          <Metric
            label="ขนาดที่คืนทุนเร็วที่สุด"
            value={formatSizing(analysis.sizing.fastestPayback?.systemSizeKwp)}
          />
          <Metric
            label="Highest NPV"
            value={formatSizing(analysis.sizing.highestNpv?.systemSizeKwp)}
          />
          <Metric
            label="Highest benefit"
            value={formatSizing(
              analysis.sizing.highestAnnualSavings?.systemSizeKwp,
            )}
          />
          <Metric
            label="Best self-use"
            value={formatSizing(
              analysis.sizing.bestSelfConsumption?.systemSizeKwp,
            )}
          />
        </div>
        {analysis.sizing.options.length === 0 ? (
          <EmptyState
            title="ยังไม่มีขนาดระบบที่ประเมินได้"
            text="ตรวจสอบพื้นที่หลังคา กำลังส่งกลับสูงสุด และช่วงขนาดระบบที่ตั้งไว้"
          />
        ) : null}
        <Table>
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <Th>kWp</Th>
              <Th>
                <span className="inline-flex items-center gap-1">
                  ผลิตไฟต่อปี
                  <HelpIcon text={solarReadinessCopy.yieldHint} />
                </span>
              </Th>
              <Th>ใช้เองต่อปี</Th>
              <Th>ไฟฟ้าที่ส่งกลับ/ปี</Th>
              <Th>Self-use</Th>
              <Th>ผลประหยัดต่อปี</Th>
              <Th>ระยะเวลาคืนทุน</Th>
              <Th>NPV</Th>
              <Th>IRR</Th>
            </tr>
          </thead>
          <tbody>
            {analysis.sizing.options.map((row) => (
              <tr
                key={row.systemSizeKwp}
                className={`border-t border-border ${recommended?.systemSizeKwp === row.systemSizeKwp ? "bg-success/10" : ""}`}
              >
                <Td strong>{row.systemSizeKwp}</Td>
                <Td>{formatNumber(row.annualGenerationKwh)}</Td>
                <Td>{formatNumber(row.annualSelfConsumedKwh)}</Td>
                <Td>{formatNumber(row.annualExportedKwh)}</Td>
                <Td>{formatPercent(row.selfConsumptionRatio)}</Td>
                <Td>{formatNumber(row.annualNetBenefitThb)}</Td>
                <Td>{row.simplePaybackYears ?? "-"}</Td>
                <Td>{formatNumber(row.npvThb)}</Td>
                <Td>
                  {row.irrPercent === null
                    ? "-"
                    : `${formatNumber(row.irrPercent)}%`}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function FinancialTable({
  analysis,
}: {
  analysis: SolarAnalysisResult;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleDollarSign
            aria-hidden="true"
            className="h-5 w-5 text-primary"
          />
          ผลการประเมินทางการเงิน
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric
            label="Initial investment"
            value={`${formatNumber(analysis.financial.initialInvestmentThb)} บาท`}
          />
          <Metric
            label="ระยะเวลาคืนทุนคิดลด"
            value={
              analysis.financial.discountedPaybackYears
                ? `${analysis.financial.discountedPaybackYears} ปี`
                : "-"
            }
          />
          <Metric
            label="ROI"
            value={`${formatNumber(analysis.financial.roiPercent)}%`}
          />
          <Metric
            label="IRR"
            value={
              analysis.financial.irrPercent === null
                ? "-"
                : `${formatNumber(analysis.financial.irrPercent)}%`
            }
          />
        </div>
        <Table>
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <Th>Year</Th>
              <Th>ประหยัดค่าไฟ</Th>
              <Th>รายได้จากไฟฟ้าที่ส่งกลับ</Th>
              <Th>O&M</Th>
              <Th>Inverter</Th>
              <Th>กระแสเงินสดสุทธิ</Th>
              <Th>สะสม</Th>
              <Th>สะสมคิดลด</Th>
            </tr>
          </thead>
          <tbody>
            {analysis.financial.cashFlows.map((row) => (
              <tr key={row.year} className="border-t border-border">
                <Td strong>{row.year}</Td>
                <Td>{formatNumber(row.billSavingsThb)}</Td>
                <Td>{formatNumber(row.exportRevenueThb)}</Td>
                <Td>{formatNumber(row.oAndMCostThb)}</Td>
                <Td>{formatNumber(row.replacementCostThb)}</Td>
                <Td>{formatSigned(row.netCashFlowThb)}</Td>
                <Td>{formatSigned(row.cumulativeCashFlowThb)}</Td>
                <Td>{formatSigned(row.cumulativeDiscountedCashFlowThb)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function SensitivityTable({
  analysis,
}: {
  analysis: SolarAnalysisResult;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BadgeCheck aria-hidden="true" className="h-5 w-5 text-primary" />
          Sensitivity analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric
            label="Base NPV"
            value={`${formatNumber(analysis.sensitivity.baseNpvThb)} บาท`}
          />
          <Metric
            label="Most impactful"
            value={analysis.sensitivity.mostImpactfulVariable ?? "-"}
          />
          <Metric
            label="Break-even CAPEX"
            value={
              analysis.sensitivity.breakEvenCapexThb === null
                ? "-"
                : `${formatNumber(analysis.sensitivity.breakEvenCapexThb)} บาท`
            }
          />
          <Metric
            label="NPV range"
            value={`${formatNumber(analysis.sensitivity.npvRangeThb.low)} to ${formatNumber(analysis.sensitivity.npvRangeThb.high)}`}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <StressCase
            title="Downside case"
            caseResult={analysis.sensitivity.downsideCase}
          />
          <StressCase
            title="Upside case"
            caseResult={analysis.sensitivity.upsideCase}
          />
        </div>
        <Table>
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <Th>Variable</Th>
              <Th>Case</Th>
              <Th>Value</Th>
              <Th>NPV</Th>
              <Th>Impact</Th>
              <Th>ระยะเวลาคืนทุน</Th>
              <Th>ROI</Th>
            </tr>
          </thead>
          <tbody>
            {analysis.sensitivity.cases.map((row) => (
              <tr
                key={`${row.variable}-${row.label}`}
                className="border-t border-border"
              >
                <Td strong>{row.variable}</Td>
                <Td>{row.label}</Td>
                <Td>{row.value}</Td>
                <Td>{formatNumber(row.npvThb)}</Td>
                <Td>{formatSigned(row.impactOnNpvThb)}</Td>
                <Td>{row.simplePaybackYears ?? "-"}</Td>
                <Td>{formatNumber(row.roiPercent)}%</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function RecommendationCards({
  analysis,
}: {
  analysis: SolarAnalysisResult;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SunMedium aria-hidden="true" className="h-5 w-5 text-primary" />
          คำแนะนำ
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {analysis.recommendations.length === 0 ? (
          <EmptyState
            title="ยังไม่มีคำแนะนำ"
            text="เริ่มคำนวณเพื่อสร้างคำแนะนำจากข้อมูลของคุณ"
          />
        ) : null}
        {analysis.recommendations.map((recommendation) => (
          <div
            key={`${recommendation.type}-${recommendation.title}`}
            className="rounded-md border border-border p-4"
          >
            <div className="flex flex-wrap gap-2">
              <Badge>{recommendation.type}</Badge>
              <Badge
                variant={
                  recommendation.confidence === "high" ? "default" : "outline"
                }
              >
                {recommendation.confidence}
              </Badge>
            </div>
            <h3 className="mt-3 font-semibold">{recommendation.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {recommendation.explanation}
            </p>
            <p className="mt-2 text-sm font-medium">
              {recommendation.nextAction}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ConfigDetails({ analysis }: { analysis: SolarAnalysisResult }) {
  const assumptions = analysis.solarProfile.assumptionsSnapshot;
  const financial = analysis.financial.assumptionsSnapshot;
  const exportPolicy = analysis.billComparison.exportPolicy;
  const rows = [
    ["Solar size", `${assumptions.systemSizeKwp} kWp`],
    ["Province / area", assumptions.province],
    ["พื้นที่หลังคา", `${assumptions.roofAreaSqm ?? "-"} ตร.ม.`],
    ["ทิศหลังคา", `${assumptions.roofAzimuth ?? "-"} องศา`],
    ["ความเอียงหลังคา", `${assumptions.roofTilt ?? "-"} องศา`],
    ["System loss", `${assumptions.systemLossPercent}%`],
    ["Shading loss", `${assumptions.shadingLossPercent}%`],
    ["การเสื่อมประสิทธิภาพ", `${assumptions.degradationPercentPerYear}%/ปี`],
    ["Yield data status", assumptions.yieldSource.status],
    [
      "Yield source",
      assumptions.yieldSource.sourceUrl ?? assumptions.yieldSource.notes,
    ],
    ["สถานะการรับไฟฟ้าที่ส่งกลับ", exportPolicy.status],
    ["อัตรารับซื้อไฟฟ้า", `${exportPolicy.exportRateThbPerKwh} บาท/kWh`],
    ["กำลังส่งกลับสูงสุด", `${exportPolicy.exportLimitKw ?? "-"} kW`],
    ["แหล่งอ้างอิงอัตรารับซื้อ", exportPolicy.sourceUrl ?? exportPolicy.notes],
    ["อายุโครงการ", `${financial.projectLifeYears} ปี`],
    ["อัตราคิดลด", `${financial.discountRatePercent}%`],
    [
      "Electricity escalation",
      `${financial.electricityEscalationRatePercent}%/ปี`,
    ],
    ["เงินลงทุน", `${formatNumber(financial.capexThb)} บาท`],
    ["ค่าดูแลรักษา", `${formatNumber(financial.oAndMCostPerYear)} บาท/ปี`],
    [
      "Inverter replacement",
      `${formatNumber(financial.inverterReplacementCostThb)} บาท ในปีที่ ${financial.inverterReplacementYear ?? "-"}`,
    ],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>สมมติฐานและแหล่งข้อมูล</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <tbody>
            {rows.map(([label, value]) => (
              <tr
                key={label}
                className="border-t border-border first:border-t-0"
              >
                <td className="w-64 bg-muted px-3 py-2 font-medium text-muted-foreground">
                  {label}
                </td>
                <td className="px-3 py-2">{value}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  );
}

function StressCase({
  title,
  caseResult,
}: {
  title: string;
  caseResult: SolarAnalysisResult["sensitivity"]["downsideCase"];
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {caseResult.label}
      </p>
      <div className="mt-3 grid gap-2 text-sm">
        <InfoRow label="NPV" value={`${formatNumber(caseResult.npvThb)} บาท`} />
        <InfoRow
          label="ระยะเวลาคืนทุน"
          value={
            caseResult.simplePaybackYears === null
              ? "-"
              : `${caseResult.simplePaybackYears} ปี`
          }
        />
        <InfoRow
          label="IRR"
          value={
            caseResult.irrPercent === null
              ? "-"
              : `${formatNumber(caseResult.irrPercent)}%`
          }
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Metric({
  helpText,
  label,
  value,
}: {
  helpText?: string | undefined;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {label}
        {helpText ? <HelpIcon text={helpText} /> : null}
      </p>
      <p className="mt-2 text-lg font-semibold tracking-normal">{value}</p>
    </div>
  );
}

function HelpIcon({ text }: { text: string }) {
  return (
    <span className="inline-flex" title={text}>
      <Info aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="sr-only">{text}</span>
    </span>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/40 p-4 text-sm">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-muted-foreground">{text}</p>
    </div>
  );
}

function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[900px] border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-3 py-2">{children}</th>;
}

function Td({
  children,
  strong,
}: {
  children: ReactNode;
  strong?: boolean | undefined;
}) {
  return (
    <td className={`px-3 py-2 ${strong ? "font-medium" : ""}`}>{children}</td>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

const inputClassName =
  "h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring";

function formatSizing(value: number | undefined) {
  return value === undefined ? "-" : `${value} kWp`;
}

function formatPercent(value: number) {
  return `${formatNumber(value * 100)}%`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${formatNumber(value)}`;
}

function formatBangkokHour(timestamp: string) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestamp));
}
