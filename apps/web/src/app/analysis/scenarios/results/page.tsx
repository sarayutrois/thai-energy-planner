import { Badge } from "@/components/ui/badge";
import { MainNav } from "@/components/main-nav";
import { getScenarioDemo, normalizeScenarioProfile } from "@/lib/scenario-demo";
import { ScenarioView } from "../scenario-view";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ScenarioResultsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
  const profile = normalizeScenarioProfile(getSingleParam(params.profile));
  const meterCost = getNumberParam(params.meterCost, 2500);
  const shiftPercent = getNumberParam(params.shiftPercent, 25);
  const [targetStart = "22:00", targetEnd = "06:00"] = (getSingleParam(params.targetWindow) ?? "22:00-06:00").split("-");
  const comparison = getScenarioDemo(profile, meterCost, {
    name: "User load shift setting",
    sourceStartTime: getSingleParam(params.sourceStart) ?? "18:00",
    sourceEndTime: getSingleParam(params.sourceEnd) ?? "22:00",
    targetStartTime: targetStart,
    targetEndTime: targetEnd,
    shiftPercentOfPeak: Math.min(100, Math.max(0, shiftPercent))
  });

  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="flex flex-wrap gap-2">
          <Badge>Scenario Results</Badge>
          <Badge variant="outline">{profile}</Badge>
          <Badge variant="warning">ไม่รวม Solar/Battery/EV</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">ผลการจำลอง Scenario</h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          ผลลัพธ์นี้ใช้ demo tariff แบบ draft และ synthetic load profile เพื่อทดสอบ Scenario Engine เท่านั้น
        </p>
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
