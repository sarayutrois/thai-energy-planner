import { getBatteryDemo, type Phase6SearchParams } from "@/lib/phase6-demo";
import {
  BatteryChartsSection,
  BatteryControls,
  BatteryFinancialTable,
  BatteryPageShell,
  BatteryRecommendations,
  BatterySourcePanel,
  BatterySummary
} from "../battery-page-parts";

export default async function BatteryResultsPage({ searchParams }: { searchParams?: Promise<Phase6SearchParams> }) {
  const { analysis, settings, queryString } = getBatteryDemo((await searchParams) ?? {});

  return (
    <BatteryPageShell active="results" queryString={queryString}>
      <BatteryControls settings={settings} action="/analysis/battery/results" />
      <BatterySummary analysis={analysis} />
      <BatterySourcePanel analysis={analysis} />
      <BatteryFinancialTable analysis={analysis} />
      <BatteryChartsSection analysis={analysis} />
      <BatteryRecommendations analysis={analysis} />
    </BatteryPageShell>
  );
}
