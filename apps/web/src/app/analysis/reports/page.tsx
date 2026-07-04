import { ArrowRight, FileText, Printer, ShieldCheck } from "lucide-react";
import { defaultReportManifest } from "@thai-energy-planner/report-engine";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainNav } from "@/components/main-nav";
import { LocalReportCard } from "./local-report-card";

const reports = [
  {
    id: "demo-id-1",
    name: "Solar feasibility demo",
    createdAt: "2026-07-05T09:00:00+07:00",
    status: "พร้อมดูตัวอย่าง",
    tariffVersion: "demo-phase2-draft",
    summary: "รายงานตัวอย่างที่แสดง input, assumptions, scenario comparison, recommendations และ disclaimer"
  }
];

const reportReadiness = [
  { label: "Input summary", done: true },
  { label: "Tariff snapshot", done: true },
  { label: "Assumptions", done: true },
  { label: "Recommendations", done: true },
  { label: "PDF/CSV/JSON export", done: false }
];

export default function AnalysisReportsPage() {
  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="flex flex-wrap gap-2">
          <Badge>Reports</Badge>
          <Badge variant="outline">ส่งต่อผลวิเคราะห์</Badge>
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">รายงานผลวิเคราะห์</h1>
            <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
              จุดนี้คือหน้ารวมรายงานสำหรับส่งให้คนอื่นดู ตอนนี้มีรายงานตัวอย่างและโครงสร้างที่ต้องมี
              ขั้นถัดไปจะต่อข้อมูลจริงจาก workflow ที่ผู้ใช้กรอกเข้ามา
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck aria-hidden="true" className="h-5 w-5 text-primary" />
                Report manifest
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {defaultReportManifest.formats.map((format) => (
                  <Badge key={format} variant="outline">
                    {format.toUpperCase()}
                  </Badge>
                ))}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                รายงานต้องมี {defaultReportManifest.requiredSections.length} ส่วนหลัก เช่น input, tariff source,
                assumptions, results, recommendations และ disclaimer
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4">
            <LocalReportCard />
            {reports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText aria-hidden="true" className="h-5 w-5 text-primary" />
                        {report.name}
                      </CardTitle>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{report.summary}</p>
                    </div>
                    <Badge variant="success">{report.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <Metric label="วันที่สร้าง" value={new Date(report.createdAt).toLocaleDateString("th-TH")} />
                    <Metric label="Tariff" value={report.tariffVersion} />
                    <Metric label="ภาษา" value={defaultReportManifest.locale} />
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <a
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring"
                      href={`/analysis/reports/${report.id}`}
                    >
                      ดูรายงาน
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </a>
                    <a
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                      href="/analysis/new"
                    >
                      เริ่มวิเคราะห์ใหม่
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer aria-hidden="true" className="h-5 w-5 text-primary" />
                ความพร้อมรายงาน
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {reportReadiness.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                  <span className="text-sm font-medium">{item.label}</span>
                  <Badge variant={item.done ? "success" : "warning"}>{item.done ? "พร้อม" : "ถัดไป"}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
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
