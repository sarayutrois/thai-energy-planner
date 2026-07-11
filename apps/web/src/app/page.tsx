import {
  FileSpreadsheet,
  ReceiptText,
  ShieldCheck,
  SunMedium,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { MainNav } from "@/components/main-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const journeys = [
  {
    href: "/analysis/load-data/bills",
    icon: ReceiptText,
    title: "เริ่มจากบิลค่าไฟ",
    text: "กรอกบิลย้อนหลังเพื่อดูค่าใช้ไฟและตรวจเทียบกับ Load Profile",
  },
  {
    href: "/analysis/load-data/import",
    icon: FileSpreadsheet,
    title: "นำเข้า Load Profile",
    text: "อัปโหลดข้อมูล CSV เพื่อวิเคราะห์รูปแบบการใช้ไฟตามช่วงเวลา",
  },
  {
    href: "/analysis/load-data/appliances",
    icon: Wrench,
    title: "สร้างจากเครื่องใช้ไฟฟ้า",
    text: "ระบุจำนวน กำลังไฟ และเวลาใช้งาน เพื่อสร้าง Load Profile",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <MainNav />
      <section className="mx-auto w-full max-w-6xl px-4 py-16 text-center md:px-6 lg:py-24">
        <div className="flex justify-center gap-2">
          <Badge>Thai Energy Planner</Badge>
          <Badge variant="outline">ข้อมูลจริงเป็นฐาน</Badge>
        </div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-6xl">
          วิเคราะห์การใช้ไฟจากข้อมูลของคุณ
        </h1>
        <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
          สร้างหรืออัปโหลด Load Profile แล้วเปรียบเทียบ Normal/TOU และประเมิน
          Solar โดยแสดงคุณภาพข้อมูล อัตราค่าไฟ และสมมติฐานที่ใช้ทุกครั้ง
        </p>
        <div className="mt-10 grid gap-4 text-left md:grid-cols-3">
          {journeys.map((journey) => (
            <a
              className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              href={journey.href}
              key={journey.href}
            >
              <Card className="h-full transition hover:border-primary hover:shadow-sm">
                <CardContent className="p-6">
                  <journey.icon className="h-7 w-7 text-primary" />
                  <h2 className="mt-5 text-lg font-semibold">
                    {journey.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {journey.text}
                  </p>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </section>
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-12 md:grid-cols-3 md:px-6">
          <InfoCard
            icon={ShieldCheck}
            title="อัตราที่ตรวจสอบได้"
            text="ระบบใช้ช่วงอัตราและค่า Ft ที่มีวันมีผลและแหล่งอ้างอิง"
          />
          <InfoCard
            icon={SunMedium}
            title="Solar screening"
            text="ผล Solar เป็นการประเมินจากโหลดจริงและสมมติฐานที่แสดงให้ตรวจสอบ"
          />
          <InfoCard
            icon={FileSpreadsheet}
            title="รายงานที่ตรวจย้อนกลับได้"
            text="บันทึกแหล่งข้อมูล คุณภาพข้อมูล และ assumptions พร้อมผลวิเคราะห์"
          />
        </div>
      </section>
    </main>
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
