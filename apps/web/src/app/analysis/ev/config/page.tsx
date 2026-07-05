import { getEvDemo, type Phase6SearchParams } from "@/lib/phase6-demo";
import { EvControls, EvPageShell, EvSourcePanel, EvSummary } from "../ev-page-parts";

export default async function EvConfigPage({ searchParams }: { searchParams?: Promise<Phase6SearchParams> }) {
  const { demo, selectedScenario, comparison, settings, queryString, savedBillContext } = getEvDemo((await searchParams) ?? {});

  return (
    <EvPageShell active="config" queryString={queryString}>
      <EvControls settings={settings} action="/analysis/ev/config" savedBillContext={savedBillContext} />
      <EvSummary selectedScenario={selectedScenario} comparison={comparison} />
      <EvSourcePanel demo={demo} selectedScenario={selectedScenario} />
    </EvPageShell>
  );
}
