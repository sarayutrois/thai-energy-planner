import { getEvDemo, type Phase6SearchParams } from "@/lib/phase6-demo";
import { EvChartsSection, EvControls, EvPageShell, EvRecommendations, EvSourcePanel, EvSummary } from "./ev-page-parts";

export default async function EvOverviewPage({ searchParams }: { searchParams?: Promise<Phase6SearchParams> }) {
  const { demo, selectedScenario, comparison, settings, queryString } = getEvDemo((await searchParams) ?? {});

  return (
    <EvPageShell active="overview" queryString={queryString}>
      <EvControls settings={settings} action="/analysis/ev/results" />
      <EvSummary selectedScenario={selectedScenario} comparison={comparison} />
      <EvSourcePanel demo={demo} selectedScenario={selectedScenario} />
      <EvChartsSection demo={demo} selectedScenario={selectedScenario} comparison={comparison} />
      <EvRecommendations comparison={comparison} />
    </EvPageShell>
  );
}
