import { Badge } from "@/components/ui/badge";
import { MainNav } from "@/components/main-nav";
import { CanonicalScenarioPanel } from "./canonical-scenario-panel";
import { SampleBillNotice } from "@/components/sample-bill-notice";

export default function ScenariosPage() {
  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="flex flex-wrap gap-2">
          <Badge>เปรียบเทียบแผนค่าไฟ</Badge>
          <Badge variant="outline">Normal / TOU / การย้ายเวลาใช้ไฟ</Badge>
          <Badge variant="outline">ใช้ Load Profile ที่ผู้ใช้เลือก</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">
          เปรียบเทียบค่าไฟจากรูปแบบการใช้ไฟของคุณ
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          เลือก Load Profile ที่สร้างจากไฟล์ CSV หรือรายการเครื่องใช้ไฟฟ้า แล้วระบบจะคำนวณ
          Normal, TOU และการย้ายโหลดด้วยอัตราค่าไฟที่ตรวจสอบแหล่งอ้างอิงได้
        </p>
        <SampleBillNotice />
        <CanonicalScenarioPanel />
      </section>
    </main>
  );
}
