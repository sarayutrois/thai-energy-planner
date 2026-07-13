import { AnalysisStartContextCard } from "@/components/analysis-start-context-card";
import { getAnalysisStartContext, type AnalysisStartSearchParams } from "@/lib/analysis-start";
import { GuidedBillWorkspace } from "./guided-bill-workspace";
import { PageHeader } from "@/components/ui/page-layout";

export default async function BillsPage({ searchParams }: { searchParams?: Promise<AnalysisStartSearchParams> }) {
  const startContext = getAnalysisStartContext((await searchParams) ?? {}, "bills");

  return (
    <main className="min-h-screen">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <PageHeader eyebrow="ข้อมูลของฉัน · บิลค่าไฟ" title="กรอกบิลค่าไฟย้อนหลัง" description="เริ่มจากเดือน จำนวนหน่วยไฟ และค่าไฟรวม ระบบจะสรุปคุณภาพข้อมูลและแนะนำขั้นตอนถัดไป โดยบันทึกข้อมูลไว้ในอุปกรณ์นี้" />

        <AnalysisStartContextCard {...startContext} />
        <GuidedBillWorkspace audience={startContext.audience} initialBills={[]} />
      </section>
    </main>
  );
}
