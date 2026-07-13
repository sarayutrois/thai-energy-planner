"use client";

import { useCallback, useEffect, useState } from "react";
import { FileUp, RefreshCw, ServerCog } from "lucide-react";
import {
  canonicalLoadProfileToLoadIntervals,
  type SolarAnalysisResult,
} from "@thai-energy-planner/calculation-engine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readLocalLoadProfileSnapshot, type LocalLoadProfileSnapshot } from "@/lib/local-load-profile";
import { readStoredBillWorkspace } from "@/lib/local-bill-workspace";
import type { SolarDemoSettings } from "@/lib/solar-demo";
import { LocalBillResultContext } from "@/components/local-bill-result-context";
import type { LocalAnalysisReportDraft } from "@/lib/local-analysis-snapshot";

type SolarAnalyzeResponse =
  | { ok: true; analysis: SolarAnalysisResult; trace: { authority: "PEA" | "MEA"; customerSegment: "residential" | "small_business"; billDate: string; inputIntervalCount: number; uploadedSolarIntervalCount: number; tariffVersionIds: string[] }; warnings: string[] }
  | { ok: false; error: string; issues?: Array<{ path: string; message: string }> };

const solarApiTimeoutMs = 12_000;

export function SolarApiRuntimePanel({ settings }: { settings: SolarDemoSettings }) {
  const [snapshot, setSnapshot] = useState<LocalLoadProfileSnapshot | null>(null);
  const [payload, setPayload] = useState<Extract<SolarAnalyzeResponse, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runAnalysis = useCallback(async (profileSnapshot: LocalLoadProfileSnapshot) => {
    setIsLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), solarApiTimeoutMs);
    try {
      const monthlyBills = readSavedBills();
      const billAuthority = readSavedBillAuthority();
      const response = await fetch("/api/solar/analyze", {
        method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          province: settings.province, profile: settings.profile, modelMode: settings.modelMode,
          ...(settings.latitude === undefined ? {} : { latitude: settings.latitude }),
          ...(settings.longitude === undefined ? {} : { longitude: settings.longitude }),
          billDate: profileSnapshot.canonicalProfile?.period.startInclusive.slice(0, 10) ?? "2026-07-01",
          voltageLevel: "low_voltage", customerSegment: settings.profile === "daytime_shop" ? "small_business" : "residential",
          systemSizeKwp: settings.systemSizeKwp, roofAreaSqm: settings.roofAreaSqm, roofAzimuth: settings.roofAzimuth, roofTilt: settings.roofTilt,
          systemLossPercent: settings.systemLossPercent, shadingLossPercent: settings.shadingLossPercent, degradationPercentPerYear: settings.degradationPercentPerYear,
          capexThb: settings.capexThb, oAndMCostPerYear: settings.oAndMCostPerYear, projectLifeYears: settings.projectLifeYears,
          discountRatePercent: settings.discountRatePercent, electricityEscalationRatePercent: settings.electricityEscalationRatePercent,
          inverterReplacementCostThb: settings.inverterReplacementCostThb, inverterReplacementYear: settings.inverterReplacementYear,
          exportEnabled: settings.exportEnabled, exportRateThbPerKwh: settings.exportRateThbPerKwh, exportLimitKw: settings.exportLimitKw,
          loadIntervals: profileSnapshot.canonicalProfile ? canonicalLoadProfileToLoadIntervals(profileSnapshot.canonicalProfile) : profileSnapshot.rows,
          ...(monthlyBills.length ? { monthlyBills } : {}),
          ...(billAuthority ? { authority: billAuthority } : {}),
        }),
      });
      const result = (await response.json()) as SolarAnalyzeResponse;
      if (!response.ok || !result.ok) throw new Error(result.ok ? "" : result.error);
      setPayload(result);
    } catch (caught) {
      setPayload(null);
      setError(caught instanceof DOMException && caught.name === "AbortError" ? "การคำนวณใช้เวลานานเกินไป กรุณาลองอีกครั้ง" : caught instanceof Error && caught.message ? caught.message : "ไม่สามารถคำนวณ Solar ได้ในขณะนี้");
    } finally {
      window.clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [settings]);

  useEffect(() => {
    const next = readLocalLoadProfileSnapshot();
    setSnapshot(next);
    if (next) void runAnalysis(next);
  }, [runAnalysis]);

  if (!snapshot) return (
    <Card className="border-dashed">
      <CardHeader><CardTitle className="flex items-center gap-2"><FileUp className="h-5 w-5 text-primary" />ข้อมูลยังไม่เพียงพอสำหรับประเมิน Solar</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm leading-6 text-muted-foreground"><p>สร้างหรือนำเข้า Load Profile ก่อน เพื่อคำนวณขนาดระบบ ระยะเวลาคืนทุน และผลประหยัดได้อย่างน่าเชื่อถือ</p><div className="flex flex-wrap gap-2"><a className="inline-flex h-10 items-center rounded-md bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/90" href="/analysis/load-data/appliances">สร้าง Load Profile</a><a className="inline-flex h-10 items-center rounded-md border border-border bg-card px-4 font-medium text-foreground hover:bg-muted" href="/analysis/load-data/import">นำเข้าข้อมูลการใช้ไฟ</a></div></CardContent>
    </Card>
  );

  const dataStatus = getSolarDataStatus(snapshot, readSavedBills().length > 0);
  const reportDraft = payload ? buildSolarRuntimeReportDraft(payload.analysis, payload.trace, snapshot) : undefined;

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div><CardTitle className="flex items-center gap-2"><ServerCog className="h-5 w-5 text-primary" />ผลการประเมิน Solar จากข้อมูลที่เลือก</CardTitle><p className="mt-2 text-sm leading-6 text-muted-foreground">ใช้ “{snapshot.sourceName}” จำนวน {snapshot.rowCount.toLocaleString("th-TH")} ช่วงข้อมูล · อัปเดต {formatDate(snapshot.updatedAt)}</p></div>
          <div className="flex flex-wrap gap-2"><Badge>{dataStatus.label}</Badge><Badge variant="outline">{formatNumber(snapshot.totalKwh)} kWh</Badge>{payload ? <Badge variant="success">อัตราค่าไฟ {payload.trace.authority}</Badge> : null}</div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {dataStatus.warning ? <div className="rounded-md border border-warning bg-warning/10 p-3 text-sm leading-6 text-warning-foreground">ผลลัพธ์นี้เป็นการประเมินเบื้องต้น ความแม่นยำจะเพิ่มขึ้นเมื่อใช้ Load Profile จากมิเตอร์หรือข้อมูลรายช่วงเวลา</div> : null}
        {isLoading ? <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">กำลังคำนวณจากข้อมูลการใช้ไฟที่เลือก…</div> : null}
        {error ? <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
        {payload ? <RuntimeMetrics analysis={payload.analysis} trace={payload.trace} snapshot={snapshot} hasBills={readSavedBills().length > 0} /> : null}
        {payload?.warnings.length ? <div className="rounded-md border border-warning bg-warning/10 p-3 text-sm leading-6 text-warning-foreground">{payload.warnings.map((warning) => <p key={warning}>{solarWarningCopy(warning)}</p>)}</div> : null}
        <div className="flex flex-wrap gap-2"><Button disabled={isLoading} onClick={() => void runAnalysis(snapshot)} variant="outline"><RefreshCw className="h-4 w-4" />{isLoading ? "กำลังคำนวณ..." : "คำนวณผล"}</Button><a className="inline-flex h-10 items-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-muted" href="/analysis/load-data">แก้ไขข้อมูลการใช้ไฟ</a><a className="inline-flex h-10 items-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-muted" href="/analysis/solar/config">แก้ไขข้อมูลสำหรับประเมิน Solar</a></div>
        <LocalBillResultContext enabled={Boolean(reportDraft && readSavedBills().length > 0)} moduleName="Solar" reportDraft={reportDraft} />
      </CardContent>
    </Card>
  );
}

