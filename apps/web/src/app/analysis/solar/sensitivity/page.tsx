import { getSolarDemo, type SolarSearchParams } from "@/lib/solar-demo";
import { RecommendationCards, SensitivityTable, SolarChartsSection, SolarControls, SolarPageShell, SolarSummary } from "../solar-page-parts";

export default async function SolarSensitivityPage({ searchParams }: { searchParams?: Promise<SolarSearchParams> }) {
  const { analysis, settings, queryString, savedBillContext } = getSolarDemo((await searchParams) ?? {});

  return (
    <SolarPageShell active="sensitivity" queryString={queryString}>
      <SolarControls settings={settings} action="/analysis/solar/sensitivity" savedBillContext={savedBillContext} />
      <SolarSummary analysis={analysis} />
      <SensitivityTable analysis={analysis} />
      <SolarChartsSection analysis={analysis} />
      <RecommendationCards analysis={analysis} />
    </SolarPageShell>
  );
}
