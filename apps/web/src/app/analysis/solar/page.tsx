import { SampleBillNotice } from "@/components/sample-bill-notice";
import { getSolarDemo, type SolarSearchParams } from "@/lib/solar-demo";
import { SolarApiRuntimePanel } from "./solar-api-runtime-panel";
import { SolarPageShell } from "./solar-page-parts";

export default async function SolarOverviewPage({ searchParams }: { searchParams?: Promise<SolarSearchParams> }) {
  const { settings, queryString } = getSolarDemo((await searchParams) ?? {});

  return (
    <SolarPageShell active="overview" queryString={queryString}>
      <SampleBillNotice />
      <SolarApiRuntimePanel settings={settings} />
    </SolarPageShell>
  );
}
