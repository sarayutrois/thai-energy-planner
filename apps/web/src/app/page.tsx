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
import { Reveal } from "@/components/reveal";

const billSummary = summarizeMonthlyBills(demoBills);
const dataQuality = estimateDataQuality({
  hasTwelveMonthBills: true,
  intervalMonths: 0,
  source: "bill"
});

export default function Home() {
  return (
    <main className="min-h-screen selection:bg-primary selection:text-primary-foreground">
      <MainNav />

      <section className="relative overflow-hidden border-b border-white/5 bg-background/50 pt-16 pb-20 lg:pt-24 lg:pb-28">
        {/* Background glow effects */}
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px]" />
        
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 md:grid-cols-[1.1fr_0.9fr] md:px-6">
          <div className="flex flex-col justify-center gap-8">
            <Reveal width="100%" delay={0.1}>
              <div className="flex flex-wrap gap-3">
                <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none px-3 py-1">Phase 1 Foundation</Badge>
                <Badge variant="outline" className="border-white/10 text-white/70 px-3 py-1">ภาษาไทย</Badge>
                <Badge variant="outline" className="border-white/10 text-white/70 px-3 py-1">Config-driven tariff</Badge>
              </div>
            </Reveal>

            <Reveal width="100%" delay={0.2}>
              <div className="space-y-6">
                <h1 className="max-w-3xl text-5xl font-bold leading-[1.15] tracking-tight text-white md:text-6xl">
                  Thai <span className="text-gradient">Energy</span> Planner
                </h1>
                <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                  ระบบวิเคราะห์การใช้ไฟฟ้าและความคุ้มค่าด้านพลังงานสำหรับบ้านและกิจการขนาดเล็กในประเทศไทย
                </p>
              </div>
            </Reveal>

            <Reveal width="100%" delay={0.3}>
              <div className="flex flex-col gap-4 sm:flex-row mt-4">
                <a
                  className="group relative inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(0,170,255,0.4)] focus:outline-none focus:ring-2 focus:ring-ring"
                  href="/estimate"
                >
                  สำหรับผู้ใช้ทั่วไป
                  <ArrowRight aria-hidden="true" className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </a>
                <a
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 text-base font-medium text-white transition-all duration-300 hover:bg-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-ring"
                  href="/analysis/solar"
                >
                  สำหรับผู้เชี่ยวชาญ
                </a>
              </div>
            </Reveal>

            <Reveal width="100%" delay={0.4}>
              <div className="grid gap-4 sm:grid-cols-3 mt-4">
                <Metric label="ค่าไฟตัวอย่าง" value={formatBaht(billSummary.totalCost)} unit="บาท/ปี" />
                <Metric label="หน่วยรวม" value={formatNumber(billSummary.totalKwh)} unit="kWh/ปี" />
                <Metric label="คุณภาพข้อมูล" value={dataQuality.labelTh} unit={dataQuality.score.toString()} />
              </div>
            </Reveal>
          </div>

          <div className="flex items-center">
            <Reveal width="100%" delay={0.5} direction="left">
              <Card className="glass-panel w-full border-none shadow-2xl relative">
                {/* Decorative glowing dot */}
                <div className="absolute -top-3 -right-3 h-20 w-20 bg-primary/30 blur-2xl rounded-full" />
                
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="text-xl font-semibold text-white">ภาพรวมการวิเคราะห์</CardTitle>
                    <Badge className="bg-success/20 text-success border-success/30">พร้อมต่อยอด</Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <StatusTile icon={Zap} label="Normal / TOU" value="รออัตราที่ตรวจสอบแล้ว" tone="blue" />
                    <StatusTile icon={SunMedium} label="Solar" value="เตรียมโมเดล interval" tone="green" />
                    <StatusTile icon={BatteryCharging} label="Battery" value="อยู่หลัง feature flag" tone="amber" />
                    <StatusTile icon={PlugZap} label="EV Charging" value="เตรียม scenario" tone="blue" />
                  </div>
                  <div className="rounded-xl border border-white/5 bg-black/40 p-5 mt-2">
                    <p className="text-sm font-semibold text-white">อัตราที่ใช้ในการคำนวณ</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {tariffSeedPolicy.displayRequiredFields.join(" • ")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 lg:py-24">
        <Reveal width="100%">
          <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-2">Analysis Wizard</p>
              <h2 className="text-3xl font-bold tracking-tight text-white">ขั้นตอนการวิเคราะห์ที่เตรียมไว้</h2>
            </div>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              Phase 1 สร้างโครงหน้าและ navigation สำหรับ workflow ครบเส้นทาง ก่อนเติม engine รายละเอียดในเฟสถัดไป
            </p>
          </div>
        </Reveal>
        
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {workflowSteps.map((step, idx) => (
            <Reveal key={step.title} width="100%" delay={idx * 0.1}>
              <Card className="group h-full border-white/5 bg-card/50 transition-all duration-300 hover:bg-card hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 hover:border-white/10">
                <CardContent className="flex h-full flex-col gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <step.icon aria-hidden="true" className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white mb-2">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="scenarios" className="border-y border-white/5 bg-background/50 relative overflow-hidden">
        <div className="pointer-events-none absolute right-0 bottom-0 -z-10 h-[500px] w-[500px] translate-x-1/3 translate-y-1/3 rounded-full bg-primary/10 blur-[100px]" />
        
        <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 lg:py-24">
          <Reveal width="100%">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <LineChart aria-hidden="true" className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white">ตัวอย่างตารางเปรียบเทียบสถานการณ์</h2>
            </div>
          </Reveal>
          
          <Reveal width="100%" delay={0.2}>
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-card/40 backdrop-blur-sm shadow-xl">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-black/40 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-semibold">สถานการณ์</th>
                    <th className="px-6 py-4 font-semibold">ค่าไฟ/เดือน</th>
                    <th className="px-6 py-4 font-semibold">ลงทุน</th>
                    <th className="px-6 py-4 font-semibold">ประหยัด/ปี</th>
                    <th className="px-6 py-4 font-semibold">Payback</th>
                    <th className="px-6 py-4 font-semibold">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {scenarioPreviewRows.map((row) => (
                    <tr key={row.name} className="transition-colors hover:bg-white/5">
                      <td className="px-6 py-4 font-medium text-white">{row.name}</td>
                      <td className="px-6 py-4">{row.monthlyCost}</td>
                      <td className="px-6 py-4">{row.investment}</td>
                      <td className="px-6 py-4 text-success">{row.annualSaving}</td>
                      <td className="px-6 py-4 text-primary">{row.payback}</td>
                      <td className="px-6 py-4 text-muted-foreground">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      <section
        id="solar"
        className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-16 md:grid-cols-3 md:px-6 lg:py-24"
      >
        <Reveal width="100%" delay={0.1}>
          <FoundationCard
            icon={Database}
            title="Tariff Snapshot"
            text="ทุก analysis run จะบันทึก tariff version และ snapshot เพื่อให้ผลเดิม reproduce ได้เมื่อมีอัตราใหม่"
          />
        </Reveal>
        <Reveal width="100%" delay={0.2}>
          <FoundationCard
            icon={ShieldCheck}
            title="Privacy-ready"
            text="รองรับโหมดทดลองใน browser, server-side validation, audit log และการแยกข้อมูลตาม user/organization"
          />
        </Reveal>
        <Reveal width="100%" delay={0.3}>
          <FoundationCard
            id="reports"
            icon={FileText}
            title="Report-ready"
            text="เตรียม manifest สำหรับ PDF, CSV, JSON และ print-friendly report พร้อมแหล่งข้อมูลอัตราค่าไฟ"
          />
        </Reveal>
      </section>
    </main>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-card/40 backdrop-blur-sm p-5 transition-transform hover:-translate-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm font-medium text-primary">{unit}</p>
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
    blue: "bg-primary/10 text-primary border-primary/20",
    green: "bg-success/10 text-success border-success/20",
    amber: "bg-warning/10 text-warning border-warning/20"
  };

  return (
    <div className={`rounded-xl border p-4 transition-all hover:bg-white/5 ${tones[tone]}`}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-black/20">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{value}</p>
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
    <Card id={id} className="h-full border-white/5 bg-card/50 transition-all hover:bg-card hover:-translate-y-1 hover:shadow-xl hover:border-white/10">
      <CardContent className="p-6">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="h-6 w-6" />
        </div>
        <h3 className="font-semibold text-xl text-white mb-3">{title}</h3>
        <p className="text-base leading-relaxed text-muted-foreground">{text}</p>
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
