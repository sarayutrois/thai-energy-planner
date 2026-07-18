"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BatteryCharging,
  CarFront,
  CheckCircle2,
  CircleDollarSign,
  Layers3,
  RefreshCw,
  SunMedium,
  Zap,
} from "lucide-react";
import { LocalBillResultContext } from "@/components/local-bill-result-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  batteryMvpStorageKey,
  ecosystemMvpStorageKey,
  evMvpStorageKey,
} from "@/lib/analysis-storage";
import type { BatteryMvpDecision } from "@/lib/battery-mvp";
import {
  buildEcosystemPlan,
  type EcosystemModuleInput,
  type EcosystemPlan,
  type EcosystemScenarioSummary,
  type EcosystemSolarSummary,
} from "@/lib/ecosystem-mvp";
import type { EvMvpDecision } from "@/lib/ev-mvp";
import type { SolarAnalysisResult } from "@thai-energy-planner/calculation-engine";
import {
  isLocalAnalysisReportCurrent,
  readLocalAnalysisReports,
} from "@/lib/local-analysis-report";
import { readLocalBillReportSnapshot } from "@/lib/local-bill-report";
import { readLocalLoadProfileSnapshot } from "@/lib/local-load-profile";
import type {
  LocalAnalysisReportDraft,
  LocalAnalysisReportRow,
} from "@/lib/local-analysis-snapshot";
import {
  getSolarBenefitBreakdown,
  readStoredSolarAnalysis,
  readStoredSolarAssumptions,
  solarSettingsFingerprint,
} from "@/lib/local-solar-analysis";

type EcosystemViewState = {
  plan: EcosystemPlan;
  billMonthCount: number;
  hasBills: boolean;
  modules: Array<{
    key: "scenario" | "solar" | "battery" | "ev";
    label: string;
    status: "ready" | "missing" | "stale";
    href: string;
  }>;
};

const moduleMeta = {
  scenario: { label: "ค่าไฟ / TOU", href: "/analysis/scenarios", icon: Zap },
  solar: { label: "Solar", href: "/analysis/solar", icon: SunMedium },
  ev: { label: "EV", href: "/analysis/ev", icon: CarFront },
  battery: {
    label: "Battery",
    href: "/analysis/battery",
    icon: BatteryCharging,
  },
} as const;

