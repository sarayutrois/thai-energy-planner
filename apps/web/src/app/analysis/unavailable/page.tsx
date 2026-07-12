import Link from "next/link";
import { MainNav } from "@/components/main-nav";

const labels = { battery: "Battery", ecosystem: "ระบบพลังงานรวม", ev: "EV", solar_detail: "รายละเอียด Solar", scenario_detail: "การเปรียบเทียบแผน" } as const;

export default async function ModuleUnavailablePage({ searchParams }: { searchParams: Promise<{ module?: string }> }) {
  const { module } = await searchParams;
  const label = labels[module as keyof typeof labels] ?? "หน้านี้";
  return <main className="min-h-screen bg-background"><MainNav /><section className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-24 text-center md:px-6"><p className="text-sm font-medium text-primary">เร็ว ๆ นี้</p><h1 className="mt-3 text-3xl font-semibold">{label} กำลังปรับปรุง</h1><p className="mt-4 max-w-xl leading-7 text-muted-foreground">ฟีเจอร์นี้กำลังปรับปรุงให้ใช้ข้อมูล Load Profile และอัตราค่าไฟที่ตรวจสอบได้ ระบบจะยังไม่แสดงผลประมาณการจนกว่าข้อมูลและสมมติฐานจะพร้อม</p><Link className="mt-8 inline-flex rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground" href="/analysis/load-data">ไปเตรียมข้อมูลการใช้ไฟ</Link></section></main>;
}