function RuntimeMetrics({ analysis, trace, snapshot, hasBills }: { analysis: SolarAnalysisResult; trace: Extract<SolarAnalyzeResponse, { ok: true }>['trace']; snapshot: LocalLoadProfileSnapshot; hasBills: boolean }) {
  const comparison = analysis.billComparison;
  const decision = getSolarDecision({ analysis, snapshot, hasBills });
  const recommendedSizing = analysis.sizing.recommended;
  return <><section className={`rounded-md border p-4 ${decision.tone}`}><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-medium uppercase tracking-wide">ผลตัดสินใจ Solar</p><h3 className="mt-1 text-lg font-semibold">{decision.title}</h3><p className="mt-2 max-w-3xl text-sm leading-6">{decision.explanation}</p></div><Badge variant={decision.variant}>{decision.badge}</Badge></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><Info label="ขนาดที่กำลังประเมิน" value={`${formatNumber(analysis.solarProfile.assumptionsSnapshot.systemSizeKwp)} kWp`} /><Info label="ขนาดที่ผ่านเกณฑ์ความคุ้มค่า" value={recommendedSizing ? `${formatNumber(recommendedSizing.systemSizeKwp)} kWp · คืนทุน ${formatNumber(recommendedSizing.simplePaybackYears ?? 0)} ปี` : "ไม่มีขนาดที่ผ่านเกณฑ์"} /><Info label="ข้อมูลที่ใช้ตัดสินใจ" value={snapshot.calibration ? "Load ที่ปรับเทียบกับบิลแล้ว" : hasBills ? "มีบิล แต่ยังไม่ยืนยันปรับเทียบ" : "Load Profile ยังไม่มีบิลยืนยัน"} /></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{decision.nextAction}</p><ul className="mt-2 grid gap-1 text-xs leading-5 text-muted-foreground">{decision.actions.map((action) => <li key={action}>• {action}</li>)}</ul></section><div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
    <Metric label="ใช้ไฟโดยประมาณ" value={`${formatNumber(comparison.bestWithoutSolar.monthlyEnergyKwh)} kWh/เดือน`} />
    <Metric label="ค่าไฟหลัง Solar" value={`${formatNumber(comparison.bestWithSolar.monthlyBillThb)} บาท/เดือน`} />
    <Metric label="ขนาดที่กำลังประเมิน" value={`${formatNumber(analysis.solarProfile.assumptionsSnapshot.systemSizeKwp)} kWp`} />
    <Metric label="ประหยัดโดยประมาณ" value={`${formatNumber(comparison.netAnnualBenefit / 12)} บาท/เดือน`} />
    <Metric label="ลดไฟจากโครงข่าย" value={`${formatNumber(analysis.selfConsumption.selfSufficiencyRatio * 100)}%`} />
    <Metric label="เงินลงทุนโดยประมาณ" value={`${formatNumber(analysis.financial.initialInvestmentThb)} บาท`} />
    <Metric label="ระยะคืนทุน" value={analysis.financial.simplePaybackYears ? `${formatNumber(analysis.financial.simplePaybackYears)} ปี` : "ไม่สามารถคืนทุนจากสมมติฐานนี้"} />
    <Metric label="สัดส่วนไฟ Solar ที่ใช้ภายในสถานที่" value={`${formatNumber(analysis.selfConsumption.selfConsumptionRatio * 100)}%`} />
    <Metric label="ช่วงข้อมูลที่ใช้" value={`${trace.inputIntervalCount.toLocaleString("th-TH")} ช่วง`} />
  </div><section className="rounded-md border border-border bg-background p-4 text-sm"><h3 className="font-semibold">เปรียบเทียบก่อนและหลังติดตั้ง Solar</h3><div className="mt-3 grid gap-3 md:grid-cols-3"><Info label="ค่าไฟก่อนติดตั้ง" value={`${formatNumber(comparison.bestWithoutSolar.monthlyBillThb)} บาท/เดือน`} /><Info label="ค่าไฟหลังติดตั้ง" value={`${formatNumber(comparison.bestWithSolar.monthlyBillThb)} บาท/เดือน`} /><Info label="ประหยัดรายปี" value={`${formatNumber(comparison.netAnnualBenefit)} บาท/ปี`} /></div></section><section className="rounded-md border border-border bg-background p-4 text-sm"><h3 className="font-semibold">ที่มาข้อมูลและสมมติฐานที่ใช้</h3><div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4"><Info label="ข้อมูลการใช้ไฟ" value={`${snapshot.sourceName} (${snapshot.canonicalProfile?.quality.level === "measured" ? "ข้อมูลวัดจริง" : snapshot.canonicalProfile?.quality.level === "modeled" ? "รูปแบบจำลอง" : "ค่าประมาณ"})`} /><Info label="ข้อมูลจากบิล" value={hasBills ? "ใช้เพื่อปรับสัดส่วนรายเดือน" : "ยังไม่มีข้อมูลบิล"} /><Info label="อัตราค่าไฟ" value={`${trace.authority} · วันที่อ้างอิง ${trace.billDate}`} /><Info label="ข้อมูลแสงอาทิตย์" value={`${solarSourceLabel(analysis.solarProfile.source.authority)} · ${sourceStatus(analysis.solarProfile.source.status)}${analysis.solarProfile.source.verifiedAt ? ` · ตรวจสอบ ${analysis.solarProfile.source.verifiedAt}` : ""}`} /></div></section></>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md border border-border bg-card p-4"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>; }
