import { BarChart3, CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import { createReportFileName } from "@thai-energy-planner/report-engine";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainNav } from "@/components/main-nav";
import { ReportActions } from "./report-actions";

const savedReportPreview = {
  title: "Solar feasibility demo",
  createdAt: "2026-07-05T09:00:00+07:00",
  engineVersion: "0.1.0",
  executiveSummary:
    "รายงานตัวอย่างนี้แสดงโครงสร้างสำหรับส่งต่อผลวิเคราะห์ โดยใช้ snapshot เดิมของ tariff และ assumptions เพื่อให้ผลย้อนหลังตรวจสอบได้",
  tariffSnapshot: {
    versionLabel: "demo-phase2-draft",
    status: "DRAFT",
    source: "Synthetic demo tariff for engine validation",
    effectiveFrom: "2026-01-01",
    capturedAt: "2026-07-05T09:00:00+07:00"
  },
  assumptions: [
    { label: "ข้อมูลบิล", value: "ใช้ตัวอย่างบิลย้อนหลังจาก demo dataset" },
    { label: "Tariff", value: "ยังเป็น demo draft ไม่ใช่อัตราทางการ" },
    { label: "Solar", value: "ใช้ profile ตัวอย่างและสมมติฐานการลงทุนเบื้องต้น" }
  ],
  scenarioRows: [
    { name: "Current Normal", monthlyBill: "4,500 บาท", annualBill: "54,000 บาท", savings: "-" },
    { name: "TOU + Solar 5 kWp", monthlyBill: "2,800 บาท", annualBill: "33,600 บาท", savings: "20,400 บาท (37%)" }
  ],
  recommendation:
    "ใช้รายงานนี้เป็นตัวอย่างรูปแบบการสื่อสารก่อน ต่อไปควรเชื่อมข้อมูลจริงจาก guided bill workflow และ tariff ที่ตรวจสอบแล้ว"
};

export default async function AnalysisReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fileName = createReportFileName(savedReportPreview.title, "2026-07-05", "pdf");
  const tariffSnapshot = savedReportPreview.tariffSnapshot;

  return (
    <main className="min-h-screen bg-background">
      <MainNav />
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:py-10">
        <div className="mb-5 flex flex-wrap gap-2 print:hidden">
          <Badge>Report Preview</Badge>
          <Badge variant="outline">{id}</Badge>
          <Badge variant="warning">Demo data</Badge>
        </div>

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between print:hidden">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">รายงานตัวอย่าง</h1>
            <p className="mt-2 max-w-3xl leading-7 text-muted-foreground">
              โครงรายงานสำหรับส่งต่อให้ลูกค้า ทีม หรือใช้แนบการตัดสินใจลงทุน
            </p>
          </div>
          <ReportActions />
        </div>

        <article className="rounded-md border border-border bg-card p-5 shadow-panel print:border-none print:shadow-none">
          <header className="border-b border-border pb-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <FileText aria-hidden="true" className="h-5 w-5" />
                </div>
                <h2 className="text-3xl font-semibold tracking-normal">{savedReportPreview.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  สร้างเมื่อ {new Date(savedReportPreview.createdAt).toLocaleString("th-TH")}
                </p>
              </div>
              <div className="rounded-md border border-border bg-muted/35 p-4 text-sm">
                <p className="font-medium">Engine version</p>
                <p className="mt-1 text-muted-foreground">{savedReportPreview.engineVersion}</p>
                <p className="mt-3 font-medium">Filename</p>
                <p className="mt-1 text-muted-foreground">{fileName}</p>
              </div>
            </div>
          </header>

          <section className="grid gap-5 py-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-success" />
                  Executive summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-7 text-muted-foreground">{savedReportPreview.executiveSummary}</p>
              </CardContent>
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck aria-hidden="true" className="h-5 w-5 text-primary" />
                    Tariff snapshot
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <InfoRow label="Version" value={tariffSnapshot.versionLabel} />
                  <InfoRow label="Status" value={tariffSnapshot.status} />
                  <InfoRow label="Source" value={tariffSnapshot.source} />
                  <InfoRow label="Effective from" value={tariffSnapshot.effectiveFrom} />
                  <InfoRow label="Captured at" value={new Date(tariffSnapshot.capturedAt).toLocaleString("th-TH")} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Assumptions</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {savedReportPreview.assumptions.map((item) => (
                    <InfoRow key={item.label} label={item.label} value={item.value} />
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 aria-hidden="true" className="h-5 w-5 text-primary" />
                  Scenario comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Scenario</th>
                        <th className="px-3 py-2 font-medium">ค่าไฟเฉลี่ย/เดือน</th>
                        <th className="px-3 py-2 font-medium">ค่าไฟ/ปี</th>
                        <th className="px-3 py-2 font-medium">ประหยัด</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedReportPreview.scenarioRows.map((row, index) => (
                        <tr key={row.name} className={index === 1 ? "border-t border-border bg-success/10" : "border-t border-border"}>
                          <td className="px-3 py-2 font-medium">{row.name}</td>
                          <td className="px-3 py-2">{row.monthlyBill}</td>
                          <td className="px-3 py-2">{row.annualBill}</td>
                          <td className="px-3 py-2">{row.savings}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/40 bg-primary/5">
              <CardHeader>
                <CardTitle>Recommendation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-7 text-foreground">{savedReportPreview.recommendation}</p>
              </CardContent>
            </Card>

            <p className="border-t border-border pt-4 text-center text-xs leading-6 text-muted-foreground">
              ผลลัพธ์เป็นการประเมินจากข้อมูลและสมมติฐานที่ให้ไว้ ผลจริงอาจเปลี่ยนตามพฤติกรรม สภาพอากาศ ราคาอุปกรณ์
              และ tariff ในอนาคต รายงาน demo นี้ยังไม่ใช่ใบเสนอราคาหรือคำยืนยันทางการ
            </p>
          </section>
        </article>
      </section>
    </main>
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
