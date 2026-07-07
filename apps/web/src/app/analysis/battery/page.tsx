export const dynamic = 'force-dynamic';

import { getBatteryDemo, type Phase6SearchParams } from "@/lib/phase6-demo";
import {
  BatteryChartsSection,
  BatteryControls,
  BatteryPageShell,
  BatteryRecommendations,
  BatterySourcePanel,
  BatterySummary
} from "./battery-page-parts";
import { LocalBatteryStart } from "./local-battery-start";

export default async function BatteryOverviewPage({ searchParams }: { searchParams?: Promise<Phase6SearchParams> }) {
  const { analysis, settings, queryString, savedBillContext } = getBatteryDemo((await searchParams) ?? {});

  return (
    <BatteryPageShell active="overview" queryString={queryString}>
      <BatteryControls settings={settings} action="/analysis/battery/results" savedBillContext={savedBillContext} />
      <LocalBatteryStart />
      <BatterySummary analysis={analysis} />
      <BatterySourcePanel analysis={analysis} />
      <BatteryChartsSection analysis={analysis} />
      <BatteryRecommendations analysis={analysis} />
    </BatteryPageShell>
  );
}
