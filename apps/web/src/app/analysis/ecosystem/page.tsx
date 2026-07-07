import { getSolarDemo } from "@/lib/solar-demo";
import { getBatteryDemo } from "@/lib/phase6-demo";
import { getEvDemo } from "@/lib/phase6-demo";
import { EcosystemDashboard } from "./ecosystem-dashboard";
import { ExportReportButton } from "@/components/export-report-button";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function EcosystemPage({ searchParams }: { searchParams?: Promise<any> }) {
  const params = (await searchParams) ?? {};

  // Fetch data for all three systems to combine them
  const solarData = getSolarDemo(params);
  const batteryData = getBatteryDemo(params);
  const evData = getEvDemo(params);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unified Energy Ecosystem</h1>
          <p className="text-muted-foreground mt-2">
            แดชบอร์ดสรุปผลรวมระบบพลังงาน (Solar + Battery + EV)
          </p>
        </div>
        <ExportReportButton targetId="ecosystem-report" filename="ecosystem-report.pdf" />
      </div>

      <div id="ecosystem-report" className="space-y-8">
        <EcosystemDashboard 
          solar={solarData.analysis} 
          battery={batteryData.analysis} 
          ev={evData.comparison} 
        />
      </div>
    </div>
  );
}
