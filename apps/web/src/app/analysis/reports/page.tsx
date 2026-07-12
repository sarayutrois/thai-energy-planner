import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainNav } from "@/components/main-nav";
import { LocalAnalysisReportCards } from "./local-analysis-report-cards";
import { LocalReportCard } from "./local-report-card";
import { ReportReadinessPanel } from "./report-readiness-panel";

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
                รูปแบบรายงานที่ระบบรองรับ
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {['PDF', 'CSV', 'JSON', 'Print'].map((format) => <Badge key={format} variant="outline">{format}</Badge>)}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                โปรแกรมรองรับการส่งออก PDF, CSV, JSON และการพิมพ์ เมื่อมีรายงานที่บันทึกจากข้อมูลจริงแล้ว
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4">
            <LocalReportCard />
            <LocalAnalysisReportCards />
          </div>

          <ReportReadinessPanel />
        </div>
      </section>
    </main>
  );
}
