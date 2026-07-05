import { LocalBillResultContext } from "@/components/local-bill-result-context";
import { getEvDemo, type Phase6SearchParams } from "@/lib/phase6-demo";
import type { LocalAnalysisReportDraft } from "@/lib/local-analysis-snapshot";
import {
  EvChartsSection,
  EvComparisonTable,
  EvControls,
  EvPageShell,
  EvRecommendations,
  EvSourcePanel,
  EvSummary
} from "../ev-page-parts";

export default async function EvResultsPage({ searchParams }: { searchParams?: Promise<Phase6SearchParams> }) {
  const params = (await searchParams) ?? {};
  const { demo, selectedScenario, comparison, settings, queryString, savedBillContext } = getEvDemo(params);
  const reportDraft = buildEvReportDraft({ comparison, selectedScenario, settings });

  return (
    <EvPageShell active="results" queryString={queryString}>
      <EvControls settings={settings} action="/analysis/ev/results" savedBillContext={savedBillContext} />
      <LocalBillResultContext enabled={getSingleParam(params.source) === "bills"} moduleName="EV" reportDraft={reportDraft} />
      <EvSummary selectedScenario={selectedScenario} comparison={comparison} />
      <EvSourcePanel demo={demo} selectedScenario={selectedScenario} />
      <EvComparisonTable comparison={comparison} />
      <EvChartsSection demo={demo} selectedScenario={selectedScenario} comparison={comparison} />
      <EvRecommendations comparison={comparison} />
    </EvPageShell>
  );
}

function buildEvReportDraft({
  comparison,
  selectedScenario,
  settings
}: {
  comparison: ReturnType<typeof getEvDemo>["comparison"];
  selectedScenario: ReturnType<typeof getEvDemo>["selectedScenario"];
  settings: ReturnType<typeof getEvDemo>["settings"];
}): LocalAnalysisReportDraft {
  return {
    module: "ev",
    moduleLabel: "EV",
    title: `EV charging analysis - ${settings.strategy}`,
    summary: `${selectedScenario.strategy} adds ${formatNumber(selectedScenario.addedEvKwh)} kWh/month with an estimated bill increase of ${formatNumber(selectedScenario.monthlyBillIncreaseThb)} baht/month.`,
    metrics: [
      { label: "Selected strategy", value: selectedScenario.strategy },
      { label: "Added EV energy", value: `${formatNumber(selectedScenario.addedEvKwh)} kWh/เดือน` },
      { label: "Monthly increase", value: `${formatNumber(selectedScenario.monthlyBillIncreaseThb)} บาท` },
      { label: "Cost / 100 km", value: selectedScenario.costPer100Km === null ? "-" : `${formatNumber(selectedScenario.costPer100Km)} บาท` },
      { label: "Best strategy", value: comparison.bestChargingStrategy.strategy }
    ],
    assumptions: [
      { label: "Profile", value: settings.profile },
      { label: "Charging strategy", value: settings.strategy },
      { label: "Daily distance", value: `${settings.dailyDistanceKm} km` },
      { label: "Charger power", value: `${settings.chargerPowerKw} kW` },
      { label: "Arrival", value: settings.arrivalTime },
      { label: "Departure", value: settings.departureTime },
      { label: "SOC target", value: `${settings.initialSocPercent}% -> ${settings.targetSocPercent}%` }
    ],
    resultRows: comparison.scenarios.map((scenario) => ({
      strategy: scenario.strategy,
      status: scenario.chargingCompletionStatus,
      addedEvKwh: round(scenario.addedEvKwh),
      monthlyBillIncreaseThb: round(scenario.monthlyBillIncreaseThb),
      annualBillIncreaseThb: round(scenario.annualBillIncreaseThb),
      costPer100KmThb: scenario.costPer100Km === null ? null : round(scenario.costPer100Km),
      gridImportIncreaseKwh: round(scenario.gridImportIncreaseKwh),
      peakDemandIncreaseKw: round(scenario.peakDemandIncreaseKw)
    })),
    recommendations: comparison.recommendations.map((recommendation) => ({
      title: recommendation.title,
      description: recommendation.explanation
    }))
  };
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}

function round(value: number) {
  return Number(value.toFixed(2));
}