export function EcosystemRuntimePanel() {
  const [state, setState] = useState<EcosystemViewState | null>(null);

  useEffect(() => {
    const next = readEcosystemViewState();
    setState(next);
    try {
      window.localStorage.setItem(
        ecosystemMvpStorageKey,
        JSON.stringify({
          schemaVersion: 1,
          updatedAt: new Date().toISOString(),
          plan: next.plan,
        }),
      );
    } catch {
      // The page remains usable when storage is unavailable.
    }
  }, []);

  const reportDraft = useMemo(
    () => (state ? buildEcosystemReportDraft(state.plan) : undefined),
    [state],
  );

  if (!state) {
    return (
      <Card className="mt-6 border-dashed">
        <CardContent className="flex items-center gap-3 pt-6 text-sm text-muted-foreground">
          <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" />
          กำลังรวบรวมผลวิเคราะห์ในอุปกรณ์นี้...
        </CardContent>
      </Card>
    );
  }

  const { plan } = state;
  const nextRequiredModule = state.modules.find(
    (item) =>
      (item.key === "scenario" || item.key === "solar") &&
      item.status !== "ready",
  );
  const primaryNextAction = nextRequiredModule
    ? {
        href: nextRequiredModule.href,
        label:
          nextRequiredModule.status === "stale"
            ? `อัปเดตผล ${nextRequiredModule.label}`
            : `วิเคราะห์ ${nextRequiredModule.label}`,
        description: "ทำขั้นหลักนี้ให้ครบเพื่อให้คำแนะนำและตัวเลขรวมแม่นยำขึ้น",
      }
    : state.hasBills
      ? {
          href: "#save-analysis-report",
          label: "บันทึกแผนเป็นรายงาน",
          description:
            "ผลหลักพร้อมแล้ว ส่วน Battery และ EV เป็นทางเลือกเสริมที่เพิ่มภายหลังได้",
        }
      : {
          href: "/analysis/load-data/bills",
          label: "เพิ่มบิลเพื่อบันทึกรายงาน",
          description:
            "ผลหลักพร้อมแล้ว เหลือเพิ่มค่าไฟจริงเพื่อใส่บริบททางการเงินในรายงาน",
        };
  return (
    <div className="mt-6 grid min-w-0 gap-6">
      <Card className="energy-panel-success overflow-hidden border-2 border-primary/35 shadow-float">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <Badge variant={plan.verdict === "ready" ? "success" : "warning"}>
                {plan.verdictLabel}
              </Badge>
              <CardTitle className="mt-3 max-w-3xl text-2xl leading-tight md:text-3xl">
                {plan.headline}
              </CardTitle>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                พร้อมแล้ว {plan.readyModuleCount}/{plan.totalModuleCount} โมดูล
                · ความมั่นใจ {plan.confidenceLabel}
              </p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Layers3 aria-hidden="true" className="h-7 w-7" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HeadlineMetric
            label="ค่าไฟปัจจุบัน"
            value={formatMoneyPerMonth(plan.currentMonthlyBillThb)}
          />
          <HeadlineMetric
            label="ค่าไฟหลังแผน (ประมาณการ)"
            value={formatMoneyPerMonth(plan.projectedMonthlyEnergyCostThb)}
          />
          <HeadlineMetric
            label="งบที่ทราบ"
            value={formatBudget(
              plan.knownBudgetLowThb,
              plan.knownBudgetHighThb,
            )}
          />
          <HeadlineMetric
            label="คืนทุน Solar/แผนฐาน"
            value={formatPayback(plan.blendedSimplePaybackYears)}
          />
          <div className="col-span-full mt-2 flex flex-col gap-3 rounded-xl border border-primary/25 bg-background/80 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                ขั้นต่อไปที่แนะนำ
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {primaryNextAction.description}
              </p>
            </div>
            <Link
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
              href={primaryNextAction.href}
            >
              {primaryNextAction.label}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="ecosystem-readiness">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold" id="ecosystem-readiness">
              ความพร้อมของคำตอบ
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ผลเก่าจะไม่ถูกนำมารวมกับ Load Profile ปัจจุบัน
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {state.modules.map((item) => {
            const meta = moduleMeta[item.key];
            const Icon = meta.icon;
            return (
              <Card
                key={item.key}
                className={
                  item.status === "ready"
                    ? "energy-panel-success border-success/35"
                    : "energy-panel-neutral border-warning/40"
                }
              >
                <CardContent className="pt-5 md:pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                      <Icon
                        aria-hidden="true"
                        className="h-5 w-5 text-primary"
                      />
                    </span>
                    <Badge
                      variant={item.status === "ready" ? "success" : "warning"}
                    >
                      {readinessLabel(item.status)}
                    </Badge>
                  </div>
                  <p className="mt-4 font-semibold">{item.label}</p>
                  <Link
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    href={item.href}
                  >
                    {item.status === "ready" ? "ดูหรือคำนวณใหม่" : "ไปเตรียมผล"}
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="ecosystem-roadmap">
        <h2 className="text-xl font-semibold" id="ecosystem-roadmap">
          Roadmap ที่ควรทำตามลำดับ
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          ลงทุนจากสิ่งที่ย้อนกลับง่ายและใช้เงินน้อย
          ไปหาสิ่งที่ต้องยืนยันหน้างานมากขึ้น
        </p>
        <div className="mt-4 grid gap-4">
          {plan.phases.map((phase) => (
            <Card key={phase.module}>
              <CardContent className="grid gap-4 pt-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:pt-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {phase.order}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{phase.title}</p>
                    <Badge
                      variant={
                        phase.status === "do_now" || phase.status === "next"
                          ? "success"
                          : phase.status === "needs_data"
                            ? "warning"
                            : "outline"
                      }
                    >
                      {phase.statusLabel}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {phase.action}
                  </p>
                </div>
                <div className="grid min-w-44 gap-1 text-sm md:text-right">
                  <span className="text-muted-foreground">
                    {formatPhaseBudget(phase.budgetLowThb, phase.budgetHighThb)}
                  </span>
                  <span
                    className={
                      phase.annualImpactThb !== null &&
                      phase.annualImpactThb < 0
                        ? "font-medium text-warning"
                        : "font-medium text-success"
                    }
                  >
                    {formatAnnualImpact(phase.annualImpactThb)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-success/35 bg-success/[0.04]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleDollarSign
                aria-hidden="true"
                className="h-5 w-5 text-success"
              />
              วิธีอ่านตัวเลขรวม
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm leading-6 text-muted-foreground">
            <p>
              เงินประหยัดฐาน: {formatAnnualMoney(plan.primaryAnnualSavingsThb)}
              {plan.savingsSourceLabel
                ? ` · จาก ${plan.savingsSourceLabel}`
                : " · ยังไม่มีผลที่พร้อม"}
            </p>
            <p>
              ค่าไฟ EV เพิ่ม: {formatAnnualMoney(plan.evAnnualAddedCostThb)} ·
              แยกจากผลประหยัดของบ้าน
            </p>
            <p className="font-medium text-foreground">
              ผลสุทธิประมาณ {formatNetChange(plan.netAnnualChangeThb)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-warning/40 bg-warning/[0.04]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle
                aria-hidden="true"
                className="h-5 w-5 text-warning"
              />
              ข้อจำกัดก่อนตัดสินใจลงทุน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 text-sm leading-6 text-muted-foreground">
              {plan.limitations.map((item) => (
                <li className="flex gap-2" key={item}>
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-1 h-4 w-4 shrink-0 text-warning"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <LocalBillResultContext
        enabled={state.hasBills}
        moduleName="Ecosystem"
        reportDraft={reportDraft}
      />
      {!state.hasBills ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">เพิ่มบิลก่อนบันทึกแผนเป็นรายงาน</p>
              <p className="mt-1 text-sm text-muted-foreground">
                ระบบต้องใช้ค่าไฟจริงเป็นบริบทของตัวเลขรวม
              </p>
            </div>
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              href="/analysis/load-data/bills"
            >
              เพิ่มบิล <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function readEcosystemViewState(): EcosystemViewState {
  const bill = readLocalBillReportSnapshot();
  const profile = readLocalLoadProfileSnapshot();
  const reports = readLocalAnalysisReports();
  const currentScenario = reports.find(
    (report) =>
      report.module === "scenario" && isLocalAnalysisReportCurrent(report),
  );
  const anyScenario = reports.some((report) => report.module === "scenario");
  const scenario: EcosystemModuleInput<EcosystemScenarioSummary> =
    currentScenario
      ? {
          status: "ready",
          value: scenarioSummary(
            currentScenario.resultRows,
            currentScenario.summary,
          ),
        }
      : { status: anyScenario ? "stale" : "missing", value: null };

  const storedSolar = readStoredSolarAnalysis(window.localStorage);
  const solarSettings = readStoredSolarAssumptions(window.localStorage);
  const solarCurrent = Boolean(
    storedSolar &&
    profile &&
    storedSolar.profileSnapshotId === profile.id &&
    solarSettings &&
    storedSolar.settingsFingerprint === solarSettingsFingerprint(solarSettings),
  );
  const solar: EcosystemModuleInput<EcosystemSolarSummary> =
    solarCurrent && storedSolar && solarSettings
      ? {
          status: "ready",
          value: solarSummary(
            storedSolar.result.analysis,
            solarSettings.backupRequirement,
          ),
        }
      : { status: storedSolar ? "stale" : "missing", value: null };

  const storedBattery =
    readStoredDecision<BatteryMvpDecision>(batteryMvpStorageKey);
  const batteryCurrent = Boolean(
    storedBattery && profile && storedBattery.profileSnapshotId === profile.id,
  );
  const battery: EcosystemModuleInput<BatteryMvpDecision> =
    batteryCurrent && storedBattery
      ? { status: "ready", value: storedBattery.decision }
      : { status: storedBattery ? "stale" : "missing", value: null };

  const storedEv = readStoredDecision<EvMvpDecision>(evMvpStorageKey);
  const evCurrent = Boolean(
    storedEv && profile && storedEv.profileSnapshotId === profile.id,
  );
  const ev: EcosystemModuleInput<EvMvpDecision> =
    evCurrent && storedEv
      ? { status: "ready", value: storedEv.decision }
      : { status: storedEv ? "stale" : "missing", value: null };

  const plan = buildEcosystemPlan({
    currentMonthlyBillThb: bill?.averageMonthlyCostThb ?? null,
    hasLoadProfile: Boolean(profile?.canonicalProfile),
    scenario,
    solar,
    battery,
    ev,
  });
  return {
    plan,
    billMonthCount: bill?.monthCount ?? 0,
    hasBills: Boolean(bill),
    modules: (["scenario", "solar", "ev", "battery"] as const).map((key) => ({
      key,
      label: moduleMeta[key].label,
      status: { scenario, solar, battery, ev }[key].status,
      href: moduleMeta[key].href,
    })),
  };
}

function scenarioSummary(
  rows: LocalAnalysisReportRow[],
  summary: string,
): EcosystemScenarioSummary {
  const candidates = rows
    .map((row) => ({
      annualSavingsThb: numeric(row.annualSavingsThb),
      monthlyBillThb: numeric(row.monthlyBillThb),
      plan: typeof row.plan === "string" ? row.plan : null,
    }))
    .filter(
      (row) => row.annualSavingsThb !== null && row.monthlyBillThb !== null,
    )
    .sort((a, b) => (b.annualSavingsThb ?? 0) - (a.annualSavingsThb ?? 0));
  const best = candidates[0];
  return {
    annualSavingsThb: best?.annualSavingsThb ?? 0,
    monthlyBillThb: best?.monthlyBillThb ?? 0,
    recommendation: best?.plan ?? summary,
  };
}

function solarSummary(
  analysis: SolarAnalysisResult,
  backupRequirement: "unknown" | "none" | "essential",
): EcosystemSolarSummary {
  const recommended = analysis.sizing.recommended;
  const benefit = getSolarBenefitBreakdown(analysis.billComparison);
  const annualBenefitThb = benefit.billSavings + benefit.exportRevenue;
  return {
    systemSizeKwp:
      recommended?.systemSizeKwp ??
      analysis.solarProfile.assumptionsSnapshot.systemSizeKwp,
    initialInvestmentThb: analysis.financial.initialInvestmentThb,
    annualBenefitThb,
    monthlyBillAfterSolarThb:
      analysis.billComparison.bestWithSolar.monthlyBillThb,
    simplePaybackYears:
      recommended?.simplePaybackYears ?? analysis.financial.simplePaybackYears,
    systemType:
      !recommended || annualBenefitThb <= 0
        ? "not_recommended"
        : backupRequirement === "essential"
          ? "hybrid"
          : "on_grid",
  };
}

function readStoredDecision<T>(
  key: string,
): { profileSnapshotId: string; decision: T } | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as {
      schemaVersion?: unknown;
      profileSnapshotId?: unknown;
      decision?: unknown;
    };
    if (
      value.schemaVersion !== 1 ||
      typeof value.profileSnapshotId !== "string" ||
      !value.decision ||
      typeof value.decision !== "object"
    )
      return null;
    return {
      profileSnapshotId: value.profileSnapshotId,
      decision: value.decision as T,
    };
  } catch {
    return null;
  }
}

function buildEcosystemReportDraft(
  plan: EcosystemPlan,
): LocalAnalysisReportDraft {
  return {
    module: "ecosystem",
    moduleLabel: "Ecosystem",
    title: "รายงานแผนพลังงานรวม",
    summary: plan.headline,
    metrics: [
      { label: "สถานะ", value: plan.verdictLabel },
      {
        label: "ผลพร้อมใช้",
        value: `${plan.readyModuleCount}/${plan.totalModuleCount} โมดูล`,
      },
      {
        label: "ค่าไฟหลังแผน",
        value: formatMoneyPerMonth(plan.projectedMonthlyEnergyCostThb),
      },
      {
        label: "งบที่ทราบ",
        value: formatBudget(plan.knownBudgetLowThb, plan.knownBudgetHighThb),
      },
    ],
    assumptions: [
      {
        label: "วิธีรวมผลประหยัด",
        value:
          "เลือกผลฐานที่ดีที่สุดระหว่าง TOU กับ Solar โดยไม่บวก Battery ซ้ำ",
      },
      { label: "ผลฐานที่ใช้", value: plan.savingsSourceLabel ?? "ยังไม่มี" },
      { label: "ความมั่นใจ", value: plan.confidenceLabel },
    ],
    resultRows: plan.phases.map((phase) => ({
      phase: phase.order,
      module: moduleMeta[phase.module].label,
      action: phase.action,
      status: phase.statusLabel,
      budgetLowThb: phase.budgetLowThb,
      budgetHighThb: phase.budgetHighThb,
      annualImpactThb: phase.annualImpactThb,
    })),
    recommendations: plan.phases.map((phase) => ({
      title: `${phase.order}. ${phase.title}`,
      description: phase.action,
      nextAction: phase.statusLabel,
    })),
    limitations: plan.limitations.map((item) => ({
      title: "ข้อจำกัดของแผนรวม",
      description: item,
    })),
    references: [
      {
        label: "ขอบเขต",
        value: "ผลที่บันทึกในอุปกรณ์และตรงกับ Load Profile/ชุดบิลปัจจุบัน",
      },
    ],
  };
}

function numeric(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function HeadlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/85 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function readinessLabel(status: "ready" | "missing" | "stale") {
  return status === "ready"
    ? "พร้อม"
    : status === "stale"
      ? "ผลเก่า"
      : "ยังไม่มีผล";
}

function formatMoney(value: number | null) {
  return value === null
    ? "-"
    : new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(
        value,
      );
}

function formatAnnualMoney(value: number | null) {
  return value === null ? "ยังคำนวณไม่ได้" : `${formatMoney(value)} บาท/ปี`;
}

function formatMoneyPerMonth(value: number | null) {
  return value === null ? "ยังคำนวณไม่ได้" : `${formatMoney(value)} บาท/เดือน`;
}

function formatBudget(low: number | null, high: number | null) {
  if (low === null && high === null) return "ยังไม่มีงบที่ยืนยัน";
  if (low !== null && high !== null && Math.abs(low - high) > 1)
    return `${formatMoney(low)}–${formatMoney(high)} บาท`;
  return `${formatMoney(high ?? low)} บาท`;
}

function formatPayback(value: number | null) {
  return value === null || !Number.isFinite(value)
    ? "ยังสรุปไม่ได้"
    : `${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 }).format(value)} ปี`;
}

function formatPhaseBudget(low: number | null, high: number | null) {
  return low === null && high === null
    ? "งบ: รอใบเสนอราคา/ไม่มีงบลงทุน"
    : `งบ: ${formatBudget(low, high)}`;
}

function formatAnnualImpact(value: number | null) {
  if (value === null) return "ผลต่อปี: ยังไม่คำนวณ";
  return value < 0
    ? `ค่าไฟเพิ่ม ${formatMoney(Math.abs(value))} บาท/ปี`
    : `ประหยัด ${formatMoney(value)} บาท/ปี`;
}

function formatNetChange(value: number | null) {
  if (value === null) return "ยังคำนวณไม่ได้";
  return value >= 0
    ? `ประหยัด ${formatMoney(value)} บาท/ปี`
    : `ค่าไฟเพิ่ม ${formatMoney(Math.abs(value))} บาท/ปี`;
}
