import { Gauge } from "lucide-react";
import { demoAppliances, simulateApplianceLoadProfile, summarizeLoadProfile } from "@thai-energy-planner/calculation-engine";
import { demoTouTariff } from "@thai-energy-planner/tariff-engine";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadDashboardCharts } from "@/components/load-dashboard-charts";
import { MainNav } from "@/components/main-nav";

export default function LoadDashboardPage() {
  const simulation = simulateApplianceLoadProfile({
    appliances: demoAppliances,
    date: "2026-01-05"
  });
  const summary = summarizeLoadProfile(simulation.intervals, { tariffVersion: demoTouTariff });

  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="mb-5 flex flex-wrap gap-2">
          <Badge>Load Dashboard</Badge>
          <Badge variant="outline">ใช้ TOU logic จาก Phase 2</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-normal">Dashboard ข้อมูลโหลด</h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          แสดง metric หลักและกราฟเบื้องต้นจาก demo appliance profile โดยแยก Peak/Off-Peak ผ่าน Tariff Engine
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Metric title="Total kWh" tooltip="พลังงานไฟฟ้ารวมในช่วงข้อมูล" value={formatNumber(summary.totalKwh)} />
          <Metric title="Average daily kWh" tooltip="ค่าเฉลี่ยหน่วยไฟต่อวัน" value={formatNumber(summary.averageDailyKwh)} />
          <Metric title="Average load kW" tooltip="โหลดเฉลี่ย = kWh รวม / ชั่วโมงรวม" value={formatNumber(summary.averageLoadKw)} />
          <Metric title="Peak demand kW" tooltip="กำลังไฟสูงสุดใน interval" value={formatNumber(summary.peakDemandKw)} />
          <Metric title="Load factor" tooltip="โหลดเฉลี่ยหารด้วย peak demand" value={formatNumber(summary.loadFactor)} />
          <Metric title="Daytime kWh" tooltip="06:00-18:00" value={formatNumber(summary.daytimeKwh)} />
          <Metric title="Nighttime kWh" tooltip="18:00-06:00" value={formatNumber(summary.nighttimeKwh)} />
          <Metric title="Peak/Off-Peak" tooltip="ใช้ selectTouPeriod จาก Tariff Engine" value={`${formatNumber(summary.peakPeriodKwh)} / ${formatNumber(summary.offPeakPeriodKwh)}`} />
        </div>

        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge aria-hidden="true" className="h-5 w-5 text-primary" />
              Load charts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LoadDashboardCharts summary={summary} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function Metric({ title, tooltip, value }: { title: string; tooltip: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4" title={tooltip}>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="mt-2 text-xl font-semibold tracking-normal">{value}</p>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}
