import { getSolarDemo, type SolarSearchParams } from "@/lib/solar-demo";
import {
  FinancialTable,
  RecommendationCards,
  SolarChartsSection,
  SolarControls,
  SolarPageShell,
  SolarSummary,
} from "../solar-page-parts";

export default async function SolarFinancePage({
  searchParams,
}: {
  searchParams?: Promise<SolarSearchParams>;
}) {
  const { analysis, settings, queryString, savedBillContext } = getSolarDemo(
    (await searchParams) ?? {},
  );

  return (
    <SolarPageShell active="finance" queryString={queryString}>
      <SolarControls
        settings={settings}
        action="/analysis/solar/finance"
        savedBillContext={savedBillContext}
      />
      <SolarSummary analysis={analysis} />
      <FinancialTable analysis={analysis} />
      <SolarChartsSection analysis={analysis} />
      <RecommendationCards analysis={analysis} />
    </SolarPageShell>
  );
}
