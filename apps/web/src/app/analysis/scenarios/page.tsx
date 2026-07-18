import { CanonicalScenarioPanel } from "./canonical-scenario-panel";
import { PageHeader } from "@/components/ui/page-layout";
import { AnalysisGoalBanner } from "@/components/analysis-goal-banner";

export default function ScenariosPage() {
  return (
    <main className="energy-workspace-bg min-h-screen">
      <section className="mx-auto w-full min-w-0 max-w-[90rem] overflow-hidden px-4 py-8 md:px-6 lg:px-8 lg:py-10">
        <PageHeader
          eyebrow="การวิเคราะห์ · ค่าไฟและ TOU"
          title="เปรียบเทียบค่าไฟจากรูปแบบการใช้ไฟของคุณ"
          description="ระบบใช้รูปแบบการใช้ไฟที่เลือก เพื่อเทียบค่าไฟแบบปกติ TOU และการย้ายเวลาใช้ไฟ พร้อมอัตราที่ตรวจสอบแหล่งอ้างอิงได้"
        />
        <AnalysisGoalBanner />
        <CanonicalScenarioPanel />
      </section>
    </main>
  );
}
