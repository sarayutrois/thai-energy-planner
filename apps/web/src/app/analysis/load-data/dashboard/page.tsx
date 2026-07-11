import { MainNav } from "@/components/main-nav";
import { Badge } from "@/components/ui/badge";
import { EnergyOverviewDashboard } from "./energy-overview-dashboard";
import { LocalBillSummary } from "./local-bill-summary";

export default function LoadDashboardPage() { return <main className="min-h-screen bg-muted/20"><MainNav /><section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10"><div className="flex flex-wrap gap-2"><Badge>ขั้นตอนที่ 2 จาก 4</Badge><Badge variant="outline">ตรวจสอบข้อมูลก่อนวิเคราะห์</Badge></div><h1 className="mt-4 text-3xl font-semibold tracking-tight">ตรวจสอบข้อมูลการใช้ไฟ</h1><p className="mt-3 max-w-3xl leading-7 text-muted-foreground">ดูว่าระบบกำลังใช้ข้อมูลชุดใด ความน่าเชื่อถือระดับใด และมีข้อมูลอะไรที่ควรเพิ่มก่อนตัดสินใจลงทุน</p><EnergyOverviewDashboard /><LocalBillSummary /></section></main>; }
