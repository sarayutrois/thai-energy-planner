import {
  ArrowRight,
  BatteryCharging,
  Database,
  FileText,
  LineChart,
  PlugZap,
  ShieldCheck,
  SunMedium,
  Zap
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { estimateDataQuality, summarizeMonthlyBills } from "@thai-energy-planner/calculation-engine";
import { tariffSeedPolicy } from "@thai-energy-planner/tariff-engine";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainNav } from "@/components/main-nav";
import { demoBills, scenarioPreviewRows, workflowSteps } from "@/lib/demo-data";

const billSummary = summarizeMonthlyBills(demoBills);
const dataQuality = estimateDataQuality({
  hasTwelveMonthBills: true,
  intervalMonths: 0,
  source: "bill"
});

export default function Home() {
  return (
    <main className="min-h-screen">
      <MainNav />

      <section className="border-b border-border bg-white/72">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 md:grid-cols-[1.02fr_0.98fr] md:px-6 lg:py-12">
          <div className="flex flex-col justify-center gap-6">
            <div className="flex flex-wrap gap-2">
              <Badge>Phase 1 Foundation</Badge>
              <Badge variant="outline">ภาษาไทย</Badge>
              <Badge variant="outline">Config-driven tariff</Badge>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-foreground md:text-5xl">
                Thai Energy Planner
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                ระบบวิเคราะห์การใช้ไฟฟ้าและความคุ้มค่าด้านพลังงานสำหรับบ้านและกิจการขนาดเล็กในประเทศไทย
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row mt-2">
              <a
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 text-base font-medium text-primary-foreground transition hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
                href="/estimate"
              >
                สำหรับผู้ใช้ทั่วไป (ประเมินเบื้องต้น)
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </a>
              <a
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-input bg-background px-6 text-base font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                href="/analysis/solar"
              >
                สำหรับผู้เชี่ยวชาญ (วิเคราะห์เชิงลึก)
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="ค่าไฟตัวอย่าง" value={formatBaht(billSummary.totalCost)} unit="บาท/ปี" />
              <Metric label="หน่วยรวม" value={formatNumber(billSummary.totalKwh)} unit="kWh/ปี" />
              <Metric label="คุณภาพข้อมูล" value={dataQuality.labelTh} unit={dataQuality.score.toString()} />
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="shadow-panel">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle>ภาพรวมการวิเคราะห์</CardTitle>
                  <Badge variant="success">พร้อมต่อยอด</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatusTile icon={Zap} label="Normal / TOU" value="รออัตราที่ตรวจสอบแล้ว" tone="blue" />
                  <StatusTile icon={SunMedium} label="Solar" value="เตรียมโมเดล interval" tone="green" />
                  <StatusTile icon={BatteryCharging} label="Battery" value="อยู่หลัง feature flag" tone="amber" />
                  <StatusTile icon={PlugZap} label="EV Charging" value="เตรียม scenario" tone="blue" />
                </div>
                <div className="rounded-md border border-border bg-muted/40 p-4">
                  <p className="text-sm font-medium text-foreground">อัตราที่ใช้ในการคำนวณ</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {tariffSeedPolicy.displayRequiredFields.join(" • ")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-12">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Analysis Wizard</p>
            <h2 className="text-2xl font-semibold tracking-normal">ขั้นตอนการวิเคราะห์ที่เตรียมไว้</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Phase 1 สร้างโครงหน้าและ navigation สำหรับ workflow ครบเส้นทาง ก่อนเติม engine รายละเอียดในเฟสถัดไป
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {workflowSteps.map((step) => (
            <Card key={step.title}>
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                  <step.icon aria-hidden="true" className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="scenarios" className="border-y border-border bg-white/78">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-12">
          <div className="mb-5 flex items-center gap-3">
            <LineChart aria-hidden="true" className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold tracking-normal">ตัวอย่างตารางเปรียบเทียบสถานการณ์</h2>
          </div>
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">สถานการณ์</th>
                  <th className="px-4 py-3 font-medium">ค่าไฟ/เดือน</th>
                  <th className="px-4 py-3 font-medium">ลงทุน</th>
                  <th className="px-4 py-3 font-medium">ประหยัด/ปี</th>
                  <th className="px-4 py-3 font-medium">Payback</th>
                  <th className="px-4 py-3 font-medium">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {scenarioPreviewRows.map((row) => (
                  <tr key={row.name} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3">{row.monthlyCost}</td>
                    <td className="px-4 py-3">{row.investment}</td>
                    <td className="px-4 py-3">{row.annualSaving}</td>
                    <td className="px-4 py-3">{row.payback}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section
        id="solar"
        className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-8 md:grid-cols-3 md:px-6 lg:py-12"
      >
        <FoundationCard
          icon={Database}
          title="Tariff Snapshot"
          text="ทุก analysis run จะบันทึก tariff version และ snapshot เพื่อให้ผลเดิม reproduce ได้เมื่อมีอัตราใหม่"
        />
        <FoundationCard
          icon={ShieldCheck}
          title="Privacy-ready"
          text="รองรับโหมดทดลองใน browser, server-side validation, audit log และการแยกข้อมูลตาม user/organization"
        />
        <FoundationCard
          id="reports"
          icon={FileText}
          title="Report-ready"
          text="เตรียม manifest สำหรับ PDF, CSV, JSON และ print-friendly report พร้อมแหล่งข้อมูลอัตราค่าไฟ"
        />
        <span id="admin" className="sr-only">
          Admin foundation anchor
        </span>
      </section>
    </main>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-normal">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{unit}</p>
    </div>
  );
}

function StatusTile({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "blue" | "green" | "amber";
}) {
  const tones = {
    blue: "bg-primary/10 text-primary",
    green: "bg-success/10 text-success",
    amber: "bg-warning/20 text-warning-foreground"
  };

  return (
    <div className="rounded-md border border-border p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-md ${tones[tone]}`}>
        <Icon aria-hidden="true" className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-medium">{label}</p>
      <p className="mt-1 text-sm text-muted-foreground">{value}</p>
    </div>
  );
}

function FoundationCard({
  id,
  icon: Icon,
  title,
  text
}: {
  id?: string;
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <Card id={id}>
      <CardContent className="p-5">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(value);
}

function formatBaht(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(value);
}
