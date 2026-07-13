import { Card, CardContent } from "@/components/ui/card";

export default function SolarLoading() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium">
              กำลังคำนวณผลการประเมิน Solar...
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              ระบบกำลังจัดเตรียมผลการประเมินจากข้อมูลการใช้ไฟที่มี
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
