import { getSolarDemo, type SolarSearchParams } from "@/lib/solar-demo";
import {
  ConfigDetails,
  SolarControls,
  SolarPageShell,
  SolarSummary,
} from "../solar-page-parts";
import { GoalDrivenCopilot } from "../goal-driven-copilot";

export default async function SolarConfigPage({
  searchParams,
}: {
  searchParams?: Promise<SolarSearchParams>;
}) {
  const { analysis, settings, queryString, savedBillContext } = getSolarDemo(
    (await searchParams) ?? {},
  );

  return (
    <SolarPageShell active="config" queryString={queryString}>
      <GoalDrivenCopilot currentSettings={settings} />
      <SolarControls
        settings={settings}
        action="/analysis/solar/config"
        savedBillContext={savedBillContext}
      />
      <SolarSummary analysis={analysis} />
      <ConfigDetails analysis={analysis} />
    </SolarPageShell>
  );
}
