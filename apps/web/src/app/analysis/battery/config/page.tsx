import { getBatteryDemo, type Phase6SearchParams } from "@/lib/phase6-demo";
import { BatteryControls, BatteryPageShell, BatterySourcePanel, BatterySummary } from "../battery-page-parts";

export default async function BatteryConfigPage({ searchParams }: { searchParams?: Promise<Phase6SearchParams> }) {
  const { analysis, settings, queryString } = getBatteryDemo((await searchParams) ?? {});

  return (
    <BatteryPageShell active="config" queryString={queryString}>
      <BatteryControls settings={settings} action="/analysis/battery/config" />
      <BatterySummary analysis={analysis} />
      <BatterySourcePanel analysis={analysis} />
    </BatteryPageShell>
  );
}
