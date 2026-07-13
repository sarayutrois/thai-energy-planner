import { ApplianceLoadBuilder } from "@/components/appliance-load-builder";
import { PageHeader } from "@/components/ui/page-layout";

export default function AppliancesPage() {
  return (
    <main className="min-h-screen bg-muted/20">
      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:py-9">
        <PageHeader
          eyebrow="ข้อมูลของฉัน · ค่าประมาณ"
          title="สร้างรูปแบบการใช้ไฟรายวัน"
          description="ระบุเครื่องใช้ไฟฟ้า กำลังไฟ และช่วงเวลาใช้งาน ระบบจะแสดงโหลด 24 ชั่วโมงก่อนนำไปเปรียบเทียบค่าไฟหรือประเมิน Solar"
        />
        <div className="mt-6">
          <ApplianceLoadBuilder
            initialAppliances={[]}
            startDate="2026-07-01"
            endDate="2026-07-07"
          />
        </div>
      </section>
    </main>
  );
}