function formatNumber(value: number) { return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value); }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "ไม่ทราบ" : date.toLocaleString("th-TH-u-ca-gregory", { dateStyle: "medium", timeStyle: "short" }); }
function getSolarDataStatus(snapshot: LocalLoadProfileSnapshot, hasBills: boolean) {
  if (snapshot.canonicalProfile?.quality.level === "measured") return { label: "ข้อมูลจริงจาก Load Profile", warning: false };
  if (hasBills) return { label: "ข้อมูลประมาณการจากบิล", warning: true };
  if (snapshot.sourceName.includes("ตัวอย่าง")) return { label: "ข้อมูลตัวอย่าง", warning: true };
  return { label: "ข้อมูลยังไม่เพียงพอ", warning: true };
}
function readSavedBills() {
  const workspace = readStoredBillWorkspace();
  if (workspace?.mode !== "user") return [];
  return workspace.rows.map((row) => ({ month: row.month, billThb: Number(row.totalCostThb) })).filter((row): row is { month: string; billThb: number } => /^\d{4}-(0[1-9]|1[0-2])$/.test(row.month) && Number.isFinite(row.billThb) && row.billThb > 0).slice(0, 12);
}
function readSavedBillAuthority(): "PEA" | "MEA" | undefined {
  const workspace = readStoredBillWorkspace();
  if (workspace?.mode !== "user") return undefined;
  const authorities = workspace.rows.map((row) => row.authority);
  return authorities.length > 0 && authorities.every((authority) => authority === authorities[0]) ? authorities[0] : undefined;
}
function sourceStatus(status: "demo" | "draft" | "verified" | "published") { return status === "published" || status === "verified" ? "ข้อมูลอ้างอิง" : status === "draft" ? "ข้อมูลรอตรวจสอบ" : "ค่ามาตรฐานสำหรับประมาณการ"; }

