import { AnalysisGoalBanner } from "@/components/analysis-goal-banner";
import { PageHeader } from "@/components/ui/page-layout";
import { EvRuntimePanel } from "./ev-runtime-panel";

export default function EvOverviewPage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto w-full min-w-0 max-w-7xl overflow-hidden px-4 py-8 md:px-6 lg:py-10">
        <PageHeader
          eyebrow="การวิเคราะห์ · EV"
          title="วางแผนชาร์จ EV ให้เหมาะกับบ้านและค่าไฟของคุณ"
          description="กรอกระยะทาง เวลาที่รถจอดบ้าน และกำลังเครื่องชาร์จ ระบบจะเทียบ Normal, TOU, Smart Charging และ Solar เพื่อสรุปค่าไฟเพิ่ม เวลาชาร์จ และสิ่งที่ควรเตรียม"
        />
        <AnalysisGoalBanner />
        <EvRuntimePanel />
      </section>
    </main>
  );
}
