import { getBatteryDemo, type Phase6SearchParams } from "@/lib/phase6-demo";
import {
  BatteryChartsSection,
  BatteryDispatchTable,
  BatteryPageShell,
  BatterySourcePanel,
  BatterySummary
} from "../battery-page-parts";

export default async function BatteryDispatchPage({ searchParams }: { searchParams?: Promise<Phase6SearchParams> }) {
  const { analysis, queryString } = getBatteryDemo((await searchParams) ?? {});

  return (
    <BatteryPageShell active="dispatch" queryString={queryString}>
      <BatterySummary analysis={analysis} />
      <BatterySourcePanel analysis={analysis} />
      <BatteryChartsSection analysis={analysis} />
      <BatteryDispatchTable analysis={analysis} />
    </BatteryPageShell>
  );
}
