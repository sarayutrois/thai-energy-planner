import { FileSpreadsheet, ReceiptText, ShieldCheck, SunMedium, Wrench, type LucideIcon } from "lucide-react";
import { MainNav } from "@/components/main-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const journeys = [
  { href: "/analysis/load-data/appliances", icon: Wrench, title: "สร้าง Load Profile", text: "ระบุเครื่องใช้ไฟฟ้า กำลังไฟ และช่วงเวลาใช้งาน เพื่อดูโหลด 24 ชั่วโมง" },
  { href: "/analysis/load-data/bills", icon: ReceiptText, title: "เพิ่มข้อมูลจากบิล", text: "กรอกหน่วยไฟและค่าไฟย้อนหลัง เพื่อปรับผลประมาณการให้ใกล้เคียงการใช้จริง" },
  { href: "/analysis/load-data/import", icon: FileSpreadsheet, title: "นำเข้าข้อมูลมิเตอร์", text: "อัปโหลด CSV หรือ XLSX ที่มีข้อมูลราย 15, 30 หรือ 60 นาที" },
];

export default function Home() {
  return <main className="min-h-screen bg-background"><MainNav />
    <section className="mx-auto w-full max-w-6xl px-4 py-16 text-center md:px-6 lg:py-24">
      <div className="flex justify-center gap-2"><Badge>Thai Energy Planner</Badge><Badge variant="outline">วางแผนจากข้อมูลที่ตรวจสอบได้</Badge></div>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-6xl">วางแผนค่าไฟ Solar และ Battery<br className="hidden md:block" />จากข้อมูลการใช้ไฟของคุณ</h1>
      <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">เริ่มจากบิล มิเตอร์ หรือเครื่องใช้ไฟฟ้า ระบบจะแสดงที่มาของตัวเลข ระดับความน่าเชื่อถือ และข้อจำกัดของผลประมาณการในทุกขั้นตอน</p>
      <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-xl border border-border shadow-sm">
        <video src="/solarcell.mp4" autoPlay loop muted playsInline className="w-full aspect-video object-cover" />
      </div>
      <div className="mt-10 grid gap-4 text-left md:grid-cols-3">{journeys.map((journey) => <a className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-ring" href={journey.href} key={journey.href}><Card className="h-full transition hover:border-primary hover:shadow-sm"><CardContent className="p-6"><journey.icon className="h-7 w-7 text-primary" /><h2 className="mt-5 text-lg font-semibold">{journey.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{journey.text}</p></CardContent></Card></a>)}</div>
    </section>
    <section className="border-y border-border bg-muted/30"><div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-12 md:grid-cols-3 md:px-6"><InfoCard icon={ShieldCheck} title="ข้อมูลและอัตราที่ตรวจสอบได้" text="แยกชัดเจนระหว่างข้อมูลจากบิล ข้อมูลที่ผู้ใช้ระบุ ค่ามาตรฐาน และผลประมาณการ" /><InfoCard icon={SunMedium} title="ผลลัพธ์เพื่อการตัดสินใจ" text="สรุปขนาด Solar เงินลงทุน การประหยัด ระยะคืนทุน และการลดใช้ไฟจากโครงข่าย" /><InfoCard icon={FileSpreadsheet} title="รายงานที่ย้อนกลับได้" text="เก็บสมมติฐาน แหล่งข้อมูล คุณภาพข้อมูล และข้อจำกัดไว้พร้อมรายงาน" /></div></section>
  </main>;
}
function InfoCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) { return <Card><CardContent className="p-6"><Icon className="h-6 w-6 text-primary" /><h2 className="mt-4 font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></CardContent></Card>; }
