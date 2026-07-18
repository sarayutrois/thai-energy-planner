import { Card, CardContent } from "@/components/ui/card";

export default function SolarLoading() {
  return (
    <main className="energy-workspace-bg min-h-screen">
      <section className="mx-auto w-full max-w-[90rem] px-4 py-8 md:px-6 lg:px-8 lg:py-10">
        <Card className="energy-panel-solar shadow-panel">
          <CardContent className="p-6">
            <p className="text-sm font-medium">กำลังเปิดหน้าประเมิน Solar...</p>
            <p className="mt-2 text-sm text-muted-foreground">
              ระบบกำลังตรวจข้อมูลที่บันทึกไว้ ยังไม่ได้เริ่มคำนวณผล Solar
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
