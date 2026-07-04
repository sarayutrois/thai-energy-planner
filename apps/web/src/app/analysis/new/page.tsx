import { ArrowRight, ClipboardList, FileUp, Gauge, PlugZap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainNav } from "@/components/main-nav";

const entryPoints = [
  {
    title: "กรอกบิลย้อนหลัง",
    description: "รองรับหลายเดือน ตรวจเดือนซ้ำ และสรุปแนวโน้มค่าไฟ",
    href: "/analysis/load-data/bills",
    icon: ClipboardList
  },
  {
    title: "อัปโหลด Load Profile",
    description: "CSV/XLSX พร้อม Column Mapping และ Data Preview",
    href: "/analysis/load-data/import",
    icon: FileUp
  },
  {
    title: "สร้างโหลดจากเครื่องใช้ไฟฟ้า",
    description: "จำลองโหลดราย 15 นาทีจากกำลังไฟและตารางใช้งาน",
    href: "/analysis/load-data/appliances",
    icon: PlugZap
  },
  {
    title: "ดู Load Dashboard",
    description: "สรุป kWh, peak kW, load factor และ Peak/Off-Peak",
    href: "/analysis/load-data/dashboard",
    icon: Gauge
  }
];

export default function NewAnalysisPage() {
  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="mb-6 flex flex-wrap gap-2">
          <Badge>Phase 3</Badge>
          <Badge variant="outline">Load Data</Badge>
        </div>
        <div className="max-w-3xl space-y-3">
          <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">เริ่มสร้างโครงการวิเคราะห์</h1>
          <p className="leading-7 text-muted-foreground">
            เลือกวิธีนำเข้าข้อมูลการใช้ไฟฟ้า ระบบจะแสดงผลลัพธ์เบื้องต้นก่อนบันทึกจริง
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {entryPoints.map((item) => (
            <a key={item.href} href={item.href} className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-ring">
              <Card className="h-full transition hover:border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <item.icon aria-hidden="true" className="h-5 w-5 text-primary" />
                      {item.title}
                    </span>
                    <ArrowRight aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-6 text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
