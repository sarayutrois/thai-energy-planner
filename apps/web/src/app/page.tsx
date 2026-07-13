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

const journeys = [
  {
    href: "/analysis/load-data/appliances",
    icon: Wrench,
    title: "สร้าง Load Profile",
    text: "ระบุเครื่องใช้ไฟฟ้า กำลังไฟ และช่วงเวลาใช้งาน เพื่อดูโหลด 24 ชั่วโมง",
  },
  {
    href: "/analysis/load-data/bills",
    icon: ReceiptText,
    title: "เพิ่มข้อมูลจากบิล",
    text: "กรอกหน่วยไฟและค่าไฟย้อนหลัง เพื่อปรับผลประมาณการให้ใกล้เคียงการใช้จริง",
  },
  {
    href: "/analysis/load-data/import",
    icon: FileSpreadsheet,
    title: "นำเข้าข้อมูลมิเตอร์",
    text: "อัปโหลด CSV หรือ XLSX ที่มีข้อมูลราย 15, 30 หรือ 60 นาที",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 md:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap gap-2">
              <Badge>Thai Energy Planner</Badge>
              <Badge variant="outline">สำหรับเจ้าของบ้าน</Badge>
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl">
              วางแผนค่าไฟของคุณ
              <br />
              จากข้อมูลจริง
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
              เพิ่มข้อมูลจากบิลค่าไฟหนึ่งใบ
              แล้วค่อยสร้างรูปแบบการใช้ไฟเพื่อเปรียบเทียบค่าไฟแบบปกติ TOU และ
              Solar อย่างเข้าใจง่าย
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-base font-semibold text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
                href="/analysis/new"
              >
                เริ่มวิเคราะห์
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-base font-medium transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                href="#prepare"
              >
                ดูสิ่งที่ต้องเตรียม
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              ใช้เวลาประมาณ 5–10 นาที · ไม่จำเป็นต้องมีไฟล์จาก Smart Meter
            </p>
          </div>
          <section
            aria-label="ตัวอย่างผลลัพธ์"
            className="surface-elevated rounded-2xl border border-border p-5 shadow-panel md:p-7"
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
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            เลือกทางที่สะดวกที่สุด
          </h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            ไม่ต้องกรอกข้อมูลเชิงวิศวกรรมทั้งหมด
            ระบบจะแสดงความน่าเชื่อถือของผลตามข้อมูลที่เพิ่มเข้ามา
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {journeys.map((journey) => (
            <Link
              className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              href={journey.href}
              key={journey.href}
            >
              <Card className="h-full transition hover:-translate-y-0.5 hover:border-primary hover:shadow-panel">
                <CardContent className="p-6">
                  <journey.icon
                    aria-hidden="true"
                    className="h-7 w-7 text-primary"
                  />
                  <h3 className="mt-5 text-lg font-semibold">
                    {journey.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {journey.text}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    เริ่มจากทางนี้
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
