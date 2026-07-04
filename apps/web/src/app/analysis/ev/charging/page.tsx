import { getEvDemo, type Phase6SearchParams } from "@/lib/phase6-demo";
import { EvChargingTable, EvChartsSection, EvPageShell, EvSourcePanel, EvSummary } from "../ev-page-parts";

export default async function EvChargingPage({ searchParams }: { searchParams?: Promise<Phase6SearchParams> }) {
  const { demo, selectedScenario, comparison, queryString } = getEvDemo((await searchParams) ?? {});

  return (
    <EvPageShell active="charging" queryString={queryString}>
      <EvSummary selectedScenario={selectedScenario} comparison={comparison} />
      <EvSourcePanel demo={demo} selectedScenario={selectedScenario} />
      <EvChartsSection demo={demo} selectedScenario={selectedScenario} comparison={comparison} />
      <EvChargingTable selectedScenario={selectedScenario} />
    </EvPageShell>
  );
}
