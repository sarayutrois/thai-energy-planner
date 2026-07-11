import { Badge } from "@/components/ui/badge";
import { MainNav } from "@/components/main-nav";
import { LocalBillSummary } from "./local-bill-summary";
import { LocalLoadDashboard } from "./local-load-dashboard";

export default function LoadDashboardPage() {
  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="mb-5 flex flex-wrap gap-2">
          <Badge>Load Dashboard</Badge>
          <Badge variant="outline">ข้อมูล Load Profile ที่เลือก</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-normal">
          Dashboard ข้อมูลโหลด
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          แสดงผลจาก Load Profile ที่สร้างหรือนำเข้าจริงในเบราว์เซอร์นี้
          พร้อมสรุปบิลที่บันทึกไว้
        </p>

        <LocalBillSummary />
        <LocalLoadDashboard />
      </section>
    </main>
  );
}
