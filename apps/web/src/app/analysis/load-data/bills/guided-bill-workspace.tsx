"use client";

import { AlertTriangle, ArrowRight, Download, FileText, Plus, ReceiptText, RotateCcw, Trash2, Upload } from "lucide-react";
import { useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MonthlyBillInput } from "@thai-energy-planner/shared-types";
import { estimateDataQuality, summarizeBills, validateMonthlyBills } from "@thai-energy-planner/calculation-engine";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAnalysisStartHref, type AnalysisAudience } from "@/lib/analysis-start";
import { billReportStorageKey, billWorkspaceStorageKey, localBillReportId, type LocalBillReportSnapshot } from "@/lib/local-analysis-snapshot";
import { useBillWorkspace, toBillInput, type EditableBillRow } from "./use-bill-workspace";
import { completedBillInputs } from "./bill-workspace-state";
import { AiScannerButton } from "./ai-scanner-button";
import { LocalDataBackupControls } from "@/components/local-data-backup-controls";

const audienceProfile: Record<AnalysisAudience, string> = {
  home: "evening_home",
  shop: "daytime_shop",
  business: "daytime_home"
};

const MONTH_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/;

function sanitizeMonth(value: string): string {
  return MONTH_PATTERN.test(value) ? value : "";
}

const thFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

