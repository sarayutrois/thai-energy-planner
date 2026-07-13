import { getSolarDemo, type SolarSearchParams } from "@/lib/solar-demo";
import type { LocalAnalysisReportDraft } from "@/lib/local-analysis-snapshot";
import {
  formatApproximateMoneyRange,
  solarReadinessCopy,
} from "@/lib/solar-readiness-copy";
import {
  BillComparisonTable,
  ModelQualityPanel,
  RecommendationCards,
  SolarChartsSection,
  SolarControls,
  SolarDecisionSummary,
  SolarPageShell,
  SolarSummary,
} from "../solar-page-parts";
import { ExportReportButton } from "@/components/export-report-button";
import { AiExecutiveSummary } from "../ai-executive-summary";
import { SolarApiRuntimePanel } from "../solar-api-runtime-panel";

export default async function SolarResultsPage({
  searchParams,
}: {
  searchParams?: Promise<SolarSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const { analysis, settings, queryString, savedBillContext } =
    getSolarDemo(params);
  const reportDraft = buildSolarReportDraft(analysis, settings);
  void reportDraft;

  return (
    <SolarPageShell active="results" queryString={queryString}>
      <div id="solar-report" className="space-y-6">
        <SolarDecisionSummary analysis={analysis} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">สรุปผลการวิเคราะห์</h2>
          <ExportReportButton
            targetId="solar-report"
            filename="solar-analysis-report.pdf"
          />
        </div>
        <RecommendationCards analysis={analysis} />
        <ModelQualityPanel analysis={analysis} />
        <details className="rounded-xl border border-border bg-card p-4">
          <summary className="cursor-pointer font-semibold">
            ปรับสมมติฐานและดูรายละเอียดการคำนวณ
          </summary>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            ผลนี้เป็นแบบจำลองเบื้องต้นจากสมมติฐานที่เลือก
            ควรตรวจสอบข้อมูลจริงและแหล่งข้อมูลทางการก่อนลงทุน
          </p>
          <div className="mt-4 grid gap-6">
            <SolarControls
              settings={settings}
              action="/analysis/solar/results"
              savedBillContext={savedBillContext}
            />
            <SolarApiRuntimePanel settings={settings} />
            <SolarSummary analysis={analysis} />
            <BillComparisonTable analysis={analysis} />
            <SolarChartsSection analysis={analysis} />
          </div>
        </details>
        <AiExecutiveSummary analysis={analysis} />
      </div>
    </SolarPageShell>
  );
}

function buildSolarReportDraft(
  analysis: ReturnType<typeof getSolarDemo>["analysis"],
  settings: ReturnType<typeof getSolarDemo>["settings"],
): LocalAnalysisReportDraft {
  const recommended = analysis.sizing.recommended;
  const decisionLabel = recommended
    ? `เหมาะสำหรับพิจารณาที่ ${recommended.systemSizeKwp} kWp`
    : "ยังไม่แนะนำติดตั้งตามข้อมูลปัจจุบัน";
  const comparisonRows = [
    analysis.billComparison.normalWithoutSolar,
    analysis.billComparison.touWithoutSolar,
    analysis.billComparison.normalWithSolar,
    analysis.billComparison.touWithSolar,
  ];

  return {
    module: "solar",
    moduleLabel: "Solar",
    reportTitle: solarReadinessCopy.reportTitle,
    disclaimer: solarReadinessCopy.globalDisclaimer,
    printedAtLabel: new Date().toLocaleDateString("th-TH"),
    title: `รายงานสรุป Solar simulation - ${settings.profile}`,
    summary: `${decisionLabel}. แบบจำลองนี้ประเมินทางเลือกหลังติดตั้ง Solar ว่า ${analysis.billComparison.bestWithSolar.label} มีประมาณการลดค่าใช้จ่ายรายปีราว ${formatApproximateMoneyRange(
      analysis.billComparison.netAnnualBenefit,
    )} ต่อปี ภายใต้สมมติฐาน screening estimate และมีระดับความมั่นใจ ${analysis.modelQuality.label} (${analysis.modelQuality.score}/100)`,
    metrics: [
      { label: "ผลตัดสินใจ Solar", value: decisionLabel },
      { label: "ขนาดที่กำลังประเมิน", value: `${settings.systemSizeKwp} kWp` },
      {
        label: "ขนาดที่ผ่านเกณฑ์",
        value: recommended
          ? `${recommended.systemSizeKwp} kWp`
          : "ไม่มีขนาดที่ผ่านเกณฑ์",
      },
      {
        label: "รูปแบบค่าไฟที่เหมาะหลังติด Solar",
        value: analysis.billComparison.bestWithSolar.label,
      },
      {
        label: "ประมาณการลดค่าใช้จ่ายรายปี",
        value: `${formatApproximateMoneyRange(analysis.billComparison.netAnnualBenefit)}/ปี`,
      },
      {
        label: "สัดส่วนไฟ Solar ที่ใช้ภายในสถานที่",
        value: `${formatNumber(analysis.selfConsumption.selfConsumptionRatio * 100)}%`,
      },
      {
        label: "สัดส่วนไฟฟ้าที่ส่งกลับเข้าสู่ระบบ",
        value: `${formatNumber(analysis.selfConsumption.exportRatio * 100)}%`,
      },
      {
        label: "ระยะเวลาคืนทุน",
        value: analysis.financial.simplePaybackYears
          ? `${analysis.financial.simplePaybackYears} ปี`
          : "-",
      },
      {
        label: "NPV",
        value: `${formatNumber(analysis.financial.npvThb)} บาท`,
      },
      {
        label: "IRR",
        value:
          analysis.financial.irrPercent === null
            ? "-"
            : `${formatNumber(analysis.financial.irrPercent)}%`,
      },
      {
        label: "ความมั่นใจของแบบจำลอง",
        value: `${analysis.modelQuality.label} (${analysis.modelQuality.score}/100)`,
      },
      {
        label: "Downside NPV",
        value: `${formatNumber(analysis.sensitivity.downsideCase.npvThb)} บาท`,
      },
      {
        label: "Upside NPV",
        value: `${formatNumber(analysis.sensitivity.upsideCase.npvThb)} บาท`,
      },
    ],
    assumptions: [
      { label: "รูปแบบการใช้ไฟ", value: settings.profile },
      { label: "มิเตอร์ฐาน", value: settings.baseline },
      { label: "Model mode", value: settings.modelMode },
      { label: "ขนาดระบบ", value: `${settings.systemSizeKwp} kWp` },
      { label: "พื้นที่หลังคา", value: `${settings.roofAreaSqm} ตร.ม.` },
      { label: "ทิศหลังคา", value: `${settings.roofAzimuth} องศา` },
      { label: "ความเอียงหลังคา", value: `${settings.roofTilt} องศา` },
      { label: "System loss", value: `${settings.systemLossPercent}%` },
      { label: "Shading loss", value: `${settings.shadingLossPercent}%` },
      {
        label: "Degradation",
        value: `${settings.degradationPercentPerYear}%/ปี`,
      },
      { label: "เงินลงทุน", value: `${formatNumber(settings.capexThb)} บาท` },
      {
        label: "O&M",
        value: `${formatNumber(settings.oAndMCostPerYear)} บาท/ปี`,
      },
      { label: "อายุโครงการ", value: `${settings.projectLifeYears} ปี` },
      { label: "อัตราคิดลด", value: `${settings.discountRatePercent}%` },
      {
        label: "Electricity escalation",
        value: `${settings.electricityEscalationRatePercent}%/ปี`,
      },
      {
        label: "Inverter replacement",
        value: `${formatNumber(settings.inverterReplacementCostThb)} บาท ในปีที่ ${settings.inverterReplacementYear || "-"}`,
      },
      {
        label: "อัตรารับซื้อไฟฟ้า",
        value: `${settings.exportRateThbPerKwh} บาท/kWh`,
      },
      { label: "กำลังส่งกลับสูงสุด", value: `${settings.exportLimitKw} kW` },
    ],
    sections: [
      {
        title: "ข้อมูลที่ใช้ในการวิเคราะห์ (User Inputs)",
        items: [
          { label: "สถานที่ตั้ง / พื้นที่", value: settings.province },
          { label: "ลักษณะโหลด", value: settings.profile },
          {
            label: "ประเภทผู้ใช้จาก saved bills",
            value: getAudienceLabel(settings.profile),
          },
          {
            label: "ค่าไฟและโหลดตั้งต้น",
            value:
              "อ้างอิงจาก screening load profile หรือ saved bills context ที่ผู้ใช้เลือก",
          },
        ],
      },
      {
        title: "สรุปผลการประเมินเบื้องต้น (Simulation Results)",
        items: [
          { label: "ขนาดระบบที่จำลอง", value: `${settings.systemSizeKwp} kWp` },
          {
            label: "ขนาดที่ผ่านเกณฑ์ความคุ้มค่า",
            value: recommended
              ? `${recommended.systemSizeKwp} kWp (NPV ${formatNumber(recommended.npvThb)} บาท)`
              : "ไม่มีขนาดที่ทั้ง NPV เป็นบวกและคืนทุนภายในอายุโครงการ",
          },
          {
            label: "ประมาณการผลิตไฟฟ้าต่อปี",
            value: `${formatNumber(analysis.solarProfile.annualGenerationKwh)} kWh/ปี`,
          },
          {
            label: "ประมาณการลดค่าใช้จ่ายรายปี",
            value: `${formatApproximateMoneyRange(analysis.billComparison.netAnnualBenefit)}/ปี`,
          },
          {
            label: "Downside / Upside NPV",
            value: `${formatNumber(analysis.sensitivity.downsideCase.npvThb)} / ${formatNumber(analysis.sensitivity.upsideCase.npvThb)} บาท`,
          },
        ],
        paragraphs: [
          "ตัวเลขผลประหยัดแสดงเป็นช่วงโดยประมาณเพื่อลดความเข้าใจผิดว่าเป็นการการันตีผลลัพธ์จริง",
        ],
      },
      {
        title: "ค่าใช้จ่ายที่อาจเกิดขึ้นในอนาคต",
        items: [
          {
            label: "O&M",
            value: `${formatNumber(settings.oAndMCostPerYear)} บาท/ปี`,
          },
          {
            label: "Inverter replacement",
            value: `${formatNumber(settings.inverterReplacementCostThb)} บาท ในปีที่ ${settings.inverterReplacementYear || "-"}`,
          },
        ],
        paragraphs: [solarReadinessCopy.hiddenCostLimitation],
      },
    ],
    resultRows: [
      ...comparisonRows.map((row) => ({
        scenario: row.label,
        monthlyBillThb: round(row.monthlyBillThb),
        annualBillThb: round(row.annualBillThb),
        annualGridImportKwh: round(row.annualGridImportKwh),
        annualGridExportKwh: round(row.annualGridExportKwh),
        annualBillSavingsThb: round(row.annualBillSavingsThb),
        annualExportRevenueThb: round(row.annualExportRevenueThb),
      })),
      {
        scenario: "Sensitivity downside",
        npvThb: round(analysis.sensitivity.downsideCase.npvThb),
        paybackYears: analysis.sensitivity.downsideCase.simplePaybackYears,
        irrPercent: analysis.sensitivity.downsideCase.irrPercent,
      },
      {
        scenario: "Sensitivity upside",
        npvThb: round(analysis.sensitivity.upsideCase.npvThb),
        paybackYears: analysis.sensitivity.upsideCase.simplePaybackYears,
        irrPercent: analysis.sensitivity.upsideCase.irrPercent,
      },
    ],
    references: [
      { label: "Base tariff", value: solarReadinessCopy.tariffReference },
      { label: "Solar yield", value: solarReadinessCopy.yieldReference },
      { label: "Export tariff", value: solarReadinessCopy.exportReference },
      {
        label: "Ft note",
        value:
          "รายงานนี้ยังไม่ผูกกับค่า Ft production รอบปัจจุบัน ต้องระบุรอบ Ft หากเปิดใช้ข้อมูลจริง",
      },
    ],
    limitations: [
      {
        title: "ข้อจำกัดของรายงาน",
        description: solarReadinessCopy.hiddenCostLimitation,
        nextAction: solarReadinessCopy.nextStep,
      },
      {
        title: "สถานะข้อมูล",
        description:
          "ข้อมูล tariff ใช้ tariff snapshot พร้อม source metadata ส่วน export rate และ solar yield ยังเป็นค่าประเมินเบื้องต้นที่ควรตรวจสอบกับแหล่งทางการก่อนลงทุนจริง",
        nextAction:
          "ตรวจสอบ MEA/PEA/ERC/Global Solar Atlas/DEDE ก่อนใช้รายงานประกอบการลงทุนจริง",
      },
    ],
    recommendations: [
      ...analysis.modelQuality.risks.map((risk) => ({
        title: risk.title,
        description: risk.explanation,
        nextAction: risk.mitigation,
      })),
      ...analysis.recommendations.map((recommendation) => ({
        title: recommendation.title,
        description: recommendation.explanation,
        nextAction: recommendation.nextAction,
      })),
    ],
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function getAudienceLabel(profile: string) {
  if (profile.includes("shop")) return "ธุรกิจ / ร้านค้า";
  return "บ้านพักอาศัย";
}
