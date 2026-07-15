import { AnalysisGoalBanner } from "@/components/analysis-goal-banner";
import { PageHeader } from "@/components/ui/page-layout";
import { BatteryRuntimePanel } from "./battery-runtime-panel";

export default function BatteryOverviewPage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto w-full min-w-0 max-w-7xl overflow-hidden px-4 py-8 md:px-6 lg:py-10">
        <PageHeader
          eyebrow="การวิเคราะห์ · Battery"
          title="ประเมินแบตเตอรี่จากรูปแบบการใช้ไฟของคุณ"
          description="เลือกว่าอยากลดค่าไฟ สำรองไฟ หรือเก็บ Solar ส่วนเกิน ระบบจะเลือกขนาดมาตรฐานและอธิบายงบ ระยะสำรอง และความคุ้มค่าให้"
        />
        <AnalysisGoalBanner />
        <BatteryRuntimePanel />
      </section>
    </main>
  );
}
