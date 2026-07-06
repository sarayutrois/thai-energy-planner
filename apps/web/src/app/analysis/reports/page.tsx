import { Printer, ShieldCheck } from "lucide-react";
import { defaultReportManifest } from "@thai-energy-planner/report-engine";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainNav } from "@/components/main-nav";
import { LocalAnalysisReportCards } from "./local-analysis-report-cards";
import { LocalReportCard } from "./local-report-card";

const reportReadiness = [
  { label: "Input summary", done: true },
  { label: "Tariff snapshot", done: true },
  { label: "Assumptions", done: true },
  { label: "Data quality", done: true },
  { label: "Calculation trace", done: true },
  { label: "Limitations", done: true },
  { label: "Recommendations", done: true },
  { label: "Print/JSON/CSV export", done: true },
  { label: "PDF export", done: true }
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
              หน้านี้รวมรายงานที่สร้างจากข้อมูลบิลและผลวิเคราะห์ที่บันทึกไว้ในเซสชันนี้
              ถ้ายังไม่มีรายงาน ให้เริ่มจากเพิ่มบิลหรือรัน Scenario/Solar แล้วกดบันทึกเป็นรายงาน
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
                รายงานต้องมี {defaultReportManifest.requiredSections.length} ส่วนหลัก เช่น input, tariff snapshot,
                assumptions, data quality, calculation trace, limitations, recommendations และ disclaimer
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4">
            <LocalReportCard />
            <LocalAnalysisReportCards />
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
