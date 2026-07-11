import { ApplianceLoadBuilder } from "@/components/appliance-load-builder";
import { MainNav } from "@/components/main-nav";
import { Badge } from "@/components/ui/badge";

export default function AppliancesPage() {
  return (
    <main className="min-h-screen bg-muted/20">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:py-9">
        <div className="flex flex-wrap gap-2">
          <Badge>Load Profile</Badge>
          <Badge variant="outline">ค่าประมาณจากข้อมูลที่ผู้ใช้ระบุ</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">สร้างรูปแบบการใช้ไฟรายวัน</h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          ระบุเครื่องใช้ไฟฟ้า กำลังไฟ และช่วงเวลาใช้งาน ระบบจะแสดงโหลด 24 ชั่วโมงและช่วยตรวจสอบกับหน่วยไฟในบิลก่อนนำไปวิเคราะห์ Solar หรือ Battery
        </p>
        <div className="mt-6">
          <ApplianceLoadBuilder initialAppliances={[]} startDate="2026-07-01" endDate="2026-07-07" />
        </div>
      </section>
    </main>
  );
}
