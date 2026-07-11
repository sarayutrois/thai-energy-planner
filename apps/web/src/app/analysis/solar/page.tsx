import { MainNav } from "@/components/main-nav";
import { Badge } from "@/components/ui/badge";
import { getSolarDemo, type SolarSearchParams } from "@/lib/solar-demo";
import { SolarApiRuntimePanel } from "./solar-api-runtime-panel";

export default async function SolarOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<SolarSearchParams>;
}) {
  const { settings } = getSolarDemo((await searchParams) ?? {});

  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="flex flex-wrap gap-2">
          <Badge>Solar screening</Badge>
          <Badge variant="warning">ใช้ข้อมูล Load Profile จริง</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">
          ประเมิน Solar จากการใช้ไฟจริง
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          ผลลัพธ์ใช้ Load Profile ที่คุณนำเข้าหรือสร้างไว้เป็นฐาน
          โดยสมมติฐานหลังคาและต้นทุนเป็นค่าประเมินที่ต้องตรวจหน้างานก่อนตัดสินใจลงทุน
        </p>
        <SolarApiRuntimePanel settings={settings} />
      </section>
    </main>
  );
}
