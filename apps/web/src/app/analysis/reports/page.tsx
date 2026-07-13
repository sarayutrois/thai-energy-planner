import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocalAnalysisReportCards } from "./local-analysis-report-cards";
import { LocalReportCard } from "./local-report-card";
import { ReportReadinessPanel } from "./report-readiness-panel";
import { PageHeader } from "@/components/ui/page-layout";

export default function AnalysisReportsPage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <PageHeader
          eyebrow="ผลลัพธ์ · รายงาน"
          title="รายงานผลวิเคราะห์"
          description="รวมรายงานที่สร้างจากบิลและผลวิเคราะห์ที่บันทึกไว้ หากยังไม่มีรายงาน ให้เริ่มจากเพิ่มบิลหรือวิเคราะห์ค่าไฟและ Solar ก่อน"
        />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h2 className="text-xl font-semibold">รายงานที่บันทึกไว้</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              รายงานจะแสดงเฉพาะผลที่มีข้อมูลต้นทางและสมมติฐานย้อนหลังได้
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck
                  aria-hidden="true"
                  className="h-5 w-5 text-primary"
                />
                รูปแบบรายงานที่ระบบรองรับ
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {["PDF", "CSV", "JSON", "Print"].map((format) => (
                  <Badge key={format} variant="outline">
                    {format}
                  </Badge>
                ))}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                โปรแกรมรองรับการส่งออก PDF, CSV, JSON และการพิมพ์
                เมื่อมีรายงานที่บันทึกจากข้อมูลจริงแล้ว
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
