"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type LocalAnalysisReportSnapshot } from "@/lib/local-analysis-snapshot";
import { readStoredBillWorkspace } from "@/lib/local-bill-workspace";
import {
  getCurrentAnalysisDataset,
  isLocalAnalysisReportCurrent,
  readLocalAnalysisReports,
} from "@/lib/local-analysis-report";
import { readLocalLoadProfileSnapshot } from "@/lib/local-load-profile";
import {
  canExportCurrentReport,
  getReportReadinessStatus,
  type ReportReadinessInput,
} from "./report-readiness-state";
import { SampleBillNotice } from "@/components/sample-bill-notice";

const emptyReadiness: ReportReadinessInput = {
  hasBills: false,
  billMonthCount: 0,
  hasLoadProfile: false,
  hasScenario: false,
  hasSolar: false,
  hasTariffTrace: false,
  hasVerifiedResult: false,
};

const labels = {
  no_data: "ยังไม่มีข้อมูล",
  incomplete: "ข้อมูลไม่ครบ",
  low_confidence: "รายงานอาจมีความน่าเชื่อถือต่ำ",
  ready: "พร้อมสร้างรายงาน",
} as const;

export function ReportReadinessPanel() {
  const [readiness, setReadiness] =
    useState<ReportReadinessInput>(emptyReadiness);
  const [staleModules, setStaleModules] = useState<string[]>([]);
  const [exportReports, setExportReports] = useState<
    LocalAnalysisReportSnapshot[]
  >([]);
  const [selectedReportId, setSelectedReportId] = useState("");

  useEffect(() => {
    try {
      const workspace = readStoredBillWorkspace();
      const bills = workspace?.mode === "user" ? (workspace.rows ?? []) : [];
      const validBills = bills.filter(
        (bill) =>
          /^\d{4}-(0[1-9]|1[0-2])$/.test(bill.month) &&
          Number(bill.energyKwh) > 0 &&
          Number(bill.totalCostThb) > 0,
      );
      const profile = readLocalLoadProfileSnapshot();
      const reports = readLocalAnalysisReports();
      const currentDataset = getCurrentAnalysisDataset();
      const currentReports = reports.filter((report) =>
        isLocalAnalysisReportCurrent(report, currentDataset),
      );
      const staleReports = reports.filter(
        (report) => !isLocalAnalysisReportCurrent(report, currentDataset),
      );
      const hasScenario = currentReports.some(
        (report) => report.module === "scenario",
      );
      const hasSolar = currentReports.some(
        (report) => report.module === "solar",
      );
      const hasVerifiedResult = currentReports.length > 0;
      setStaleModules([
        ...new Set(staleReports.map((report) => report.moduleLabel)),
      ]);
      setExportReports(currentReports);
      setSelectedReportId(currentReports[0]?.id ?? "");
      setReadiness({
        hasBills: validBills.length > 0,
        billMonthCount: validBills.length,
        hasLoadProfile: Boolean(profile?.canonicalProfile),
        hasScenario,
        hasSolar,
        hasTariffTrace: hasScenario || hasSolar,
        hasVerifiedResult,
      });
    } catch {
      setReadiness(emptyReadiness);
      setStaleModules([]);
      setExportReports([]);
      setSelectedReportId("");
    }
  }, []);

  const status = useMemo(
    () => getReportReadinessStatus(readiness),
    [readiness],
  );
  const checks = [
    {
      label: "ข้อมูลค่าไฟ",
      done: readiness.hasBills,
      missing: "เพิ่มข้อมูลค่าไฟอย่างน้อย 1 เดือน",
    },
    {
      label: "Load Profile",
      done: readiness.hasLoadProfile,
      missing: "สร้างหรือนำเข้า Load Profile",
    },
    {
      label: "Normal / TOU Scenario",
      done: readiness.hasScenario,
      missing: "รันการเปรียบเทียบ Normal และ TOU แล้วบันทึกรายงาน",
    },
    {
      label: "Solar Analysis",
      done: readiness.hasSolar,
      missing: "รันการประเมิน Solar แล้วบันทึกรายงาน",
    },
    {
      label: "Tariff version และผลที่ตรวจสอบได้",
      done: readiness.hasTariffTrace && readiness.hasVerifiedResult,
      missing: "บันทึกผล Scenario หรือ Solar ที่มี tariff trace",
    },
  ];
  const missing = checks
    .filter((item) => !item.done)
    .map((item) => item.missing);
  const canExport = canExportCurrentReport(status);
  const exportReason = canExport
    ? "เลือกเปิดรายงานที่บันทึกไว้เพื่อ export"
    : (missing[0] ?? "ยังไม่มีรายงานที่บันทึกไว้");

  return (
    <>
      <SampleBillNotice />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileWarning aria-hidden="true" className="h-5 w-5 text-primary" />
            สถานะรายงานปัจจุบัน
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                status === "ready"
                  ? "success"
                  : status === "no_data"
                    ? "outline"
                    : "warning"
              }
            >
              {labels[status]}
            </Badge>
            {status === "low_confidence" ? (
              <span className="text-sm text-muted-foreground">
                มีบิลน้อยกว่า 6 เดือน
              </span>
            ) : null}
          </div>
          <div className="grid gap-2">
            {checks.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <span className="text-sm font-medium">{item.label}</span>
                <Badge variant={item.done ? "success" : "outline"}>
                  {item.done ? "มีข้อมูล" : "ยังขาด"}
                </Badge>
              </div>
            ))}
          </div>
          {status === "no_data" ? (
            <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
              ยังไม่มีข้อมูลสำหรับสร้างรายงาน เพิ่มบิลหรือ Load Profile
              ก่อนเริ่มวิเคราะห์
            </p>
          ) : null}
          {status === "incomplete" ? (
            <div className="rounded-md border border-warning bg-warning/10 p-3 text-sm">
              <p className="font-medium">
                รายงานที่สร้างตอนนี้จะมีเฉพาะข้อมูลที่บันทึกไว้
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                {missing.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {staleModules.length ? (
            <div className="rounded-md border border-warning bg-warning/10 p-3 text-sm leading-6">
              <p className="font-medium">ผลลัพธ์เดิมไม่ตรงกับข้อมูลปัจจุบัน</p>
              <p className="mt-1 text-muted-foreground">
                กรุณาคำนวณ {staleModules.join(" และ ")}{" "}
                ใหม่ก่อนสร้างหรือส่งออกรายงาน
              </p>
            </div>
          ) : null}
          <div>
            {canExport && selectedReportId ? (
              <div className="grid gap-2">
                <p className="text-xs text-muted-foreground">
                  เลือกผลวิเคราะห์ที่ใช้ข้อมูลชุดปัจจุบัน แล้วส่งออก CSV, JSON,
                  PDF หรือพิมพ์จากหน้ารายงานนั้น
                </p>
                {exportReports.length > 1 ? (
                  <label className="grid gap-1 text-sm font-medium">
                    รายงานที่ต้องการส่งออก
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={selectedReportId}
                      onChange={(event) =>
                        setSelectedReportId(event.target.value)
                      }
                    >
                      {exportReports.map((report) => (
                        <option key={report.id} value={report.id}>
                          {report.moduleLabel} ·{" "}
                          {new Date(report.createdAt).toLocaleString("th-TH")}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <Link
                  className="inline-flex h-10 w-fit items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  href={`/analysis/reports/${selectedReportId}`}
                >
                  เปิดรายงานเพื่อส่งออก
                </Link>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                ยัง export ไม่ได้: {exportReason}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
