import { MainNav } from "@/components/main-nav";
import { EnergyOverviewDashboard } from "./energy-overview-dashboard";
import { LocalBillSummary } from "./local-bill-summary";
import { PageHeader } from "@/components/ui/page-layout";

export default function LoadDashboardPage() { return <main className="min-h-screen bg-muted/20"><MainNav /><section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10"><PageHeader eyebrow="ตรวจสอบความพร้อม" title="ตรวจสอบข้อมูลการใช้ไฟ" description="ดูว่าระบบกำลังใช้ข้อมูลชุดใด ความน่าเชื่อถือระดับใด และควรเพิ่มข้อมูลอะไรต่อก่อนตัดสินใจ" /><EnergyOverviewDashboard /><LocalBillSummary /></section></main>; }
