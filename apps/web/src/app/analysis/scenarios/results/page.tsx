import { Badge } from "@/components/ui/badge";
import { LocalBillResultContext } from "@/components/local-bill-result-context";
import { MainNav } from "@/components/main-nav";
import { getScenarioDemo, normalizeScenarioProfile } from "@/lib/scenario-demo";
import type { LocalAnalysisReportDraft } from "@/lib/local-analysis-snapshot";
import { ScenarioView } from "../scenario-view";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ScenarioResultsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
  const isSavedBillStart = getSingleParam(params.source) === "bills";
  const profile = normalizeScenarioProfile(getSingleParam(params.profile));
  const meterCost = getNumberParam(params.meterCost, 2500);
  const shiftPercent = getNumberParam(params.shiftPercent, 25);
  const monthlyKwh = getNumberParam(params.monthlyKwh, 0);
  const billMonthCount = getNumberParam(params.billMonthCount, 0);
  const [targetStart = "22:00", targetEnd = "06:00"] = (getSingleParam(params.targetWindow) ?? "22:00-06:00").split("-");
  const comparison = getScenarioDemo(profile, meterCost, {
    name: "User load shift setting",
    sourceStartTime: getSingleParam(params.sourceStart) ?? "18:00",
    sourceEndTime: getSingleParam(params.sourceEnd) ?? "22:00",
    targetStartTime: targetStart,
    targetEndTime: targetEnd,
    shiftPercentOfPeak: Math.min(100, Math.max(0, shiftPercent))
  }, {
    billMonthCount: billMonthCount > 0 ? billMonthCount : undefined,
    monthlyKwh: monthlyKwh > 0 ? monthlyKwh : undefined,
    source: isSavedBillStart ? "bill" : "demo"
  });
  const reportDraft = buildScenarioReportDraft({
    comparison,
    meterCost,
    profile,
    shiftPercent,
    sourceEnd: getSingleParam(params.sourceEnd) ?? "22:00",
    sourceStart: getSingleParam(params.sourceStart) ?? "18:00",
    targetWindow: getSingleParam(params.targetWindow) ?? "22:00-06:00"
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
          ผลลัพธ์นี้ใช้ official tariff seed พร้อม profile ที่ scale จากบิลที่บันทึกไว้เมื่อมีข้อมูล หรือใช้ generated profile สำหรับการสาธิต
        </p>
        <LocalBillResultContext enabled={isSavedBillStart} moduleName="Scenario" reportDraft={reportDraft} />
        <div className="mt-6">
          <ScenarioView comparison={comparison} />
        </div>
      </section>
    </main>
  );
}

function buildScenarioReportDraft({
  comparison,
  meterCost,
  profile,
  shiftPercent,
  sourceEnd,
  sourceStart,
  targetWindow
}: {
  comparison: ReturnType<typeof getScenarioDemo>;
  meterCost: number;
  profile: string;
  shiftPercent: number;
  sourceEnd: string;
  sourceStart: string;
  targetWindow: string;
}): LocalAnalysisReportDraft {
  const rows = [comparison.baseline, ...comparison.scenarios];
  return {
    module: "scenario",
    moduleLabel: "Scenario",
    title: `Scenario comparison - ${profile}`,
    summary: `Best option is ${comparison.bestScenario.name} with an estimated monthly bill of ${formatNumber(comparison.bestScenario.monthlyEstimatedBill)} baht.`,
    metrics: [
      { label: "ตัวเลือกที่แนะนำ", value: comparison.bestScenario.name },
      { label: "ค่าไฟต่ำสุด/เดือน", value: `${formatNumber(comparison.bestScenario.monthlyEstimatedBill)} บาท` },
      { label: "ประหยัด/ปี", value: `${formatNumber(comparison.bestScenario.savingsAnnual)} บาท` },
      { label: "Data quality", value: `${comparison.dataQuality.level} ${comparison.dataQuality.score}/100` }
    ],
    assumptions: [
      { label: "Profile", value: profile },
      { label: "Meter switching cost", value: `${formatNumber(meterCost)} บาท` },
      { label: "Shift percent", value: `${formatNumber(shiftPercent)}%` },
      { label: "Source window", value: `${sourceStart}-${sourceEnd}` },
      { label: "Target window", value: targetWindow }
    ],
    resultRows: rows.map((scenario) => ({
      scenario: scenario.name,
      monthlyBillThb: round(scenario.monthlyEstimatedBill),
      annualBillThb: round(scenario.annualEstimatedBill),
      savingsMonthlyThb: round(scenario.savingsMonthly),
      savingsAnnualThb: round(scenario.savingsAnnual),
      effectiveRateThbPerKwh: round(scenario.effectiveRatePerKwh)
    })),
    recommendations: comparison.recommendations.map((recommendation) => ({
      title: recommendation.title,
      description: recommendation.explanation,
      nextAction: recommendation.nextAction
    }))
  };
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getNumberParam(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(getSingleParam(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}

function round(value: number) {
  return Number(value.toFixed(2));
}
