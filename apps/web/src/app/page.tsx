import {
  ArrowRight,
  Database,
  FileText,
  LineChart,
  ShieldCheck
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MainNav } from "@/components/main-nav";
import { scenarioPreviewRows, workflowSteps } from "@/lib/demo-data";
import { Reveal } from "@/components/reveal";

export default function Home() {
  return (
    <main className="min-h-screen selection:bg-primary selection:text-primary-foreground">
      <MainNav />

      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28 bg-white">
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center text-center gap-10 px-4 md:px-6">
          <div className="flex flex-col items-center justify-center gap-8 w-full max-w-4xl">
            <Reveal width="100%" delay={0.1}>
              <div className="flex flex-wrap justify-center gap-3">
                <Badge className="bg-orange-100 text-orange-600 hover:bg-orange-200 border-none px-4 py-1.5 text-sm">Phase 1 Foundation</Badge>
                <Badge variant="outline" className="border-slate-200 text-slate-600 px-4 py-1.5 text-sm bg-white">ภาษาไทย</Badge>
                <Badge variant="outline" className="border-slate-200 text-slate-600 px-4 py-1.5 text-sm bg-white">Config-driven tariff</Badge>
              </div>
            </Reveal>

            <Reveal width="100%" delay={0.2}>
              <div className="space-y-6">
                <h1 className="text-5xl font-extrabold leading-[1.2] tracking-tight text-slate-900 md:text-6xl lg:text-7xl">
                  Thai Energy Planner<br />
                  <span className="text-primary text-3xl md:text-4xl block mt-4">เว็บไซต์สำหรับระบบวิเคราะห์การใช้ไฟฟ้าและความคุ้มค่าด้านพลังงานสำหรับบ้านและกิจการขนาดเล็กในประเทศไทย</span>
                </h1>
              </div>
            </Reveal>

            <Reveal width="100%" delay={0.3}>
              <div className="flex flex-col gap-4 sm:flex-row justify-center mt-6 w-full">
                <a
                  className="group relative inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(249,115,22,0.3)] focus:outline-none focus:ring-2 focus:ring-ring"
                  href="/estimate"
                >
                  โซลูชันสำหรับผู้ใช้เริ่มต้น
                  <ArrowRight aria-hidden="true" className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </a>
                <a
                  className="group relative inline-flex h-14 items-center justify-center gap-2 rounded-full bg-slate-900 px-8 text-base font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(15,23,42,0.3)] focus:outline-none focus:ring-2 focus:ring-slate-900"
                  href="/analysis/solar"
                >
                  โซลูชันสำหรับผู้เชี่ยวชาญ
                  <ArrowRight aria-hidden="true" className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal width="100%" delay={0.5}>
            <div className="mt-8 w-full overflow-hidden rounded-3xl shadow-2xl border border-slate-200">
              <video 
                className="w-full h-auto aspect-video object-cover bg-slate-100"
                autoPlay 
                loop 
                muted 
                playsInline
                poster="https://images.unsplash.com/photo-1509391366360-51569625f442?q=80&w=2000&auto=format&fit=crop"
              >
                {/* High-quality video showcase */}
                <source src="/hero-video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="workflow" className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 lg:py-24">
        <Reveal width="100%">
          <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-2">Analysis Wizard</p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">ขั้นตอนการวิเคราะห์ที่เตรียมไว้</h2>
            </div>
            <p className="max-w-xl text-base leading-relaxed text-slate-600">
              Phase 1 สร้างโครงหน้าและ navigation สำหรับ workflow ครบเส้นทาง ก่อนเติม engine รายละเอียดในเฟสถัดไป
            </p>
          </div>
        </Reveal>
        
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {workflowSteps.map((step, idx) => (
            <Reveal key={step.title} width="100%" delay={idx * 0.1}>
              <Card className="group h-full border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20">
                <CardContent className="flex h-full flex-col gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <step.icon aria-hidden="true" className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">{step.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="scenarios" className="border-y border-slate-200 bg-slate-50 relative overflow-hidden">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 lg:py-24">
          <Reveal width="100%">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
                <LineChart aria-hidden="true" className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">ตัวอย่างตารางเปรียบเทียบสถานการณ์</h2>
            </div>
          </Reveal>
          
          <Reveal width="100%" delay={0.2}>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xl">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold">สถานการณ์</th>
                    <th className="px-6 py-4 font-semibold">ค่าไฟ/เดือน</th>
                    <th className="px-6 py-4 font-semibold">ลงทุน</th>
                    <th className="px-6 py-4 font-semibold">ประหยัด/ปี</th>
                    <th className="px-6 py-4 font-semibold">Payback</th>
                    <th className="px-6 py-4 font-semibold">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scenarioPreviewRows.map((row) => (
                    <tr key={row.name} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{row.name}</td>
                      <td className="px-6 py-4 text-slate-700">{row.monthlyCost}</td>
                      <td className="px-6 py-4 text-slate-700">{row.investment}</td>
                      <td className="px-6 py-4 text-emerald-600 font-medium">{row.annualSaving}</td>
                      <td className="px-6 py-4 text-primary font-medium">{row.payback}</td>
                      <td className="px-6 py-4 text-slate-500">{row.note}</td>
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
    <Card id={id} className="h-full border-slate-200 bg-white transition-all hover:bg-slate-50 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20">
      <CardContent className="p-6">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-primary">
          <Icon aria-hidden="true" className="h-6 w-6" />
        </div>
        <h3 className="font-semibold text-xl text-slate-900 mb-3">{title}</h3>
        <p className="text-base leading-relaxed text-slate-600">{text}</p>
      </CardContent>
    </Card>
  );
}