function solarSourceLabel(authority: string) {
  return authority.toLowerCase().includes("demo") ? "ข้อมูลแสงอาทิตย์มาตรฐานของระบบ" : authority;
}

function solarWarningCopy(warning: string) {
  if (warning.includes("No uploaded load intervals")) return "ยังไม่มีข้อมูลการใช้ไฟรายช่วงเวลา ระบบจึงใช้รูปแบบการใช้ไฟมาตรฐานสำหรับการประเมินเบื้องต้น";
  if (warning.includes("PVGIS site data was unavailable")) return "ไม่สามารถใช้ข้อมูลแสงอาทิตย์ตามตำแหน่งที่ระบุได้ จึงใช้ค่าประมาณแสงอาทิตย์มาตรฐานแทน";
  if (warning.includes("Solar yield is using")) return "ขณะนี้ใช้ค่าประมาณแสงอาทิตย์มาตรฐาน ความแม่นยำจะเพิ่มขึ้นเมื่อระบุตำแหน่งติดตั้ง";
  if (warning.includes("Factory/large-building tariffs")) return "อัตราค่าไฟสำหรับโรงงานหรืออาคารขนาดใหญ่ยังไม่รองรับ ผลนี้จึงใช้อัตราธุรกิจขนาดเล็กเป็นค่าประมาณ";
  return warning;
}

function buildSolarRuntimeReportDraft(
  analysis: SolarAnalysisResult,
  trace: Extract<SolarAnalyzeResponse, { ok: true }>["trace"],
  snapshot: LocalLoadProfileSnapshot,
): LocalAnalysisReportDraft {
  const comparison = analysis.billComparison;
  return {
    module: "solar",
    moduleLabel: "Solar",
    title: "รายงานประเมิน Solar จาก Load Profile",
    summary: `ประเมินจาก ${snapshot.sourceName} โดยใช้ระบบขนาด ${formatNumber(analysis.solarProfile.assumptionsSnapshot.systemSizeKwp)} kWp`,
    metrics: [
      { label: "ค่าไฟก่อนติดตั้ง", value: `${formatNumber(comparison.bestWithoutSolar.monthlyBillThb)} บาท/เดือน` },
      { label: "ค่าไฟหลังติดตั้ง", value: `${formatNumber(comparison.bestWithSolar.monthlyBillThb)} บาท/เดือน` },
      { label: "ประหยัดโดยประมาณ", value: `${formatNumber(comparison.netAnnualBenefit)} บาท/ปี` },
      { label: "ระยะเวลาคืนทุน", value: analysis.financial.simplePaybackYears ? `${formatNumber(analysis.financial.simplePaybackYears)} ปี` : "ยังไม่คืนทุนในสมมติฐานนี้" },
    ],
    assumptions: [
      { label: "Load Profile", value: snapshot.sourceName },
      { label: "จำนวนช่วงข้อมูล", value: trace.inputIntervalCount.toLocaleString("th-TH") },
      { label: "ขนาดระบบ", value: `${formatNumber(analysis.solarProfile.assumptionsSnapshot.systemSizeKwp)} kWp` },
      { label: "การไฟฟ้า", value: trace.authority },
    ],
    resultRows: [{
      monthlyBillBeforeThb: roundReportNumber(comparison.bestWithoutSolar.monthlyBillThb),
      monthlyBillAfterThb: roundReportNumber(comparison.bestWithSolar.monthlyBillThb),
      annualBenefitThb: roundReportNumber(comparison.netAnnualBenefit),
      systemSizeKwp: roundReportNumber(analysis.solarProfile.assumptionsSnapshot.systemSizeKwp),
    }],
    recommendations: analysis.recommendations.map((item) => ({
      title: item.title,
      description: item.explanation,
      nextAction: item.nextAction,
    })),
    references: [{ label: "อัตราค่าไฟอ้างอิง", value: `${trace.authority} · วันที่ ${trace.billDate}` }],
  };
}

