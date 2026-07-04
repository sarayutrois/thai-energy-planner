import { BarChart3, FilePlus2, GitCompare, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainNav } from "@/components/main-nav";

const scenarioRoutes = [
  { href: "/analysis/scenarios/new", label: "สร้าง Scenario", icon: FilePlus2 },
  { href: "/analysis/scenarios/compare", label: "เปรียบเทียบ", icon: GitCompare },
  { href: "/analysis/scenarios/results", label: "ผลลัพธ์ Demo", icon: ReceiptText }
];

export default function ScenariosPage() {
  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="flex flex-wrap gap-2">
          <Badge>Phase 4</Badge>
          <Badge variant="outline">Scenario Engine</Badge>
          <Badge variant="warning">ใช้ demo tariff draft</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">Scenario Comparison Engine</h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          เปรียบเทียบมิเตอร์ปกติ TOU และ load shifting โดยคำนวณผ่าน Tariff Engine และ Load Data Engine เดิม
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {scenarioRoutes.map((route) => (
            <a key={route.href} href={route.href} className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-ring">
              <Card className="h-full transition hover:border-primary">
                <CardHeader>
                  <route.icon aria-hidden="true" className="h-6 w-6 text-primary" />
                  <CardTitle>{route.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">เปิดหน้าทดสอบ Phase 4</p>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 aria-hidden="true" className="h-5 w-5 text-primary" />
              ขอบเขต Phase 4
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm leading-6 text-muted-foreground md:grid-cols-2">
            <p>รองรับ Current Normal, Current TOU, Switch to TOU, Load Shift to Off-Peak และ Custom Load Shift structure</p>
            <p>ยังไม่คำนวณ Solar, Battery หรือ EV แต่สามารถ flag ข้อมูลที่เหมาะสำหรับ Phase ถัดไปได้</p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
