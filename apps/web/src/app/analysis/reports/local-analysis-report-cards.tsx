"use client";

import { useEffect, useState } from "react";
import { ArrowRight, FileText, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteLocalAnalysisReport,
  readLocalAnalysisReports,
} from "@/lib/local-analysis-report";
import type { LocalAnalysisReportSnapshot } from "@/lib/local-analysis-snapshot";

export function LocalAnalysisReportCards() {
  const [reports, setReports] = useState<LocalAnalysisReportSnapshot[]>([]);

  useEffect(() => {
    try {
      setReports(readLocalAnalysisReports());
    } catch {
      setReports([]);
    }
  }, []);

  if (reports.length === 0) return null;

  return (
    <>
      {reports.map((report) => (
        <Card key={report.id}>
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
                <Badge variant="success">Local</Badge>
                <Badge variant="outline">{report.moduleLabel}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
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
                  Canonical profile: {report.sourceProfile.name}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {report.sourceProfile.sourceKind} ·{" "}
                  {report.sourceProfile.intervalCount.toLocaleString("th-TH")}{" "}
                  intervals · {report.sourceProfile.qualityLevel}
                </p>
                {report.billCalibration ? (
                  <p className="mt-2 text-muted-foreground">
                    Bill calibration:{" "}
                    {report.billCalibration.comparedMonthCount} months, variance{" "}
                    {report.billCalibration.varianceKwh.toLocaleString("th-TH")}{" "}
                    kWh
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <a
                className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring"
                href={`/analysis/reports/${report.id}`}
              >
                เปิดรายงานนี้
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
              <button
                className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
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
    </>
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
