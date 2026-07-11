import { MainNav } from "@/components/main-nav";
import { Badge } from "@/components/ui/badge";
import { getSolarDemo, type SolarSearchParams } from "@/lib/solar-demo";
import { SolarApiRuntimePanel } from "./solar-api-runtime-panel";

export default async function SolarOverviewPage({ searchParams }: { searchParams?: Promise<SolarSearchParams> }) {
  const { settings } = getSolarDemo((await searchParams) ?? {});
  return <main className="min-h-screen bg-muted/20"><MainNav /><section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10"><div className="flex flex-wrap gap-2"><Badge>ขั้นตอนที่ 3 จาก 4</Badge><Badge variant="outline">ประเมิน Solar</Badge></div><h1 className="mt-4 text-3xl font-semibold tracking-tight">ประเมิน Solar จากข้อมูลการใช้ไฟ</h1><p className="mt-3 max-w-3xl leading-7 text-muted-foreground">ระบบจะใช้ Load Profile ที่คุณเลือกคำนวณผลลัพธ์ และเปิดเผยสมมติฐานขนาดระบบ หลังคา ต้นทุน และอัตราค่าไฟที่ใช้ในผลประมาณการ</p><div className="mt-6"><SolarApiRuntimePanel settings={settings} /></div></section></main>;
}
