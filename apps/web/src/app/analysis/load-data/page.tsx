import { ClipboardList, FileUp, Gauge, PlugZap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainNav } from "@/components/main-nav";

const methods = [
  {
    label: "กรอกบิลค่าไฟ",
    href: "/analysis/load-data/bills",
    icon: ClipboardList,
    description: "กรอกบิลย้อนหลังเพื่อวิเคราะห์ค่าไฟ",
  },
  {
    label: "นำเข้า CSV/XLSX",
    href: "/analysis/load-data/import",
    icon: FileUp,
    description: "อัปโหลดข้อมูลโหลดที่มีอยู่",
  },
  {
    label: "สร้างโหลดจากเครื่องใช้ไฟฟ้า",
    href: "/analysis/load-data/appliances",
    icon: PlugZap,
    description: "ระบุจำนวน กำลังไฟ และเวลาเปิดใช้งาน",
  },
  {
    label: "ดูสรุปโหลด",
    href: "/analysis/load-data/dashboard",
    icon: Gauge,
    description: "ตรวจ kWh, Peak และคุณภาพข้อมูล",
  },
];

export default function LoadDataPage() {
  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <Badge>Phase 3 Load Data</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">
          เลือกวิธีนำเข้าข้อมูลโหลด
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          รองรับการกรอกบิลย้อนหลัง อัปโหลด Load Profile
          และสร้างโหลดจากรายการเครื่องใช้ไฟฟ้า
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {methods.map((method) => (
            <a
              key={method.href}
              href={method.href}
              className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <Card className="h-full transition hover:border-primary">
                <CardHeader>
                  <method.icon
                    aria-hidden="true"
                    className="h-6 w-6 text-primary"
                  />
                  <CardTitle>{method.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {method.description}
                  </p>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
