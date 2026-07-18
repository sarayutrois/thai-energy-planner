import { AnalysisGoalBanner } from "@/components/analysis-goal-banner";
import { PageHeader } from "@/components/ui/page-layout";
import { EcosystemRuntimePanel } from "./ecosystem-runtime-panel";

export default function EcosystemPage() {
  return (
    <main className="energy-workspace-bg min-h-screen">
      <section className="mx-auto w-full min-w-0 max-w-[90rem] overflow-hidden px-4 py-8 md:px-6 lg:px-8 lg:py-10">
        <PageHeader
          eyebrow="ผลลัพธ์ · Ecosystem"
          title="รวมทุกคำตอบเป็นแผนพลังงานเดียว"
          description="ตรวจความพร้อมของ TOU, Solar, EV และ Battery แล้วจัดลำดับสิ่งที่ควรทำก่อน พร้อมกรอบงบ ค่าไฟหลังปรับ และข้อจำกัดโดยไม่บวกผลประหยัดซ้ำกัน"
        />
        <AnalysisGoalBanner />
        <EcosystemRuntimePanel />
      </section>
    </main>
  );
}
