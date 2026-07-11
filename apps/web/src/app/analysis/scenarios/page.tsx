import { Badge } from "@/components/ui/badge";
import { MainNav } from "@/components/main-nav";
import { CanonicalScenarioPanel } from "./canonical-scenario-panel";

export default function ScenariosPage() {
  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="flex flex-wrap gap-2">
          <Badge>Scenario Comparison</Badge>
          <Badge variant="outline">Normal / TOU / Load shifting</Badge>
          <Badge variant="success">ข้อมูลโหลดจริง</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">
          เปรียบเทียบค่าไฟจากรูปแบบการใช้ไฟของคุณ
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          เลือก Load Profile ที่สร้างจากไฟล์ CSV หรือรายการเครื่องใช้ไฟฟ้า แล้วระบบจะคำนวณ
          Normal, TOU และการย้ายโหลดด้วย tariff snapshot ที่ตรวจสอบได้
        </p>
        <CanonicalScenarioPanel />
      </section>
    </main>
  );
}
