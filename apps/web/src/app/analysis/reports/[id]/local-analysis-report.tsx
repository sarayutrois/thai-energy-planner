"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  FileText,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteLocalAnalysisReport,
  getCurrentAnalysisDataset,
  isLocalAnalysisReportCurrent,
  readLocalAnalysisReport,
} from "@/lib/local-analysis-report";
import { solarReadinessCopy } from "@/lib/solar-readiness-copy";
import type { LocalAnalysisReportSnapshot } from "@/lib/local-analysis-snapshot";
import { ReportActions } from "./report-actions";

export function LocalAnalysisReport({ id }: { id: string }) {
  const [report, setReport] = useState<LocalAnalysisReportSnapshot | null>(
    null,
  );
  const [loaded, setLoaded] = useState(false);
  const [isCurrent, setIsCurrent] = useState(false);

  useEffect(() => {
    try {
      const nextReport = readLocalAnalysisReport(id);
      setReport(nextReport);
      setIsCurrent(
        nextReport
          ? isLocalAnalysisReportCurrent(
              nextReport,
              getCurrentAnalysisDataset(),
            )
          : false,
      );
    } catch {
      setReport(null);
    } finally {
      setLoaded(true);
    }
  }, [id]);

  if (!loaded) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          กำลังโหลดรายงานจากเซสชัน...
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="border-warning">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
            ไม่พบรายงาน analysis ในเครื่องนี้
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm leading-6 text-muted-foreground">
            รายงาน local อาจถูกลบจากเซสชันแล้ว ให้กลับไปหน้า result ที่เริ่มจาก
            saved bills แล้วกดบันทึกเป็นรายงานใหม่
          </p>
          <Link
            className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring"
            href="/analysis/reports"
          >
            กลับหน้ารายงาน
          </Link>
        </CardContent>
      </Card>
    );
  }

  const isSolarReport = report.module === "solar";
  const pdfLabel = isSolarReport ? solarReadinessCopy.pdfCta : undefined;

  return (
    <article
      className="rounded-md border border-border bg-card p-5 shadow-panel print:border-none print:shadow-none"
      id="analysis-report-pdf"
    >
      <header className="border-b border-border pb-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FileText aria-hidden="true" className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {report.reportTitle ?? report.moduleLabel}
            </p>
            <h2 className="mt-1 text-3xl font-semibold tracking-normal">
              {report.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              สร้างเมื่อ {new Date(report.createdAt).toLocaleString("th-TH")} ·{" "}
              {report.moduleLabel}
            </p>
            <Badge className="mt-3" variant={isCurrent ? "success" : "warning"}>
              {isCurrent ? "ข้อมูลปัจจุบัน" : "ผลลัพธ์ล้าสมัย"}
            </Badge>
            {report.sourceProfile?.isSample ? (
              <Badge className="ml-2 mt-3" variant="warning">
                Sample data
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 print:hidden" data-pdf-exclude>
            {isCurrent ? (
              <ReportActions
                csvRows={report.resultRows}
                fileBaseName={report.id}
                jsonData={report}
                pdfLabel={pdfLabel}
                pdfTargetId="analysis-report-pdf"
              />
            ) : null}
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
              onClick={() => {
                deleteLocalAnalysisReport(report.id);
                window.location.href = "/analysis/reports";
              }}
              type="button"
            >
              ลบรายงาน
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-5 py-5">
        {!isCurrent ? (
          <Card className="border-warning bg-warning/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle
                  aria-hidden="true"
                  className="h-5 w-5 text-warning"
                />
                ต้องคำนวณผลใหม่ก่อนส่งออก
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-warning-foreground">
                ข้อมูลบิลหรือ Load Profile เปลี่ยนหลังจากสร้างรายงานนี้
                จึงปิดการส่งออกเพื่อป้องกันการใช้ตัวเลขที่ไม่ตรงกับข้อมูลปัจจุบัน
              </p>
            </CardContent>
          </Card>
        ) : null}
        {report.disclaimer ? (
          <Card className="border-warning bg-warning/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle
                  aria-hidden="true"
                  className="h-5 w-5 text-warning"
                />
                คำเตือนก่อนใช้รายงาน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-warning-foreground">
                {report.disclaimer}
              </p>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Executive summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-7 text-muted-foreground">{report.summary}</p>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-4">
          {report.metrics.map((metric) => (
            <Metric
              key={metric.label}
              label={metric.label}
              value={metric.value}
            />
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText
                  aria-hidden="true"
                  className="h-5 w-5 text-primary"
                />
                Saved bill source
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <InfoRow
                label="ประเภทผู้ใช้"
                value={report.sourceBill.audience}
              />
              <InfoRow
                label="จำนวนเดือน"
                value={`${report.sourceBill.monthCount}`}
              />
              <InfoRow
                label="ใช้ไฟรวม"
                value={`${formatNumber(report.sourceBill.totalKwh)} kWh`}
              />
              <InfoRow
                label="ค่าไฟเฉลี่ย"
                value={`${formatNumber(report.sourceBill.averageMonthlyCostThb)} บาท/เดือน`}
              />
              <InfoRow
                label="คุณภาพข้อมูล"
                value={report.sourceBill.dataQualityLabel}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assumptions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {report.assumptions.map((item) => (
                <InfoRow
                  key={item.label}
                  label={item.label}
                  value={item.value}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        {report.sourceProfile ? (
          <Card className="border-primary/40 bg-primary/5">
            <CardHeader>
              <CardTitle>Canonical load profile source</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <InfoRow label="Load Profile" value={report.sourceProfile.name} />
              <InfoRow
                label="Source / quality"
                value={`${report.sourceProfile.sourceKind} / ${report.sourceProfile.qualityLevel}`}
              />
              <InfoRow
                label="Intervals"
                value={report.sourceProfile.intervalCount.toLocaleString(
                  "th-TH",
                )}
              />
              {report.billCalibration ? (
                <InfoRow
                  label="Bill calibration"
                  value={`${report.billCalibration.comparedMonthCount} months · ${formatNumber(report.billCalibration.varianceKwh)} kWh`}
                />
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {report.sections?.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {section.paragraphs?.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-sm leading-7 text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))}
              {section.items?.map((item) => (
                <InfoRow
                  key={item.label}
                  label={item.label}
                  value={item.value}
                />
              ))}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 aria-hidden="true" className="h-5 w-5 text-primary" />
              Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResultTable rows={report.resultRows} />
          </CardContent>
        </Card>

        {report.references?.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Assumptions & References</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {report.references.map((item) => (
                <InfoRow
                  key={item.label}
                  label={item.label}
                  value={item.value}
                />
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>คำแนะนำ</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {report.recommendations.map((recommendation) => (
              <div
                key={`${recommendation.title}-${recommendation.nextAction ?? ""}`}
                className="rounded-md border border-border p-4"
              >
                <Badge variant="outline">คำแนะนำ</Badge>
                <p className="mt-3 font-semibold">{recommendation.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {recommendation.description}
                </p>
                {recommendation.nextAction ? (
                  <p className="mt-2 text-sm font-medium">
                    {recommendation.nextAction}
                  </p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        {report.limitations?.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Limitations & Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {report.limitations.map((item) => (
                <div
                  key={`${item.title}-${item.nextAction ?? ""}`}
                  className="rounded-md border border-border p-4"
                >
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                  {item.nextAction ? (
                    <p className="mt-2 text-sm font-medium">
                      {item.nextAction}
                    </p>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <p className="border-t border-border pt-4 text-center text-xs leading-6 text-muted-foreground">
          รายงานนี้เป็นรายงานที่บันทึกไว้ในเซสชันนี้ โดยสร้างจาก saved bills,
          tariff snapshot และข้อมูลสำหรับประเมินเบื้องต้น
          ใช้เพื่อสื่อสารเบื้องต้นก่อนตรวจข้อมูลหน้างานและรับใบเสนอราคาทางการ
        </p>
      </section>
    </article>
  );
}

function ResultTable({
  rows,
}: {
  rows: LocalAnalysisReportSnapshot["resultRows"];
}) {
  const headers = Object.keys(rows[0] ?? {});

  if (headers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        ยังไม่มี result rows สำหรับรายงานนี้
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-border">
              {headers.map((header) => (
                <td key={header} className="px-3 py-2">
                  {row[header] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/35 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-normal">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/35 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}
