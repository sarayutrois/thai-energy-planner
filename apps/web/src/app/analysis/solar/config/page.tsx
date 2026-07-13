import { getSolarDemo, type SolarSearchParams } from "@/lib/solar-demo";
import { SolarControls, SolarPageShell } from "../solar-page-parts";
import { GoalDrivenCopilot } from "../goal-driven-copilot";

export default async function SolarConfigPage({
  searchParams,
}: {
  searchParams?: Promise<SolarSearchParams>;
}) {
  const { settings, queryString, savedBillContext } = getSolarDemo(
    (await searchParams) ?? {},
  );

  return (
    <SolarPageShell active="config" queryString={queryString}>
      <GoalDrivenCopilot currentSettings={settings} />
      <SolarControls
        settings={settings}
        action="/analysis/solar/results"
        savedBillContext={savedBillContext}
        submitLabel="ยืนยันสมมติฐานและดูผล"
        showSizingLink={false}
      />
    </SolarPageShell>
  );
}
