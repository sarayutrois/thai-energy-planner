import { Badge } from "@/components/ui/badge";
import { MainNav } from "@/components/main-nav";
import { getScenarioDemo, normalizeScenarioProfile } from "@/lib/scenario-demo";
import { ScenarioView } from "../scenario-view";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ScenarioComparePage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
  const comparison = getScenarioDemo(normalizeScenarioProfile(getSingleParam(params.profile)), getNumberParam(params.meterCost, 2500));

  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="flex flex-wrap gap-2">
          <Badge>Scenario Compare</Badge>
          <Badge variant="outline">Normal vs TOU vs Shift</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">เปรียบเทียบ Scenario</h1>
        <div className="mt-6">
          <ScenarioView comparison={comparison} />
        </div>
      </section>
    </main>
  );
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getNumberParam(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(getSingleParam(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