export function GuidedBillWorkspace({
  initialBills,
  audience
}: {
  initialBills: MonthlyBillInput[];
  audience: AnalysisAudience;
}) {
  const {
    rows,
    mode,
    saveStatus,
    updateRow,
    addRow,
    removeRow,
    loadExample,
    resetWorkspace,
    startUserEntry,
    exportWorkspace,
    exportWorkspaceCsv,
    importWorkspace,
    upsertRow
  } = useBillWorkspace(initialBills, audience);
  const router = useRouter();
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const bills = useMemo(() => rows.map(toBillInput), [rows]);
  const validation = useMemo(() => validateMonthlyBills(bills), [bills]);
  const completedBills = useMemo(() => completedBillInputs(validation.bills), [validation.bills]);
  const summary = useMemo(() => summarizeBills(completedBills), [completedBills]);
  const hasBillData = completedBills.length > 0;
  const dataQuality = useMemo(
    () =>
      estimateDataQuality({
        source: "bill",
        intervalMonths: 0,
        hasTwelveMonthBills: completedBills.length >= 12
      }),
    [completedBills.length]
  );
  const recommendations = useMemo(() => (hasBillData ? buildBillRecommendations(completedBills, summary) : []), [completedBills, hasBillData, summary]);
  const averageMonthlyKwh = useMemo(
    () => (summary.monthCount > 0 ? summary.totalKwh / summary.monthCount : 0),
    [summary.totalKwh, summary.monthCount]
  );
  const scenarioHref = useMemo(() => {
    const params = new URLSearchParams({
      audience,
      source: "bills",
      profile: audienceProfile[audience],
      meterCost: "2500",
      shiftPercent: "25",
      sourceStart: "18:00",
      sourceEnd: "22:00",
      targetWindow: "22:00-06:00",
      monthlyKwh: String(round(averageMonthlyKwh, 2)),
      billMonthCount: String(completedBills.length),
    });
    return `/analysis/scenarios/results?${params.toString()}`;
  }, [audience, averageMonthlyKwh, completedBills.length]);
  const solarHref = `/analysis/solar?audience=${audience}&source=bills&profile=${audienceProfile[audience]}`;

  function createLocalReport() {
    const averageMonthlyCostThb = summary.monthCount > 0 ? summary.totalCostThb / summary.monthCount : 0;
    const snapshot: LocalBillReportSnapshot = {
      id: localBillReportId,
      title: "รายงานสรุปบิลค่าไฟ",
      createdAt: new Date().toISOString(),
      audience,
      monthCount: summary.monthCount,
      totalKwh: summary.totalKwh,
      totalCostThb: summary.totalCostThb,
      averageMonthlyCostThb,
      averageCostPerKwh: summary.averageCostPerKwh,
      dataQualityLabel: dataQuality.labelTh,
      dataQualityScore: dataQuality.score,
      highestMonth: summary.highestMonth
        ? {
            month: summary.highestMonth.month,
            energyKwh: summary.highestMonth.energyKwh,
            totalCostThb: summary.highestMonth.totalCostThb
          }
        : null,
      recommendations: recommendations.map((item) => ({
        title: item.title,
        description: item.description,
        badge: item.badge
      })),
      rows: completedBills.map((bill) => ({
        month: sanitizeMonth(bill.month),
        energyKwh: bill.energyKwh,
        totalCostThb: bill.totalCostThb,
        authority: bill.authority ?? "PEA",
        meterMode: bill.meterMode ?? "normal"
      }))
    };
    window.localStorage.setItem(billReportStorageKey, JSON.stringify(snapshot));
    router.push(`/analysis/reports/${localBillReportId}`);
  }

  function proceedToLoadComparison() {
    window.localStorage.setItem(billWorkspaceStorageKey, JSON.stringify({
      audience,
      mode: "user",
      rows,
      updatedAt: new Date().toISOString(),
    }));
    window.localStorage.removeItem(billReportStorageKey);
    router.push("/analysis/load-data/dashboard");
  }

  return (
    <div className="mt-6 grid gap-5">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText aria-hidden="true" className="h-5 w-5 text-primary" />
                กรอกบิลค่าไฟ
              </CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                ใส่เดือน, kWh และค่าไฟรวมก่อนก็พอ ช่องอื่นใช้ช่วยจำแนกข้อมูลให้รายงานอ่านง่ายขึ้น
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{saveStatus}</Badge>
              <button
                className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={loadExample}
                type="button"
              >
                ทดลองด้วยข้อมูลตัวอย่าง
              </button>
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={exportWorkspace}
                type="button"
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                Export JSON
              </button>
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={exportWorkspaceCsv}
                type="button"
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                Export CSV
              </button>
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Upload aria-hidden="true" className="h-4 w-4" />
                Import JSON/CSV
              </button>
              <AiScannerButton 
                onScanSuccess={(bill) => {
                  upsertRow({
                    month: bill.month,
                    energyKwh: String(bill.energyKwh),
                    totalCostThb: String(bill.totalCostThb),
                    ...(bill.authority && { authority: bill.authority as "PEA" | "MEA" })
                  });
                }} 
              />
              <LocalDataBackupControls />
              <input
                accept="application/json,text/csv,.json,.csv"
                className="hidden"
                onChange={(event) => {
                  void importWorkspace(event.target.files?.[0], () => {
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  });
                }}
                ref={fileInputRef}
                type="file"
              />
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={resetWorkspace}
                type="button"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                เริ่มใหม่
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">เดือน</th>
                  <th className="px-3 py-2 font-medium">หน่วย kWh</th>
                  <th className="px-3 py-2 font-medium">ค่าไฟรวม</th>
                  <th className="px-3 py-2 font-medium">การไฟฟ้า</th>
                  <th className="px-3 py-2 font-medium">มิเตอร์</th>
                  <th className="px-3 py-2 font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <input
                        className="h-10 w-full rounded-md border border-input px-3"
                        min="2020-01"
                        max="2030-12"
                        onChange={(event) => updateRow(row.id, { month: event.target.value })}
                        type="month"
                        value={row.month}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="h-10 w-full rounded-md border border-input px-3"
                        min="0"
                        onChange={(event) => updateRow(row.id, { energyKwh: event.target.value })}
                        placeholder="เช่น 420"
                        type="number"
                        value={row.energyKwh}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="h-10 w-full rounded-md border border-input px-3"
                        min="0"
                        onChange={(event) => updateRow(row.id, { totalCostThb: event.target.value })}
                        placeholder="เช่น 1810"
                        type="number"
                        value={row.totalCostThb}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="h-10 w-full rounded-md border border-input px-3"
                        onChange={(event) => updateRow(row.id, { authority: event.target.value as EditableBillRow["authority"] })}
                        value={row.authority}
                      >
                        <option value="PEA">PEA</option>
                        <option value="MEA">MEA</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="h-10 w-full rounded-md border border-input px-3"
                        onChange={(event) => updateRow(row.id, { meterMode: event.target.value as EditableBillRow["meterMode"] })}
                        value={row.meterMode}
                      >
                        <option value="normal">Normal</option>
                        <option value="tou">TOU</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        aria-label="ลบเดือนนี้"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        onClick={() => removeRow(row.id)}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            onClick={addRow}
            type="button"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            เพิ่มเดือน
          </button>
        </CardContent>
      </Card>

      {mode === "empty" ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <ReceiptText aria-hidden="true" className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-semibold">ยังไม่มีข้อมูลค่าไฟ</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">เพิ่มบิลอย่างน้อย 1 เดือนเพื่อดูภาพรวมเบื้องต้น และแนะนำให้ใช้ข้อมูล 6–12 เดือนเพื่อการวิเคราะห์ที่น่าเชื่อถือขึ้น</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90" onClick={addRow} type="button">เริ่มกรอกข้อมูลของฉัน</button>
              <button className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-muted" onClick={loadExample} type="button">ทดลองด้วยข้อมูลตัวอย่าง</button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {mode === "sample" ? (
        <div className="rounded-md border border-warning bg-warning/10 p-4 text-sm">
          <p className="font-semibold">ข้อมูลตัวอย่างบ้าน — ตัวเลขเหล่านี้ยังไม่ใช่ข้อมูลค่าไฟของคุณ</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded-md border border-border bg-card px-3 py-2 font-medium hover:bg-muted" onClick={resetWorkspace} type="button">ล้างข้อมูลตัวอย่าง</button>
            <button className="rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground hover:bg-primary/90" onClick={startUserEntry} type="button">เริ่มกรอกข้อมูลของฉัน</button>
          </div>
        </div>
      ) : null}

      {rows.length > 0 && validation.issues.length > 0 ? (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle aria-hidden="true" className="h-5 w-5" />
              จุดที่ควรตรวจ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm leading-6">
              {validation.issues.map((issue, index) => (
                <li key={`${issue.code}-${issue.rowNumber}-${index}`}>{issue.messageTh}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-5">
        <Metric label="จำนวนเดือน" value={hasBillData ? `${summary.monthCount}` : "N/A"} />
        <Metric label="หน่วยรวม" value={hasBillData ? `${formatNumber(summary.totalKwh)} kWh` : "N/A"} />
        <Metric label="ค่าไฟรวม" value={hasBillData ? `${formatNumber(summary.totalCostThb)} บาท` : "N/A"} />
        <Metric label="เฉลี่ยต่อเดือน" value={hasBillData ? `${formatNumber(summary.totalCostThb / summary.monthCount)} บาท` : "N/A"} />
        <Metric label="คุณภาพข้อมูล" value={mode === "sample" ? "ข้อมูลตัวอย่าง" : hasBillData ? `${dataQuality.labelTh} (${dataQuality.score})` : "ยังไม่มีข้อมูล"} />
      </div>

      {hasBillData ? <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>คำแนะนำเบื้องต้น</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {recommendations.map((item, index) => (
              <div key={index} className="rounded-md border border-border p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge variant={item.tone}>{item.badge}</Badge>
                </div>
                <p className="font-semibold">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ไปต่อหลังกรอกบิล</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {mode === "user" && validation.canSave && completedBills.length > 0 ? (
              <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring" onClick={proceedToLoadComparison} type="button">
                บันทึกบิลแล้วไปเทียบ Load Profile
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            ) : (
              <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                กรอกเดือนและหน่วยไฟให้ครบอย่างน้อย 1 บิล แล้วจึงเปรียบเทียบกับ Load Profile ได้
              </p>
            )}
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50"
              disabled={mode !== "user" || !validation.canSave || completedBills.length === 0}
              onClick={createLocalReport}
              type="button"
            >
              <FileText aria-hidden="true" className="h-4 w-4" />
              สร้างรายงานจากบิลนี้
            </button>
            <NextLink href={scenarioHref} label="เทียบ Normal / TOU" description="ใช้ข้อมูลบิลที่บันทึกไว้เพื่อประเมินค่าไฟ TOU และการย้ายโหลดเบื้องต้น" />
            <NextLink href={solarHref} label="ลอง Solar" description="ใช้ profile ที่เหมาะกับประเภทผู้ใช้ที่เลือกไว้ แล้วประเมินคืนทุนเบื้องต้น" />
            <NextLink href={buildAnalysisStartHref("/analysis/load-data/import", audience, "interval")} label="มีไฟล์ละเอียดแล้ว" description="อัปโหลด Load Profile เพื่อเพิ่มความแม่นยำของ TOU และ Solar" />
          </CardContent>
        </Card>
      </div> : null}
    </div>
  );
}

function NextLink({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link className="rounded-md border border-border p-4 transition hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring" href={href}>
      <span className="flex items-center justify-between gap-3 font-medium">
        {label}
        <ArrowRight aria-hidden="true" className="h-4 w-4 text-primary" />
      </span>
      <span className="mt-2 block text-sm leading-6 text-muted-foreground">{description}</span>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-normal">{value}</p>
    </div>
  );
}

function buildBillRecommendations(bills: MonthlyBillInput[], summary: ReturnType<typeof summarizeBills>) {
  const averageKwh = summary.monthCount > 0 ? summary.totalKwh / summary.monthCount : 0;
  const averageCost = summary.monthCount > 0 ? summary.totalCostThb / summary.monthCount : 0;
  const highest = summary.highestMonth;

  return [
    {
      title: bills.length >= 12 ? "ข้อมูลพอสำหรับดูฤดูกาล" : "ควรเพิ่มบิลให้ใกล้ 12 เดือน",
      description:
        bills.length >= 12
          ? "มีข้อมูลครบปีพอจะดูช่วงหน้าร้อน/หน้าฝนและค่าไฟเฉลี่ยรายปีได้ดีขึ้น"
          : "ตอนนี้ใช้ดูภาพรวมเบื้องต้นได้ แต่ถ้าจะตัดสินใจลงทุน Solar ควรมีบิลย้อนหลังมากขึ้น",
      badge: `${bills.length} เดือน`,
      tone: bills.length >= 12 ? "success" : "warning"
    },
    {
      title: averageKwh >= 500 ? "โหลดค่อนข้างสูง ควรลอง TOU และ Solar" : "โหลดไม่สูงมาก เริ่มจากลดพฤติกรรมช่วงแพงก่อน",
      description:
        averageKwh >= 500
          ? `ใช้ไฟเฉลี่ยประมาณ ${formatNumber(averageKwh)} kWh/เดือน มีโอกาสเห็นผลชัดจากการเทียบ TOU หรือ Solar`
          : `ใช้ไฟเฉลี่ยประมาณ ${formatNumber(averageKwh)} kWh/เดือน ควรดูช่วงเวลาใช้งานและอุปกรณ์หลักก่อนลงทุนใหญ่`,
      badge: `${formatNumber(averageCost)} บาท/เดือน`,
      tone: averageKwh >= 500 ? "success" : "outline"
    },
    {
      title: highest ? `เดือนที่สูงสุดคือ ${highest.month}` : "ยังไม่มีเดือนที่สรุปได้",
      description: highest
        ? `เดือนนี้ใช้ ${formatNumber(highest.energyKwh)} kWh และจ่าย ${formatNumber(highest.totalCostThb)} บาท ใช้เป็นจุดเริ่มต้นถามว่ามีแอร์ เครื่องจักร หรือกิจกรรมพิเศษหรือไม่`
        : "กรอกอย่างน้อยหนึ่งเดือนเพื่อให้ระบบสรุปเดือนที่ควรตรวจเป็นพิเศษ",
      badge: "ตรวจ pattern",
      tone: "outline"
    }
  ] as const;
}

function formatNumber(value: number) {
  return thFormatter.format(value);
}

function round(value: number, places: number) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
