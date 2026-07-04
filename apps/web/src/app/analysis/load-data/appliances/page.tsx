import { PlugZap } from "lucide-react";
import { applianceCatalog, demoAppliances, simulateApplianceLoadProfile } from "@thai-energy-planner/calculation-engine";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainNav } from "@/components/main-nav";

export default function AppliancesPage() {
  const simulation = simulateApplianceLoadProfile({
    appliances: demoAppliances,
    date: "2026-01-05"
  });

  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="mb-5 flex flex-wrap gap-2">
          <Badge>Appliance Load Builder</Badge>
          <Badge variant="outline">15 นาที</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-normal">สร้างโหลดจากเครื่องใช้ไฟฟ้า</h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          สูตรพื้นฐาน: power_kw × quantity × duty_cycle × interval_hours รองรับช่วงเวลาข้ามวัน เช่น 22:00-06:00
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Metric label="kWh/วัน" value={formatNumber(simulation.kwhPerDay)} />
          <Metric label="kWh/เดือนโดยประมาณ" value={formatNumber(simulation.estimatedKwhPerMonth)} />
          <Metric label="Peak kW" value={formatNumber(simulation.peakKw)} />
          <Metric label="ใช้ไฟสูงสุด" value={simulation.topAppliance?.name ?? "-"} />
        </div>

        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlugZap aria-hidden="true" className="h-5 w-5 text-primary" />
              รายการอุปกรณ์ตัวอย่าง
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {demoAppliances.map((item) => (
                <div key={item.name} className="rounded-md border border-border p-4">
                  <p className="font-semibold">{item.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.power} {item.powerUnit} × {item.quantity} เครื่อง • duty {item.dutyCycle}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.schedule.startTime}-{item.schedule.endTime}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-5">
          <CardHeader>
            <CardTitle>สัดส่วนการใช้ไฟของแต่ละอุปกรณ์</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {simulation.applianceShares.map((item) => (
                <div key={item.name} className="grid gap-2 md:grid-cols-[180px_1fr_90px] md:items-center">
                  <span className="text-sm font-medium">{item.name}</span>
                  <div className="h-3 rounded-sm bg-muted">
                    <div className="h-3 rounded-sm bg-primary" style={{ width: `${Math.min(item.sharePercent, 100)}%` }} />
                  </div>
                  <span className="text-sm text-muted-foreground">{item.sharePercent}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-5">
          <CardHeader>
            <CardTitle>อุปกรณ์ที่รองรับ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {applianceCatalog.map((item) => (
                <Badge key={item} variant="outline">
                  {item}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-normal">{value}</p>
    </div>
  );
}

function formatNumber(value: number | string) {
  return typeof value === "string"
    ? value
    : new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}
