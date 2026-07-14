import { SampleBillNotice } from "@/components/sample-bill-notice";
import {
  getSolarAssumptionDraft,
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
  const { settings, queryString } = getSolarAssumptionDraft(
    (await searchParams) ?? {},
  );

  return (
    <SolarPageShell active="overview" queryString={queryString}>
      <AnalysisGoalBanner />
      <SampleBillNotice />
      <SolarApiRuntimePanel settings={settings} />
    </SolarPageShell>
  );
}
