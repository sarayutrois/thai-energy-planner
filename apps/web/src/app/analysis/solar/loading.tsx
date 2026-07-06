import { MainNav } from "@/components/main-nav";
import { Card, CardContent } from "@/components/ui/card";

export default function SolarLoading() {
  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium">กำลังเตรียมผล Solar...</p>
            <p className="mt-2 text-sm text-muted-foreground">ระบบกำลังคำนวณผลเบื้องต้นและจะใช้ fallback หากข้อมูลละเอียดไม่พร้อม</p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
