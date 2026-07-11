import { AnalysisStartContextCard } from "@/components/analysis-start-context-card";
import { Badge } from "@/components/ui/badge";
import { MainNav } from "@/components/main-nav";
import { getAnalysisStartContext, type AnalysisStartSearchParams } from "@/lib/analysis-start";
import { GuidedBillWorkspace } from "./guided-bill-workspace";

export default async function BillsPage({ searchParams }: { searchParams?: Promise<AnalysisStartSearchParams> }) {
  const startContext = getAnalysisStartContext((await searchParams) ?? {}, "bills");

  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="mb-5 flex flex-wrap gap-2">
          <Badge>Manual Bill Input</Badge>
          <Badge variant="outline">เริ่มจากข้อมูลที่มีจริง</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-normal">กรอกบิลค่าไฟย้อนหลัง</h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          เริ่มจากเดือน, หน่วย kWh และค่าไฟรวมก่อน ระบบจะสรุปภาพรวม คุณภาพข้อมูล
          และแนะนำเส้นทางต่อไปให้ทันทีโดยยังไม่ต้องบันทึกลงฐานข้อมูล
        </p>

        <AnalysisStartContextCard {...startContext} />
        <GuidedBillWorkspace audience={startContext.audience} initialBills={[]} />
      </section>
    </main>
  );
}
