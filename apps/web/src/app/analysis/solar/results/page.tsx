import { LocalBillResultContext } from "@/components/local-bill-result-context";
import { getSolarDemo, type SolarSearchParams } from "@/lib/solar-demo";
import type { LocalAnalysisReportDraft } from "@/lib/local-analysis-snapshot";
import { formatApproximateMoneyRange, solarReadinessCopy } from "@/lib/solar-readiness-copy";
import {
  BillComparisonTable,
  ModelQualityPanel,
  RecommendationCards,
  SolarChartsSection,
  SolarControls,
  SolarPageShell,
  SolarSummary
} from "../solar-page-parts";

export default async function SolarResultsPage({ searchParams }: { searchParams?: Promise<SolarSearchParams> }) {
  const params = (await searchParams) ?? {};
  const { analysis, settings, queryString, savedBillContext } = getSolarDemo(params);
  const reportDraft = buildSolarReportDraft(analysis, settings);

  return (
    <SolarPageShell active="results" queryString={queryString}>
      <SolarControls settings={settings} action="/analysis/solar/results" savedBillContext={savedBillContext} />
      <LocalBillResultContext enabled={getSingleParam(params.source) === "bills"} moduleName="Solar" reportDraft={reportDraft} />
      <SolarSummary analysis={analysis} />
      <ModelQualityPanel analysis={analysis} />
      <BillComparisonTable analysis={analysis} />
      <SolarChartsSection analysis={analysis} />
      <RecommendationCards analysis={analysis} />
    </SolarPageShell>
  );
}

