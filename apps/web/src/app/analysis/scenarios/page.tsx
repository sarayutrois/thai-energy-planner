import { CanonicalScenarioPanel } from "./canonical-scenario-panel";
import { SampleBillNotice } from "@/components/sample-bill-notice";
import { PageHeader } from "@/components/ui/page-layout";
import { AnalysisGoalBanner } from "@/components/analysis-goal-banner";

export default function ScenariosPage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <PageHeader
          eyebrow="การวิเคราะห์ · ค่าไฟและ TOU"
          title="เปรียบเทียบค่าไฟจากรูปแบบการใช้ไฟของคุณ"
          description="ระบบใช้รูปแบบการใช้ไฟที่เลือก เพื่อเทียบค่าไฟแบบปกติ TOU และการย้ายเวลาใช้ไฟ พร้อมอัตราที่ตรวจสอบแหล่งอ้างอิงได้"
        />
        <AnalysisGoalBanner />
        <SampleBillNotice />
        <CanonicalScenarioPanel />
      </section>
    </main>
  );
}
