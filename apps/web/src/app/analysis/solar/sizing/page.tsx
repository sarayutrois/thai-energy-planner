import { getSolarDemo, type SolarSearchParams } from "@/lib/solar-demo";
import { RecommendationCards, SizingTable, SolarChartsSection, SolarControls, SolarPageShell, SolarSummary } from "../solar-page-parts";

export default async function SolarSizingPage({ searchParams }: { searchParams?: Promise<SolarSearchParams> }) {
  const { analysis, settings, queryString } = getSolarDemo((await searchParams) ?? {});

  return (
    <SolarPageShell active="sizing" queryString={queryString}>
      <SolarControls settings={settings} action="/analysis/solar/sizing" />
      <SolarSummary analysis={analysis} />
      <SizingTable analysis={analysis} />
      <SolarChartsSection analysis={analysis} />
      <RecommendationCards analysis={analysis} />
    </SolarPageShell>
  );
}
