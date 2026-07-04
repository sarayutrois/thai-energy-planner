"use client";

import { AlertTriangle, ArrowRight, FileText, Plus, ReceiptText, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { MonthlyBillInput } from "@thai-energy-planner/shared-types";
import { estimateDataQuality, summarizeBills, validateMonthlyBills } from "@thai-energy-planner/calculation-engine";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAnalysisStartHref, type AnalysisAudience } from "@/lib/analysis-start";
import {
  billReportStorageKey,
  billWorkspaceStorageKey,
  localBillReportId,
  type LocalBillReportSnapshot,
  type StoredBillWorkspace
} from "@/lib/local-analysis-snapshot";

type EditableBillRow = {
  id: string;
  month: string;
  energyKwh: string;
  totalCostThb: string;
  authority: "PEA" | "MEA";
  meterMode: "normal" | "tou";
};

const audienceProfile: Record<AnalysisAudience, string> = {
  home: "evening_home",
  shop: "daytime_shop",
  business: "daytime_home"
};

export function GuidedBillWorkspace({
  initialBills,
  audience
}: {
  initialBills: MonthlyBillInput[];
  audience: AnalysisAudience;
}) {
  const [rows, setRows] = useState<EditableBillRow[]>(() => loadStoredRows(initialBills, audience));
  const [saveStatus, setSaveStatus] = useState("บันทึกในเครื่องอัตโนมัติ");

  const bills = useMemo(() => rows.map(toBillInput), [rows]);
  const validation = useMemo(() => validateMonthlyBills(bills), [bills]);
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
  const recommendations = useMemo(() => buildBillRecommendations(validation.bills, summary), [summary, validation.bills]);
  const scenarioHref = `/analysis/scenarios/results?profile=${audienceProfile[audience]}&normalTariff=demo-normal&touTariff=demo-tou&meterCost=2500&shiftPercent=25&sourceStart=18%3A00&sourceEnd=22%3A00&targetWindow=22%3A00-06%3A00`;
  const solarHref = `/analysis/solar?profile=${audienceProfile[audience]}`;

  useEffect(() => {
    const payload: StoredBillWorkspace = {
      audience,
      rows,
      updatedAt: new Date().toISOString()
    };
    window.localStorage.setItem(billWorkspaceStorageKey, JSON.stringify(payload));
    setSaveStatus(`บันทึกอัตโนมัติ ${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`);
  }, [audience, rows]);

  function updateRow(id: string, patch: Partial<EditableBillRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    const latest = rows
      .map((row) => row.month)
      .filter(Boolean)
      .sort()
      .at(-1);
    setRows((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        month: nextMonth(latest),
        energyKwh: "",
        totalCostThb: "",
        authority: current.at(-1)?.authority ?? "PEA",
        meterMode: current.at(-1)?.meterMode ?? "normal"
      }
    ]);
  }

  function removeRow(id: string) {
    setRows((current) => (current.length <= 1 ? current : current.filter((row) => row.id !== id)));
  }

  function loadExample(kind: "home" | "shop") {
    const multiplier = kind === "shop" ? 2.4 : 1;
    setRows(
      initialBills.map((bill, index) => ({
        ...toEditableRow({
          ...bill,
          customerSegment: kind === "shop" ? "small_business" : "residential",
          energyKwh: Math.round(bill.energyKwh * multiplier + index * 18),
          totalCostThb: Math.round(bill.totalCostThb * multiplier + index * 95)
        }),
        authority: "PEA"
      }))
    );
  }

  function resetWorkspace() {
    window.localStorage.removeItem(billWorkspaceStorageKey);
    setRows(initialBills.map(toEditableRow));
  }

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
      rows: validation.bills.map((bill) => ({
        month: bill.month,
        energyKwh: bill.energyKwh,
        totalCostThb: bill.totalCostThb,
        authority: bill.authority ?? "PEA",
        meterMode: bill.meterMode ?? "normal"
      }))
    };
    window.localStorage.setItem(billReportStorageKey, JSON.stringify(snapshot));
    window.location.href = `/analysis/reports/${localBillReportId}`;
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
                onClick={() => loadExample("home")}
                type="button"
              >
                ตัวอย่างบ้าน
              </button>
              <button
                className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={() => loadExample("shop")}
                type="button"
              >
                ตัวอย่างร้านค้า
              </button>
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
                        disabled={rows.length <= 1}
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

      {validation.issues.length > 0 ? (
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
        <Metric label="จำนวนเดือน" value={`${summary.monthCount}`} />
        <Metric label="หน่วยรวม" value={`${formatNumber(summary.totalKwh)} kWh`} />
        <Metric label="ค่าไฟรวม" value={`${formatNumber(summary.totalCostThb)} บาท`} />
        <Metric label="เฉลี่ยต่อเดือน" value={`${formatNumber(summary.monthCount > 0 ? summary.totalCostThb / summary.monthCount : 0)} บาท`} />
        <Metric label="คุณภาพข้อมูล" value={`${dataQuality.labelTh} (${dataQuality.score})`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>คำแนะนำเบื้องต้น</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {recommendations.map((item) => (
              <div key={item.title} className="rounded-md border border-border p-4">
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
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50"
              disabled={!validation.canSave || validation.bills.length === 0}
              onClick={createLocalReport}
              type="button"
            >
              <FileText aria-hidden="true" className="h-4 w-4" />
              สร้างรายงานจากบิลนี้
            </button>
            <NextLink href={scenarioHref} label="เทียบ Normal / TOU" description="ใช้ demo scenario เพื่อดูแนวคิดการประหยัดจาก TOU และการย้ายโหลด" />
            <NextLink href={solarHref} label="ลอง Solar" description="ใช้ profile ที่เหมาะกับประเภทผู้ใช้ที่เลือกไว้ แล้วประเมินคืนทุนเบื้องต้น" />
            <NextLink href={buildAnalysisStartHref("/analysis/load-data/import", audience, "interval")} label="มีไฟล์ละเอียดแล้ว" description="อัปโหลด load profile เพื่อเพิ่มความแม่นยำของ TOU, Solar, Battery และ EV" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NextLink({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <a className="rounded-md border border-border p-4 transition hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring" href={href}>
      <span className="flex items-center justify-between gap-3 font-medium">
        {label}
        <ArrowRight aria-hidden="true" className="h-4 w-4 text-primary" />
      </span>
      <span className="mt-2 block text-sm leading-6 text-muted-foreground">{description}</span>
    </a>
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

function toEditableRow(bill: MonthlyBillInput): EditableBillRow {
  return {
    id: crypto.randomUUID(),
    month: bill.month,
    energyKwh: String(bill.energyKwh),
    totalCostThb: String(bill.totalCostThb),
    authority: bill.authority ?? "PEA",
    meterMode: bill.meterMode ?? "normal"
  };
}

function loadStoredRows(initialBills: MonthlyBillInput[], audience: AnalysisAudience): EditableBillRow[] {
  if (typeof window === "undefined") return initialBills.map(toEditableRow);

  try {
    const raw = window.localStorage.getItem(billWorkspaceStorageKey);
    if (!raw) return initialBills.map(toEditableRow);
    const parsed = JSON.parse(raw) as Partial<StoredBillWorkspace>;
    if (parsed.audience !== audience || !Array.isArray(parsed.rows) || parsed.rows.length === 0) {
      return initialBills.map(toEditableRow);
    }

    return parsed.rows.map((row) => ({
      id: row.id || crypto.randomUUID(),
      month: row.month ?? "",
      energyKwh: row.energyKwh ?? "",
      totalCostThb: row.totalCostThb ?? "",
      authority: row.authority === "MEA" ? "MEA" : "PEA",
      meterMode: row.meterMode === "tou" ? "tou" : "normal"
    }));
  } catch {
    return initialBills.map(toEditableRow);
  }
}

function toBillInput(row: EditableBillRow): MonthlyBillInput {
  return {
    month: row.month,
    energyKwh: Number(row.energyKwh),
    totalCostThb: Number(row.totalCostThb),
    authority: row.authority,
    meterMode: row.meterMode,
    customerSegment: "residential"
  };
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
          : "ตอนนี้ใช้ดูภาพรวมเบื้องต้นได้ แต่ถ้าจะตัดสินใจลงทุน Solar หรือ Battery ควรมีบิลย้อนหลังมากขึ้น",
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

function nextMonth(month: string | undefined) {
  if (!month) return "2026-05";
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return "2026-05";
  const date = new Date(Date.UTC(year, monthNumber, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}
