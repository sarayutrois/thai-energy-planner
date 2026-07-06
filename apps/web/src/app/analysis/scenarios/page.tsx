import { ArrowRight, BarChart3, FilePlus2, GitCompare, ReceiptText, SunMedium, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainNav } from "@/components/main-nav";
import { LocalScenarioStart } from "./local-scenario-start";

const scenarioRoutes = [
  {
    href: "/analysis/scenarios/results",
    label: "ดูผล Normal / TOU demo",
    description: "เริ่มจากผลตัวอย่างเพื่อเข้าใจว่าการย้ายโหลดไป off-peak ช่วยได้แค่ไหน",
    icon: ReceiptText,
    badge: "เริ่มตรงนี้"
  },
  {
    href: "/analysis/scenarios/new",
    label: "ตั้งค่า Scenario",
    description: "ปรับสัดส่วนโหลดที่ย้ายเวลา และเลือกช่วงเวลาที่ต้องการจำลอง",
    icon: FilePlus2,
    badge: "ปรับค่า"
  },
  {
    href: "/analysis/scenarios/compare",
    label: "เปรียบเทียบหลายทางเลือก",
    description: "ดูตารางเปรียบเทียบ Normal, TOU และ load shifting ในมุมค่าไฟ",
    icon: GitCompare,
    badge: "เทียบ"
  }
];

const recommendedOrder = [
  {
    title: "1. เทียบ Normal / TOU",
    description: "ดูว่าค่าไฟปัจจุบันเหมาะกับมิเตอร์แบบไหน และต้องย้ายโหลดมากแค่ไหนถึงคุ้ม",
    href: "/analysis/scenarios/results",
    icon: Zap
  },
  {
    title: "2. ลอง Solar",
    description: "ถ้ามีโหลดกลางวันหรือค่าไฟสูง ให้ประเมิน Solar ขนาดเริ่มต้นและคืนทุน",
    href: "/analysis/solar",
    icon: SunMedium
  },
  {
    title: "3. ทำรายงาน",
    description: "เมื่อได้คำตอบเบื้องต้นแล้ว เปิดรายงานเพื่อดูโครงสรุปและ assumptions",
    href: "/analysis/reports",
    icon: BarChart3
  }
];

export default function ScenariosPage() {
  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="flex flex-wrap gap-2">
          <Badge>Scenario Comparison</Badge>
          <Badge variant="outline">Normal / TOU</Badge>
          <Badge variant="success">official tariff seed</Badge>
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">เลือกทางเลือกค่าไฟที่ควรลอง</h1>
            <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
              หลังจากมีบิลหรือ load profile แล้ว ขั้นนี้ช่วยตอบว่าใช้มิเตอร์ปกติดีไหม ควรลอง TOU ไหม
              และต้องย้ายโหลดช่วงไหนถึงจะเห็นผล
            </p>
          </div>
          <Card className="border-primary/40 bg-primary/5">
            <CardHeader>
              <CardTitle>คำเตือนเรื่องข้อมูล</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                หน้านี้ใช้ tariff seed ที่มี version, effective date และ source แล้ว แต่ profile จากบิลรายเดือนยังเป็นการ scale เพื่อประเมินเบื้องต้น
              </p>
            </CardContent>
          </Card>
        </div>

        <LocalScenarioStart />

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {scenarioRoutes.map((route) => (
            <a key={route.href} href={route.href} className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-ring">
              <Card className="h-full transition hover:border-primary">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <route.icon aria-hidden="true" className="h-6 w-6 text-primary" />
                    <Badge variant={route.badge === "เริ่มตรงนี้" ? "success" : "outline"}>{route.badge}</Badge>
                  </div>
                  <CardTitle>{route.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">{route.description}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
                    เปิดดู
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 aria-hidden="true" className="h-5 w-5 text-primary" />
              ลำดับที่แนะนำ
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {recommendedOrder.map((item) => (
              <a key={item.href} className="rounded-md border border-border p-4 transition hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring" href={item.href}>
                <item.icon aria-hidden="true" className="h-5 w-5 text-primary" />
                <p className="mt-3 font-semibold">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </a>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
