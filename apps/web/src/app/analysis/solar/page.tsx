import { getSolarDemo, type SolarSearchParams } from "@/lib/solar-demo";
import {
  BillComparisonTable,
  RecommendationCards,
  SolarChartsSection,
  SolarControls,
  SolarPageShell,
  SolarSummary
} from "./solar-page-parts";
import { LocalSolarStart } from "./local-solar-start";

export default async function SolarOverviewPage({ searchParams }: { searchParams?: Promise<SolarSearchParams> }) {
  const { analysis, settings, queryString } = getSolarDemo((await searchParams) ?? {});

  return (
    <SolarPageShell active="overview" queryString={queryString}>
      <SolarControls settings={settings} action="/analysis/solar/results" />
      <LocalSolarStart />
      <SolarSummary analysis={analysis} />
      <SolarChartsSection analysis={analysis} />
      <BillComparisonTable analysis={analysis} />
      <RecommendationCards analysis={analysis} />
    </SolarPageShell>
  );
}
