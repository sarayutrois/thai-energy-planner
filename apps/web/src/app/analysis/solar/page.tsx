import {
  getSolarAssumptionDraft,
  hasExplicitSolarAssumptions,
  type SolarSearchParams,
} from "@/lib/solar-assumptions";
import { SolarApiRuntimePanel } from "./solar-api-runtime-panel";
import { SolarPageShell } from "./solar-page-parts";
import { AnalysisGoalBanner } from "@/components/analysis-goal-banner";

export default async function SolarOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<SolarSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const { settings } = getSolarAssumptionDraft(params);

  return (
    <SolarPageShell active="overview">
      <AnalysisGoalBanner />
      <SolarApiRuntimePanel
        settings={settings}
        preferInitialSettings={hasExplicitSolarAssumptions(params)}
      />
    </SolarPageShell>
  );
}
