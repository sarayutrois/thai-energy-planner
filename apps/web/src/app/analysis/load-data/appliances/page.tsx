import { AnalysisStartContextCard } from "@/components/analysis-start-context-card";
import { ApplianceLoadBuilder } from "@/components/appliance-load-builder";
import { MainNav } from "@/components/main-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { demoAppliances } from "@thai-energy-planner/calculation-engine";
import {
  getAnalysisStartContext,
  type AnalysisStartSearchParams,
} from "@/lib/analysis-start";

export default async function AppliancesPage({
  searchParams,
}: {
  searchParams?: Promise<AnalysisStartSearchParams>;
}) {
  const startContext = getAnalysisStartContext(
    (await searchParams) ?? {},
    "appliances",
  );

  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="mb-5 flex flex-wrap gap-2">
          <Badge>สร้าง Load Profile</Badge>
          <Badge variant="outline">แก้ไขและคำนวณทันที</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-normal">
          สร้างโหลดจากเครื่องใช้ไฟฟ้า
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          ระบุจำนวนเครื่อง กำลังไฟ และช่วงเวลาใช้งาน ระบบจะคำนวณโหลด kWh และ
          Peak จากรายการที่กำลังแก้ไข ไม่ใช่ข้อมูลตัวอย่าง
        </p>

        <AnalysisStartContextCard {...startContext} />

        <Card className="mt-5">
          <CardHeader>
            <CardTitle>รายการเครื่องใช้ไฟฟ้าและโหลดที่คำนวณได้</CardTitle>
          </CardHeader>
          <CardContent>
            <ApplianceLoadBuilder
              startDate="2026-01-05"
              endDate="2026-01-05"
              initialAppliances={demoAppliances}
            />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
