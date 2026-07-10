import Link from "next/link";
import { MainNav } from "@/components/main-nav";

const labels = {
  battery: "Battery",
  ecosystem: "Ecosystem",
  ev: "EV",
} as const;

export default async function ModuleUnavailablePage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string }>;
}) {
  const { module } = await searchParams;
  const label = labels[module as keyof typeof labels] ?? "โมดูลนี้";

  return (
    <main className="min-h-screen bg-background">
      <MainNav />
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-24 text-center md:px-6">
        <p className="text-sm font-medium text-primary">กำลังพัฒนา</p>
        <h1 className="mt-3 text-3xl font-semibold">
          {label} ยังไม่เปิดให้ใช้งาน
        </h1>
        <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
          เรากำลังปรับโมดูลนี้ให้ใช้ข้อมูลโหลดและอัตราค่าไฟจริงก่อนเปิดใช้งาน
          เพื่อไม่ให้ผลวิเคราะห์จากข้อมูลตัวอย่างถูกเข้าใจว่าเป็นผลจริง
        </p>
        <Link
          className="mt-8 inline-flex rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          href="/analysis/new"
        >
          กลับไปสร้างโหลดหรือวิเคราะห์ Solar
        </Link>
      </section>
    </main>
  );
}
