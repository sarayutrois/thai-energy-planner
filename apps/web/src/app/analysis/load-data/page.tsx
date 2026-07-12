import { ClipboardList, FileUp, Gauge, PlugZap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainNav } from "@/components/main-nav";

const methods = [
  { label: "สร้างจากเครื่องใช้ไฟฟ้า", href: "/analysis/load-data/appliances", icon: PlugZap, description: "เหมาะสำหรับผู้เริ่มต้น ระบุกำลังไฟและช่วงเวลาใช้งานเพื่อสร้างกราฟโหลด 24 ชั่วโมง", recommended: true },
  { label: "กรอกข้อมูลจากบิล", href: "/analysis/load-data/bills", icon: ClipboardList, description: "ใช้หน่วยไฟและค่าไฟย้อนหลังเพื่อปรับผลประมาณการให้ใกล้เคียงการใช้จริง" },
  { label: "นำเข้าข้อมูลมิเตอร์", href: "/analysis/load-data/import", icon: FileUp, description: "นำเข้าไฟล์ CSV หรือ XLSX ที่มีข้อมูลราย 15, 30 หรือ 60 นาที" },
  { label: "ตรวจสอบ Load Profile", href: "/analysis/load-data/dashboard", icon: Gauge, description: "ดู Peak Load พลังงานรวม คุณภาพข้อมูล และแหล่งที่มาของข้อมูล" },
];

export default function LoadDataPage() {
  return (
    <main className="min-h-screen bg-muted/20">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="flex flex-wrap gap-2"><Badge>ขั้นตอนที่ 1 จาก 4</Badge><Badge variant="outline">เตรียมข้อมูลการใช้ไฟ</Badge></div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">เริ่มจากข้อมูลการใช้ไฟที่คุณมี</h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">Load Profile เป็นฐานของการคำนวณ Solar และค่าไฟ เลือกวิธีที่ตรงกับข้อมูลของคุณมากที่สุด แล้วระบบจะแจ้งระดับความน่าเชื่อถือของผล</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {methods.map((method) => (
            <a key={method.href} href={method.href} className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-ring">
              <Card className={`h-full transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md ${method.recommended ? "border-primary/50" : ""}`}>
                <CardHeader>
                  <div className="flex items-center justify-between"><method.icon aria-hidden="true" className="h-6 w-6 text-primary" />{method.recommended ? <Badge variant="outline">แนะนำ</Badge> : null}</div>
                  <CardTitle className="pt-2 text-lg">{method.label}</CardTitle>
                </CardHeader>
                <CardContent><p className="text-sm leading-6 text-muted-foreground">{method.description}</p></CardContent>
              </Card>
            </a>
          ))}
        </div>
        <div className="mt-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground"><strong className="text-foreground">ยังไม่มีข้อมูล?</strong> เริ่มจากรายการเครื่องใช้ไฟฟ้าได้ ระบบจะระบุชัดเจนว่าเป็นผลประมาณการ และคุณสามารถเพิ่มข้อมูลจากบิลภายหลังเพื่อเพิ่มความน่าเชื่อถือ</div>
      </section>
    </main>
  );
}
