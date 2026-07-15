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
      className="w-full min-w-0 max-w-full overflow-hidden rounded-md border border-border bg-card p-5 shadow-panel print:border-none print:shadow-none"
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
                ข้อมูลตัวอย่าง
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

      <section className="grid min-w-0 gap-5 py-5">
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

        <Card className="min-w-0 max-w-full overflow-hidden border-2 border-primary/35 bg-primary/[0.04]">
          <CardHeader>
            <CardTitle>คำตอบสำคัญจากการวิเคราะห์</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 max-w-full">
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

        {report.recommendations.length > 0 ? (
          <Card className="border-success/35 bg-success/[0.04]">
            <CardHeader>
              <CardTitle>คำแนะนำที่ควรทำต่อ</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {report.recommendations.map((recommendation, index) => (
                <div
                  key={`${recommendation.title}-${recommendation.nextAction ?? ""}`}
                  className="rounded-md border border-border bg-card p-4"
                >
                  <Badge variant={index === 0 ? "success" : "outline"}>
                    {index === 0 ? "ควรพิจารณาก่อน" : "คำแนะนำเพิ่มเติม"}
                  </Badge>
                  <p className="mt-3 font-semibold">{recommendation.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {recommendation.description}
                  </p>
                  {recommendation.nextAction ? (
                    <p className="mt-2 text-sm font-medium">
                      ขั้นต่อไป: {recommendation.nextAction}
                    </p>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText
                  aria-hidden="true"
                  className="h-5 w-5 text-primary"
                />
                ข้อมูลบิลที่ใช้ในรายงาน
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <InfoRow
                label="ประเภทผู้ใช้"
                value={formatAudience(report.sourceBill.audience)}
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
              <CardTitle>สมมติฐานที่ใช้</CardTitle>
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
              <CardTitle>ข้อมูลการใช้ไฟที่ใช้คำนวณ</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <InfoRow label="Load Profile" value={report.sourceProfile.name} />
              <InfoRow
                label="แหล่งข้อมูล / คุณภาพ"
                value={`${formatProfileSource(report.sourceProfile.sourceKind)} / ${formatQuality(report.sourceProfile.qualityLevel)}`}
              />
              <InfoRow
                label="จำนวนช่วงข้อมูล"
                value={report.sourceProfile.intervalCount.toLocaleString(
                  "th-TH",
                )}
              />
              {report.billCalibration ? (
                <InfoRow
                  label="การเทียบกับบิล"
                  value={`${report.billCalibration.comparedMonthCount} เดือน · ส่วนต่าง ${formatNumber(report.billCalibration.varianceKwh)} kWh`}
                />
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {report.sections?.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{formatSectionTitle(section.title)}</CardTitle>
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

        <Card className="min-w-0 max-w-full overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 aria-hidden="true" className="h-5 w-5 text-primary" />
              ตารางผลการคำนวณ
            </CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 max-w-full">
            <ResultTable rows={report.resultRows} />
          </CardContent>
        </Card>

        {report.references?.length ? (
          <Card>
            <CardHeader>
              <CardTitle>แหล่งอ้างอิงและเงื่อนไข</CardTitle>
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

        {report.limitations?.length ? (
          <Card>
            <CardHeader>
              <CardTitle>ข้อจำกัดและขั้นตอนถัดไป</CardTitle>
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
          รายงานนี้บันทึกไว้ในอุปกรณ์นี้ โดยสร้างจากข้อมูลบิล อัตราค่าไฟ ณ
          วันที่คำนวณ และข้อมูลสำหรับประเมินเบื้องต้น
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
        ยังไม่มีตารางผลการคำนวณสำหรับรายงานนี้
      </p>
    );
  }

  return (
    <div className="min-w-0 max-w-full overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-medium">
                {formatResultHeader(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-border">
              {headers.map((header) => (
                <td key={header} className="px-3 py-2">
                  {formatResultValue(row[header])}
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

const resultHeaderLabels: Record<string, string> = {
  case: "สถานะ",
  plan: "ทางเลือก",
  monthlyBillThb: "ค่าไฟ (บาท/เดือน)",
  annualBillThb: "ค่าไฟ (บาท/ปี)",
  annualSavingsThb: "ประหยัด (บาท/ปี)",
  peakKwh: "ใช้ไฟ Peak (kWh)",
  offPeakKwh: "ใช้ไฟ Off-Peak (kWh)",
  monthlyBillBeforeThb: "ค่าไฟก่อนติดตั้ง (บาท/เดือน)",
  monthlyBillAfterThb: "ค่าไฟหลังติดตั้ง (บาท/เดือน)",
  annualBenefitThb: "ผลประโยชน์รวม (บาท/ปี)",
  systemSizeKwp: "ขนาดระบบ (kWp)",
  panelCount: "จำนวนแผง",
  inverterSizeKw: "ขนาด Inverter (kW)",
  budgetLowThb: "งบต่ำสุด (บาท)",
  budgetHighThb: "งบสูงสุด (บาท)",
  paybackYears: "คืนทุน (ปี)",
  gridImportKwh: "ซื้อไฟจากกริด (kWh)",
  peakDemandKw: "กำลังไฟสูงสุด (kW)",
};

function formatResultHeader(header: string) {
  return (
    resultHeaderLabels[header] ??
    header
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\bThb\b/gi, "บาท")
      .replace(/\bKwh\b/gi, "kWh")
  );
}

function formatResultValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "boolean") return value ? "ใช่" : "ไม่ใช่";
  return String(value);
}

function formatAudience(value: string) {
  if (value === "home") return "บ้านพักอาศัย";
  if (value === "shop") return "ร้านค้า";
  if (value === "business") return "ธุรกิจขนาดเล็ก";
  return value;
}

function formatProfileSource(value: string) {
  if (value === "meter") return "ข้อมูลจากมิเตอร์";
  if (value === "appliance") return "รายการเครื่องใช้ไฟฟ้า";
  if (value === "csv") return "ไฟล์ที่นำเข้า";
  if (value === "demo") return "ข้อมูลตัวอย่าง";
  return value;
}

function formatQuality(value: string) {
  if (value === "measured" || value === "high") return "ข้อมูลวัดจริง / สูง";
  if (value === "modeled" || value === "medium") return "ข้อมูลจำลอง / ปานกลาง";
  if (value === "estimated" || value === "low") return "ข้อมูลประมาณการ / ต่ำ";
  return value;
}

function formatSectionTitle(value: string) {
  if (value === "Executive summary") return "สรุปคำตอบ";
  if (value === "Assumptions") return "สมมติฐาน";
  if (value === "Results") return "ผลการคำนวณ";
  if (value === "Limitations") return "ข้อจำกัด";
  return value;
}