function buildSolarReportDraft(
  analysis: ReturnType<typeof getSolarDemo>["analysis"],
  settings: ReturnType<typeof getSolarDemo>["settings"]
): LocalAnalysisReportDraft {
  const comparisonRows = [
    analysis.billComparison.normalWithoutSolar,
    analysis.billComparison.touWithoutSolar,
    analysis.billComparison.normalWithSolar,
    analysis.billComparison.touWithSolar
  ];

  return {
    module: "solar",
    moduleLabel: "Solar",
    reportTitle: solarReadinessCopy.reportTitle,
    disclaimer: solarReadinessCopy.globalDisclaimer,
    printedAtLabel: new Date().toLocaleDateString("th-TH"),
    title: `รายงานสรุป Solar simulation - ${settings.profile}`,
    summary: `แบบจำลองนี้ประเมินทางเลือกหลังติดตั้ง Solar ว่า ${analysis.billComparison.bestWithSolar.label} มีประมาณการลดค่าใช้จ่ายรายปีราว ${formatApproximateMoneyRange(
      analysis.billComparison.netAnnualBenefit
    )} ต่อปี ภายใต้สมมติฐาน demo/draft และมีระดับความมั่นใจ ${analysis.modelQuality.label} (${analysis.modelQuality.score}/100)`,
    metrics: [
      { label: "Best after solar", value: analysis.billComparison.bestWithSolar.label },
      { label: "ประมาณการลดค่าใช้จ่ายรายปี", value: `${formatApproximateMoneyRange(analysis.billComparison.netAnnualBenefit)}/ปี` },
      { label: "Self-consumption", value: `${formatNumber(analysis.selfConsumption.selfConsumptionRatio * 100)}%` },
      { label: "Export ratio", value: `${formatNumber(analysis.selfConsumption.exportRatio * 100)}%` },
      { label: "Payback", value: analysis.financial.simplePaybackYears ? `${analysis.financial.simplePaybackYears} years` : "-" },
      { label: "NPV", value: `${formatNumber(analysis.financial.npvThb)} baht` },
      { label: "IRR", value: analysis.financial.irrPercent === null ? "-" : `${formatNumber(analysis.financial.irrPercent)}%` },
      { label: "Model confidence", value: `${analysis.modelQuality.label} (${analysis.modelQuality.score}/100)` },
      { label: "Downside NPV", value: `${formatNumber(analysis.sensitivity.downsideCase.npvThb)} baht` },
      { label: "Upside NPV", value: `${formatNumber(analysis.sensitivity.upsideCase.npvThb)} baht` }
    ],
    assumptions: [
      { label: "Profile", value: settings.profile },
      { label: "Baseline", value: settings.baseline },
      { label: "Model mode", value: settings.modelMode },
      { label: "System size", value: `${settings.systemSizeKwp} kWp` },
      { label: "Roof area", value: `${settings.roofAreaSqm} sqm` },
      { label: "Roof azimuth", value: `${settings.roofAzimuth} degree` },
      { label: "Roof tilt", value: `${settings.roofTilt} degree` },
      { label: "System loss", value: `${settings.systemLossPercent}%` },
      { label: "Shading loss", value: `${settings.shadingLossPercent}%` },
      { label: "Degradation", value: `${settings.degradationPercentPerYear}%/year` },
      { label: "CAPEX", value: `${formatNumber(settings.capexThb)} baht` },
      { label: "O&M", value: `${formatNumber(settings.oAndMCostPerYear)} baht/year` },
      { label: "Project life", value: `${settings.projectLifeYears} years` },
      { label: "Discount rate", value: `${settings.discountRatePercent}%` },
      { label: "Electricity escalation", value: `${settings.electricityEscalationRatePercent}%/year` },
      { label: "Inverter replacement", value: `${formatNumber(settings.inverterReplacementCostThb)} baht in year ${settings.inverterReplacementYear || "-"}` },
      { label: "Export rate", value: `${settings.exportRateThbPerKwh} baht/kWh` },
      { label: "Export limit", value: `${settings.exportLimitKw} kW` }
    ],
    sections: [
      {
        title: "ข้อมูลที่ใช้ในการวิเคราะห์ (User Inputs)",
        items: [
          { label: "สถานที่ตั้ง / พื้นที่", value: settings.province },
          { label: "ลักษณะโหลด", value: settings.profile },
          { label: "ประเภทผู้ใช้จาก saved bills", value: getAudienceLabel(settings.profile) },
          { label: "ค่าไฟและโหลดตั้งต้น", value: "อ้างอิงจาก demo load profile หรือ saved bills context ที่ผู้ใช้เลือก" }
        ]
      },
      {
        title: "สรุปผลการประเมินเบื้องต้น (Simulation Results)",
        items: [
          { label: "ขนาดระบบที่จำลอง", value: `${settings.systemSizeKwp} kWp` },
          {
            label: "ประมาณการผลิตไฟฟ้าต่อปี",
            value: `${formatNumber(analysis.solarProfile.annualGenerationKwh)} kWh/year`
          },
          {
            label: "ประมาณการลดค่าใช้จ่ายรายปี",
            value: `${formatApproximateMoneyRange(analysis.billComparison.netAnnualBenefit)}/ปี`
          },
          { label: "Downside / Upside NPV", value: `${formatNumber(analysis.sensitivity.downsideCase.npvThb)} / ${formatNumber(analysis.sensitivity.upsideCase.npvThb)} baht` }
        ],
        paragraphs: [
          "ตัวเลขผลประหยัดแสดงเป็นช่วงโดยประมาณเพื่อลดความเข้าใจผิดว่าเป็นการการันตีผลลัพธ์จริง"
        ]
      },
      {
        title: "ค่าใช้จ่ายที่อาจเกิดขึ้นในอนาคต",
        items: [
          { label: "O&M", value: `${formatNumber(settings.oAndMCostPerYear)} baht/year` },
          { label: "Inverter replacement", value: `${formatNumber(settings.inverterReplacementCostThb)} baht in year ${settings.inverterReplacementYear || "-"}` }
        ],
        paragraphs: [solarReadinessCopy.hiddenCostLimitation]
      }
    ],
    resultRows: [
      ...comparisonRows.map((row) => ({
        scenario: row.label,
        monthlyBillThb: round(row.monthlyBillThb),
        annualBillThb: round(row.annualBillThb),
        annualGridImportKwh: round(row.annualGridImportKwh),
        annualGridExportKwh: round(row.annualGridExportKwh),
        annualBillSavingsThb: round(row.annualBillSavingsThb),
        annualExportRevenueThb: round(row.annualExportRevenueThb)
      })),
      {
        scenario: "Sensitivity downside",
        npvThb: round(analysis.sensitivity.downsideCase.npvThb),
        paybackYears: analysis.sensitivity.downsideCase.simplePaybackYears,
        irrPercent: analysis.sensitivity.downsideCase.irrPercent
      },
      {
        scenario: "Sensitivity upside",
        npvThb: round(analysis.sensitivity.upsideCase.npvThb),
        paybackYears: analysis.sensitivity.upsideCase.simplePaybackYears,
        irrPercent: analysis.sensitivity.upsideCase.irrPercent
      }
    ],
    references: [
      { label: "Base tariff", value: solarReadinessCopy.tariffReference },
      { label: "Solar yield", value: solarReadinessCopy.yieldReference },
      { label: "Export tariff", value: solarReadinessCopy.exportReference },
      { label: "Ft note", value: "รายงานนี้ยังไม่ผูกกับค่า Ft production รอบปัจจุบัน ต้องระบุรอบ Ft หากเปิดใช้ข้อมูลจริง" }
    ],
    limitations: [
      {
        title: "ข้อจำกัดของรายงาน",
        description: solarReadinessCopy.hiddenCostLimitation,
        nextAction: solarReadinessCopy.nextStep
      },
      {
        title: "สถานะข้อมูล",
        description: "ข้อมูล tariff, export rate และ solar yield ใน workflow นี้ยังเป็น demo/draft เว้นแต่มีการแทนด้วยแหล่งทางการที่ตรวจสอบแล้ว",
        nextAction: "ตรวจสอบ MEA/PEA/ERC/Global Solar Atlas/DEDE ก่อนใช้รายงานประกอบการลงทุนจริง"
      }
    ],
    recommendations: [
      ...analysis.modelQuality.risks.map((risk) => ({
        title: risk.title,
        description: risk.explanation,
        nextAction: risk.mitigation
      })),
      ...analysis.recommendations.map((recommendation) => ({
        title: recommendation.title,
        description: recommendation.explanation,
        nextAction: recommendation.nextAction
      }))
    ]
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

function getAudienceLabel(profile: string) {
  if (profile.includes("shop")) return "ธุรกิจ / ร้านค้า";
  return "บ้านพักอาศัย";
}
