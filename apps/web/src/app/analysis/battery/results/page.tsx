import { LocalBillResultContext } from "@/components/local-bill-result-context";
import { getBatteryDemo, type Phase6SearchParams } from "@/lib/phase6-demo";
import type { LocalAnalysisReportDraft } from "@/lib/local-analysis-snapshot";
import {
  BatteryChartsSection,
  BatteryControls,
  BatteryFinancialTable,
  BatteryPageShell,
  BatteryRecommendations,
  BatterySourcePanel,
  BatterySummary
} from "../battery-page-parts";
import { AiBatterySummary } from "../ai-battery-summary";

export default async function BatteryResultsPage({ searchParams }: { searchParams?: Promise<Phase6SearchParams> }) {
  const params = (await searchParams) ?? {};
  const { analysis, settings, queryString, savedBillContext } = getBatteryDemo(params);
  const reportDraft = buildBatteryReportDraft(analysis, settings);

  return (
    <BatteryPageShell active="results" queryString={queryString}>
      <BatteryControls settings={settings} action="/analysis/battery/results" savedBillContext={savedBillContext} />
      <LocalBillResultContext enabled={getSingleParam(params.source) === "bills"} moduleName="Battery" reportDraft={reportDraft} />
      <AiBatterySummary analysis={analysis} settings={settings} />
      <BatterySummary analysis={analysis} />
      <BatterySourcePanel analysis={analysis} />
      <BatteryFinancialTable analysis={analysis} />
      <BatteryChartsSection analysis={analysis} />
      <BatteryRecommendations analysis={analysis} />
    </BatteryPageShell>
  );
}

function buildBatteryReportDraft(
  analysis: ReturnType<typeof getBatteryDemo>["analysis"],
  settings: ReturnType<typeof getBatteryDemo>["settings"]
): LocalAnalysisReportDraft {
  return {
    module: "battery",
    moduleLabel: "Battery",
    title: `Battery analysis - ${settings.profile}`,
    summary: `Battery ${settings.capacityKwh} kWh using ${settings.strategy} changes the estimated monthly bill from ${formatNumber(analysis.financial.billBeforeBatteryThb)} to ${formatNumber(analysis.financial.billAfterBatteryThb)} baht.`,
    metrics: [
      { label: "Monthly before", value: `${formatNumber(analysis.financial.billBeforeBatteryThb)} บาท` },
      { label: "Monthly after", value: `${formatNumber(analysis.financial.billAfterBatteryThb)} บาท` },
      { label: "Annual savings", value: `${formatNumber(analysis.financial.annualBillSavingsThb)} บาท` },
      { label: "Self-consumption", value: `${formatNumber(analysis.dispatch.selfConsumptionAfterRatio * 100)}%` },
      { label: "Payback", value: analysis.financial.simplePaybackYears ? `${analysis.financial.simplePaybackYears} ปี` : "-" }
    ],
    assumptions: [
      { label: "Profile", value: settings.profile },
      { label: "Dispatch strategy", value: settings.strategy },
      { label: "Capacity", value: `${settings.capacityKwh} kWh` },
      { label: "Usable capacity", value: `${settings.usableCapacityKwh} kWh` },
      { label: "Charge power", value: `${settings.chargePowerKw} kW` },
      { label: "Discharge power", value: `${settings.dischargePowerKw} kW` },
      { label: "CAPEX", value: `${formatNumber(settings.capexThb)} บาท` }
    ],
    resultRows: [
      {
        scenario: "Before battery",
        monthlyBillThb: round(analysis.financial.billBeforeBatteryThb),
        annualBillThb: round(analysis.financial.billBeforeBatteryThb * 12),
        peakDemandKw: round(analysis.dispatch.peakDemandBeforeKw),
        gridImportKwh: round(analysis.dispatch.gridImportBeforeKwh),
        gridExportKwh: round(analysis.dispatch.gridExportBeforeKwh)
      },
      {
        scenario: "After battery",
        monthlyBillThb: round(analysis.financial.billAfterBatteryThb),
        annualBillThb: round(analysis.financial.billAfterBatteryThb * 12),
        peakDemandKw: round(analysis.dispatch.peakDemandAfterKw),
        gridImportKwh: round(analysis.dispatch.gridImportAfterKwh),
        gridExportKwh: round(analysis.dispatch.gridExportAfterKwh)
      }
    ],
    recommendations: analysis.recommendations.map((recommendation) => ({
      title: recommendation.title,
      description: recommendation.explanation,
      nextAction: recommendation.nextAction
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
