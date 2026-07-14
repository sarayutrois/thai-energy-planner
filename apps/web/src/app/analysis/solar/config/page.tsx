import {
  getSolarAssumptionDraft,
  hasExplicitSolarAssumptions,
  type SolarSearchParams,
} from "@/lib/solar-assumptions";
import { SolarControls, SolarPageShell } from "../solar-page-parts";
import { GoalDrivenCopilot } from "../goal-driven-copilot";

export default async function SolarConfigPage({
  searchParams,
}: {
  searchParams?: Promise<SolarSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const { settings, savedBillContext } = getSolarAssumptionDraft(params);

  return (
    <SolarPageShell active="config">
      <GoalDrivenCopilot currentSettings={settings} />
      <SolarControls
        settings={settings}
        action="/analysis/solar"
        preferInitialSettings={hasExplicitSolarAssumptions(params)}
        savedBillContext={savedBillContext}
        submitLabel="บันทึกสมมติฐานและกลับไปตรวจข้อมูล"
        showSizingLink={false}
      />
    </SolarPageShell>
  );
}
