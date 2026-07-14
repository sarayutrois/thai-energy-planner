import {
  getSolarAssumptionDraft,
  type SolarSearchParams,
} from "@/lib/solar-assumptions";
import { SolarControls, SolarPageShell } from "../solar-page-parts";
import { GoalDrivenCopilot } from "../goal-driven-copilot";

export default async function SolarConfigPage({
  searchParams,
}: {
  searchParams?: Promise<SolarSearchParams>;
}) {
  const { settings, queryString, savedBillContext } = getSolarAssumptionDraft(
    (await searchParams) ?? {},
  );

  return (
    <SolarPageShell active="config" queryString={queryString}>
      <GoalDrivenCopilot currentSettings={settings} />
      <SolarControls
        settings={settings}
        action="/analysis/solar"
        savedBillContext={savedBillContext}
        submitLabel="บันทึกสมมติฐานและกลับไปตรวจข้อมูล"
        showSizingLink={false}
      />
    </SolarPageShell>
  );
}
