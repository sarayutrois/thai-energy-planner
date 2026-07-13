"use client";

import { useEffect, useState } from "react";
import { ArrowRight, FileText, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteLocalAnalysisReport,
  getCurrentAnalysisDataset,
  isLocalAnalysisReportCurrent,
  readLocalAnalysisReports,
} from "@/lib/local-analysis-report";
import type { LocalAnalysisReportSnapshot } from "@/lib/local-analysis-snapshot";

export function LocalAnalysisReportCards() {
  const [reports, setReports] = useState<LocalAnalysisReportSnapshot[]>([]);
  const [currentReportIds, setCurrentReportIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    try {
      const nextReports = readLocalAnalysisReports();
      const currentDataset = getCurrentAnalysisDataset();
      setReports(nextReports);
      setCurrentReportIds(
        new Set(
          nextReports
            .filter((report) =>
              isLocalAnalysisReportCurrent(report, currentDataset),
            )
            .map((report) => report.id),
        ),
      );
    } catch {
      setReports([]);
      setCurrentReportIds(new Set());
    }
  }, []);

  if (reports.length === 0) return null;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {reports.map((report) => (
        <Card
          key={report.id}
          className={`flex h-full flex-col ${currentReportIds.has(report.id) ? "border-success/35" : "border-warning/40"}`}
        >
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText
                    aria-hidden="true"
                    className="h-5 w-5 text-primary"
                  />
                  {report.title}
                </CardTitle>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {report.summary}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={
                    currentReportIds.has(report.id) ? "success" : "warning"
                  }
                >
                  {currentReportIds.has(report.id)
                    ? "ข้อมูลปัจจุบัน"
                    : "ผลลัพธ์ล้าสมัย"}
                </Badge>
                <Badge variant="outline">{report.moduleLabel}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid flex-1 gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Metric
                label="สร้างเมื่อ"
                value={new Date(report.createdAt).toLocaleDateString("th-TH")}
              />
              <Metric
                label="บิลต้นทาง"
                value={`${report.sourceBill.monthCount} เดือน`}
              />
              <Metric
                label="คุณภาพข้อมูล"
                value={report.sourceBill.dataQualityLabel}
              />
            </div>
            {report.sourceProfile ? (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
                <p className="font-semibold">
                  Load Profile: {report.sourceProfile.name}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {report.sourceProfile.sourceKind} ·{" "}
                  {report.sourceProfile.intervalCount.toLocaleString("th-TH")}{" "}
                  ช่วงข้อมูล · {report.sourceProfile.qualityLevel}
                </p>
                {report.billCalibration ? (
                  <p className="mt-2 text-muted-foreground">
                    เปรียบเทียบกับบิล{" "}
                    {report.billCalibration.comparedMonthCount} เดือน, ส่วนต่าง{" "}
                    {report.billCalibration.varianceKwh.toLocaleString("th-TH")}{" "}
                    kWh
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <a
                className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring"
                href={`/analysis/reports/${report.id}`}
              >
                เปิดรายงานนี้
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
              <button
                className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={() => {
                  deleteLocalAnalysisReport(report.id);
                  setReports((current) =>
                    current.filter((item) => item.id !== report.id),
                  );
                }}
                type="button"
              >
                ลบรายงาน
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/35 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
