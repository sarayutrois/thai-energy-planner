import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  ReceiptText,
  ShieldCheck,
  SunMedium,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { HeroBackgroundVideo } from "@/components/hero-background-video";

const journeys = [
  {
    href: "/analysis/load-data/appliances",
    icon: Wrench,
    title: "สร้าง Load Profile",
    text: "ระบุเครื่องใช้ไฟฟ้า กำลังไฟ และช่วงเวลาใช้งาน เพื่อดูโหลด 24 ชั่วโมง",
    step: "ทำก่อน",
    featured: true,
  },
  {
    href: "/analysis/load-data/import",
    icon: FileSpreadsheet,
    title: "หรือ นำเข้าข้อมูลมิเตอร์",
    text: "อัปโหลด CSV หรือ XLSX ที่มีข้อมูลราย 15, 30 หรือ 60 นาที",
    step: "ถ้ามีไฟล์",
    featured: false,
  },
  {
    href: "/analysis/load-data/bills",
    icon: ReceiptText,
    title: "เพิ่มข้อมูลจากบิลภายหลัง",
    text: "ใช้หน่วยไฟและค่าไฟย้อนหลังปรับ Load Profile ให้ใกล้เคียงการใช้จริงมากขึ้น",
    step: "ขั้นเสริม",
    featured: false,
  },
];

const workflow = [
  "เลือกเป้าหมาย",
  "สร้างรูปแบบการใช้ไฟ",
  "เพิ่มบิลเพื่อปรับความแม่นยำ",
  "ดูคำแนะนำและรายงาน",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <section className="relative isolate overflow-hidden border-b border-white/10 bg-slate-950 text-white">
        <HeroBackgroundVideo />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(2,6,23,0.82)_0%,rgba(2,6,23,0.64)_48%,rgba(2,6,23,0.46)_100%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(2,6,23,0.58)_0%,transparent_45%,rgba(2,6,23,0.22)_100%)]" />
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 md:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:py-24">
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap gap-2">
              <Badge>Thai Energy Planner</Badge>
              <Badge
                className="border-white/25 bg-black/25 text-white backdrop-blur-md"
                variant="outline"
              >
                สำหรับเจ้าของบ้าน
              </Badge>
            </div>
            <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[1.08] tracking-[-0.045em] text-white drop-shadow-lg md:text-6xl">
              เข้าใจค่าไฟ แล้วตัดสินใจเรื่องพลังงานได้ชัดขึ้น
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/80 md:text-lg">
              สร้างรูปแบบการใช้ไฟจากเครื่องใช้ไฟฟ้าหรือไฟล์โหลดก่อน
              แล้วใช้บิลค่าไฟช่วยปรับผลเปรียบเทียบแบบปกติ TOU และ Solar
              ให้ใกล้เคียงการใช้งานจริง
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-md shadow-primary/15 transition hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
                href="/analysis/new"
              >
                เลือกเป้าหมายและเริ่มวิเคราะห์
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </Link>
              <Link
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 bg-black/25 px-6 text-base font-semibold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-black/45 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-white"
                href="#prepare"
              >
                ดูสิ่งที่ต้องเตรียม
              </Link>
            </div>
            <p className="mt-4 text-sm text-white/70">
              ใช้เวลาประมาณ 5–10 นาที · ไม่จำเป็นต้องมีไฟล์จาก Smart Meter
            </p>
          </div>
          <section
            aria-label="ตัวอย่างผลลัพธ์"
            className="rounded-[2rem] border border-white/20 bg-card/95 p-5 text-card-foreground shadow-float backdrop-blur-xl md:p-7"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">ตัวอย่างรูปแบบผลลัพธ์</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  เป็นตัวอย่าง ไม่ใช่ข้อมูลของคุณ
                </p>
              </div>
              <Badge variant="information">ตัวอย่าง</Badge>
            </div>
            <div className="mt-6 rounded-xl border border-success/30 bg-success/10 p-5">
              <p className="text-sm font-semibold text-success">คำแนะนำหลัก</p>
              <h2 className="mt-2 text-xl font-semibold">
                เริ่มจากย้ายการใช้ไฟบางส่วนก่อนลงทุน
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                ระบบจะอธิบายเหตุผลจากบิลและช่วงเวลาการใช้ไฟ
                พร้อมระบุข้อจำกัดของผลประเมิน
              </p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <PreviewMetric label="สิ่งที่ต้องรู้" value="TOU เหมาะไหม" />
              <PreviewMetric label="ต่อยอด" value="Solar คุ้มไหม" />
              <PreviewMetric label="ความมั่นใจ" value="ตามข้อมูลที่มี" />
            </div>
            <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2
                aria-hidden="true"
                className="h-4 w-4 text-success"
              />
              เริ่มจากข้อมูลขั้นต่ำ แล้วเพิ่มความแม่นยำได้ภายหลัง
            </div>
            <ol className="mt-6 grid gap-2 border-t border-border/70 pt-5">
              {workflow.map((step, index) => (
                <li className="flex items-center gap-3 text-sm" key={step}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                    {index + 1}
                  </span>
                  <span className="font-medium">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </section>
      <section
        id="prepare"
        className="mx-auto w-full max-w-7xl px-4 py-12 md:px-6 lg:py-16"
      >
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">
            เริ่มได้ด้วยข้อมูลที่มี
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            เริ่มจากรูปแบบการใช้ไฟ แล้วค่อยเพิ่มบิล
          </h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            Load Profile ทำให้ระบบรู้ว่าใช้ไฟช่วงใด
            ส่วนบิลช่วยปรับขนาดการใช้ไฟและค่าใช้จ่ายให้ใกล้ความจริง
            จึงไม่ต้องเริ่มจากบิลก่อน
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {journeys.map((journey) => (
            <Link
              className={`block rounded-2xl focus:outline-none focus:ring-2 focus:ring-ring ${journey.featured ? "md:col-span-2" : ""}`}
              href={journey.href}
              key={journey.href}
            >
              <Card
                className={`h-full transition hover:-translate-y-1 hover:border-primary/60 hover:shadow-float ${journey.featured ? "border-primary/35 bg-primary/5" : ""}`}
              >
                <CardContent className="p-6 md:p-7">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <journey.icon aria-hidden="true" className="h-6 w-6" />
                    </span>
                    <Badge variant={journey.featured ? "success" : "outline"}>
                      {journey.step}
                    </Badge>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">
                    {journey.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {journey.text}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    {journey.featured
                      ? "เริ่มสร้างรูปแบบการใช้ไฟ"
                      : "ดูทางเลือกนี้"}
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-12 md:grid-cols-3 md:px-6">
          <InfoCard
            icon={ShieldCheck}
            title="ข้อมูลและอัตราที่ตรวจสอบได้"
            text="แยกข้อมูลจากบิล ข้อมูลที่ผู้ใช้ระบุ ค่ามาตรฐาน และผลประมาณการชัดเจน"
          />
          <InfoCard
            icon={SunMedium}
            title="ผลลัพธ์เพื่อการตัดสินใจ"
            text="คำแนะนำมาก่อนกราฟ พร้อมเหตุผล ผลประหยัดโดยประมาณ และข้อจำกัด"
          />
          <InfoCard
            icon={FileSpreadsheet}
            title="รายงานที่ย้อนกลับได้"
            text="เก็บสมมติฐาน แหล่งข้อมูล และคุณภาพข้อมูลไว้พร้อมรายงาน"
          />
        </div>
      </section>
    </main>
  );
}
function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
function InfoCard({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <Icon className="h-6 w-6 text-primary" />
        <h2 className="mt-4 font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
