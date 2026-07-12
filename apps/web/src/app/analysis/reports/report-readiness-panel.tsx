"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileWarning, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { billWorkspaceStorageKey, type StoredBillWorkspace } from "@/lib/local-analysis-snapshot";
import { readLocalAnalysisReports } from "@/lib/local-analysis-report";
import { readLocalLoadProfileSnapshot } from "@/lib/local-load-profile";
import { getReportReadinessStatus, type ReportReadinessInput } from "./report-readiness-state";

const emptyReadiness: ReportReadinessInput = { hasBills: false, billMonthCount: 0, hasLoadProfile: false, hasScenario: false, hasSolar: false, hasTariffTrace: false, hasVerifiedResult: false };

const labels = {
  no_data: "ยังไม่มีข้อมูล",
  incomplete: "ข้อมูลไม่ครบ",
  low_confidence: "รายงานอาจมีความน่าเชื่อถือต่ำ",
  ready: "พร้อมสร้างรายงาน"
} as const;

export function ReportReadinessPanel() {
  const [readiness, setReadiness] = useState<ReportReadinessInput>(emptyReadiness);

  useEffect(() => {
    try {
      const rawWorkspace = window.localStorage.getItem(billWorkspaceStorageKey);
      const workspace = rawWorkspace ? JSON.parse(rawWorkspace) as Partial<StoredBillWorkspace> : null;
      const bills = workspace?.mode === "user" ? workspace.rows ?? [] : [];
      const validBills = bills.filter((bill) => /^\d{4}-(0[1-9]|1[0-2])$/.test(bill.month) && Number(bill.energyKwh) > 0 && Number(bill.totalCostThb) > 0);
      const profile = readLocalLoadProfileSnapshot();
      const reports = readLocalAnalysisReports();
      const hasScenario = reports.some((report) => report.module === "scenario");
      const hasSolar = reports.some((report) => report.module === "solar");
      const hasVerifiedResult = reports.length > 0;
      setReadiness({
        hasBills: validBills.length > 0,
        billMonthCount: validBills.length,
        hasLoadProfile: Boolean(profile?.canonicalProfile),
        hasScenario,
        hasSolar,
        hasTariffTrace: hasScenario || hasSolar,
        hasVerifiedResult
      });
    } catch {
      setReadiness(emptyReadiness);
    }
  }, []);

  const status = useMemo(() => getReportReadinessStatus(readiness), [readiness]);
  const checks = [
    { label: "ข้อมูลค่าไฟ", done: readiness.hasBills, missing: "เพิ่มข้อมูลค่าไฟอย่างน้อย 1 เดือน" },
    { label: "Load Profile", done: readiness.hasLoadProfile, missing: "สร้างหรือนำเข้า Load Profile" },
    { label: "Normal / TOU Scenario", done: readiness.hasScenario, missing: "รันการเปรียบเทียบ Normal และ TOU แล้วบันทึกรายงาน" },
    { label: "Solar Analysis", done: readiness.hasSolar, missing: "รันการประเมิน Solar แล้วบันทึกรายงาน" },
    { label: "Tariff version และผลที่ตรวจสอบได้", done: readiness.hasTariffTrace && readiness.hasVerifiedResult, missing: "บันทึกผล Scenario หรือ Solar ที่มี tariff trace" }
  ];
  const missing = checks.filter((item) => !item.done).map((item) => item.missing);
  const canExport = readiness.hasVerifiedResult;
  const exportReason = canExport ? "เลือกเปิดรายงานที่บันทึกไว้เพื่อ export" : missing[0] ?? "ยังไม่มีรายงานที่บันทึกไว้";

  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><FileWarning aria-hidden="true" className="h-5 w-5 text-primary" />สถานะรายงานปัจจุบัน</CardTitle>
    </CardHeader>
    <CardContent className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2"><Badge variant={status === "ready" ? "success" : status === "no_data" ? "outline" : "warning"}>{labels[status]}</Badge>{status === "low_confidence" ? <span className="text-sm text-muted-foreground">มีบิลน้อยกว่า 6 เดือน</span> : null}</div>
      <div className="grid gap-2">
        {checks.map((item) => <div key={item.label} className="flex items-center justify-between gap-3 rounded-md border border-border p-3"><span className="text-sm font-medium">{item.label}</span><Badge variant={item.done ? "success" : "outline"}>{item.done ? "มีข้อมูล" : "ยังขาด"}</Badge></div>)}
      </div>
      {status === "no_data" ? <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">ยังไม่มีข้อมูลสำหรับสร้างรายงาน เพิ่มบิลหรือ Load Profile ก่อนเริ่มวิเคราะห์</p> : null}
      {status === "incomplete" ? <div className="rounded-md border border-warning bg-warning/10 p-3 text-sm"><p className="font-medium">รายงานที่สร้างตอนนี้จะมีเฉพาะข้อมูลที่บันทึกไว้</p><ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{missing.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
      <div><p className="mb-2 text-xs text-muted-foreground">{canExport ? "Export ใช้ได้กับรายงานที่บันทึกแล้วเท่านั้น" : `ยัง export ไม่ได้: ${exportReason}`}</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={!canExport}><Download className="h-4 w-4" />CSV</Button><Button size="sm" variant="outline" disabled={!canExport}><Download className="h-4 w-4" />JSON</Button><Button size="sm" variant="outline" disabled={!canExport}><Download className="h-4 w-4" />PDF</Button><Button size="sm" variant="outline" disabled={!canExport}><Printer className="h-4 w-4" />Print</Button></div></div>
    </CardContent>
  </Card>;
}