function roundReportNumber(value: number) {
  return Number(value.toFixed(2));
}

function getSolarDecision({ analysis, snapshot, hasBills }: { analysis: SolarAnalysisResult; snapshot: LocalLoadProfileSnapshot; hasBills: boolean }) {
  const recommended = analysis.sizing.recommended;
  const selfUsePercent = analysis.selfConsumption.selfConsumptionRatio * 100;
  if (!recommended) {
    return {
      title: "ยังไม่แนะนำติดตั้งตามข้อมูลปัจจุบัน",
      badge: "ยังไม่แนะนำ",
      variant: "warning" as const,
      tone: "border-warning bg-warning/10 text-warning-foreground",
      explanation: `ระบบลองขนาด 0.5–${formatNumber(analysis.sizing.constraints.appliedMaxKwp)} kWp แล้ว แต่ยังไม่มีขนาดที่ทั้ง NPV เป็นบวกและคืนทุนภายในอายุโครงการ โดยใช้ Solar เองเพียง ${formatNumber(selfUsePercent)}%.`,
      nextAction: "ลองลดขนาดระบบ เพิ่มการใช้ไฟช่วงกลางวัน หรือเติมข้อมูลเครื่องใช้และบิลเพื่อให้การประเมินแม่นขึ้นก่อนตัดสินใจลงทุน.",
      actions: ["ย้ายงานที่เลื่อนได้ เช่น ซักผ้า หรือปั๊มน้ำ มาช่วงกลางวัน", "ตรวจรายการเครื่องใช้และเวลาการใช้งานที่ยังไม่ได้เพิ่ม"],
    };
  }
  if (!snapshot.calibration || !hasBills || analysis.modelQuality.score < 60) {
    return {
      title: "ควรพิจารณาหลังเพิ่มข้อมูล",
      badge: "ควรพิจารณา",
      variant: "outline" as const,
      tone: "border-primary/40 bg-primary/5",
      explanation: `พบขนาด ${formatNumber(recommended.systemSizeKwp)} kWp ที่ผ่านเกณฑ์ความคุ้มค่า แต่ข้อมูลที่ใช้ยังไม่มั่นใจพอสำหรับยืนยันการลงทุน โดยใช้ Solar เองประมาณ ${formatNumber(selfUsePercent)}%.`,
      nextAction: "ยืนยันปรับเทียบ Load Profile กับบิล และเพิ่มข้อมูลการใช้ไฟช่วงกลางวันก่อนเลือกขนาดติดตั้งจริง.",
      actions: ["เพิ่มบิลอย่างน้อย 3 เดือนเพื่อยืนยันฤดูกาลใช้ไฟ", "ตรวจพื้นที่หลังคาและเงาบัง", "ใช้ขนาดที่ผ่านเกณฑ์เป็นจุดเริ่มต้นขอใบเสนอราคา"],
    };
  }
  return {
    title: "เหมาะสมสำหรับพิจารณาติดตั้ง",
    badge: "เหมาะสม",
    variant: "success" as const,
    tone: "border-success bg-success/10",
    explanation: `ขนาด ${formatNumber(recommended.systemSizeKwp)} kWp ให้ NPV สูงสุดในกลุ่มที่คืนทุนภายในอายุโครงการ และใช้ข้อมูล Load Profile ที่ปรับเทียบกับบิลแล้ว โดยใช้ Solar เองประมาณ ${formatNumber(selfUsePercent)}%.`,
    nextAction: "ตรวจพื้นที่หลังคา เงาบัง และใบเสนอราคาจริงก่อนตัดสินใจติดตั้ง.",
    actions: ["ใช้ขนาดที่ผ่านเกณฑ์เป็นจุดเริ่มต้นขอใบเสนอราคา", "ยืนยันพื้นที่หลังคาและเงาบังหน้างาน"],
  };
}
