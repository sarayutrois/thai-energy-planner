import { Badge } from "@/components/ui/badge";
import { LocalBillResultContext } from "@/components/local-bill-result-context";
import { MainNav } from "@/components/main-nav";
import { getScenarioDemo, normalizeScenarioProfile } from "@/lib/scenario-demo";
import type { LocalAnalysisReportDraft } from "@/lib/local-analysis-snapshot";
import { z } from "zod";
import { ScenarioView } from "../scenario-view";

type SearchParams = Record<string, string | string[] | undefined>;

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const targetWindowSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/);
const scenarioSearchParamsSchema = z.object({
  billMonthCount: z.coerce.number().int().min(0).max(120).catch(0),
  meterCost: z.coerce.number().min(0).max(500_000).catch(2500),
  monthlyKwh: z.coerce.number().min(0).max(1_000_000).catch(0),
  profile: z.string().trim().max(80).optional(),
  shiftPercent: z.coerce.number().min(0).max(100).catch(25),
  source: z.string().trim().max(40).optional(),
  sourceEnd: timeSchema.catch("22:00"),
  sourceStart: timeSchema.catch("18:00"),
  targetWindow: targetWindowSchema.catch("22:00-06:00"),
});

export default async function ScenarioResultsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const validatedParams = scenarioSearchParamsSchema.parse(
    flattenSearchParams(params),
  );
  const isSavedBillStart = validatedParams.source === "bills";
  const profile = normalizeScenarioProfile(validatedParams.profile);
  const meterCost = validatedParams.meterCost;
  const shiftPercent = validatedParams.shiftPercent;
  const monthlyKwh = validatedParams.monthlyKwh;
  const billMonthCount = validatedParams.billMonthCount;
  const [targetStart, targetEnd] = validatedParams.targetWindow.split("-") as [
    string,
    string,
  ];
  const comparison = getScenarioDemo(
    profile,
    meterCost,
    {
      name: "User load shift setting",
      sourceStartTime: validatedParams.sourceStart,
      sourceEndTime: validatedParams.sourceEnd,
      targetStartTime: targetStart,
      targetEndTime: targetEnd,
      shiftPercentOfPeak: shiftPercent,
    },
    {
      billMonthCount: billMonthCount > 0 ? billMonthCount : undefined,
      monthlyKwh: monthlyKwh > 0 ? monthlyKwh : undefined,
      source: isSavedBillStart ? "bill" : "demo",
    },
  );
  const reportDraft = buildScenarioReportDraft({
    comparison,
    meterCost,
    profile,
    shiftPercent,
    sourceEnd: validatedParams.sourceEnd,
    sourceStart: validatedParams.sourceStart,
    targetWindow: validatedParams.targetWindow,
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
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">
          ผลการจำลอง Scenario
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          ผลลัพธ์นี้ใช้ tariff snapshot พร้อม profile ที่ scale จาก saved bills
          เมื่อมีข้อมูล หรือใช้ sample screening profile
          สำหรับทดลองประเมินเบื้องต้น
        </p>
        <LocalBillResultContext
          enabled={isSavedBillStart}
          moduleName="Scenario"
          reportDraft={reportDraft}
        />
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
  targetWindow,
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
  const bestFinancial = comparison.financialComparison.bestScenario;
  const bestTrace = comparison.bestScenario.calculationTrace;
  const shiftedScenario = comparison.scenarios.find(
    (scenario) => scenario.kind === "LOAD_SHIFT_TO_OFF_PEAK",
  );
  const loadShiftTrace = shiftedScenario?.calculationTrace.loadShift;
  return {
    module: "scenario",
    moduleLabel: "Scenario",
    reportTitle: "Scenario screening estimate report",
    disclaimer:
      "รายงานนี้เป็น screening estimate จาก saved bills หรือ sample data และ tariff snapshot ที่ระบบมีอยู่ ไม่ใช่คำแนะนำทางการหรือใบเสนอราคาจริง",
    title: `Scenario comparison - ${profile}`,
    summary: `Best option is ${comparison.bestScenario.name} with an estimated monthly bill of ${formatNumber(comparison.bestScenario.monthlyEstimatedBill)} baht.`,
    metrics: [
      { label: "ตัวเลือกที่แนะนำ", value: comparison.bestScenario.name },
      {
        label: "ค่าไฟต่ำสุด/เดือน",
        value: `${formatNumber(comparison.bestScenario.monthlyEstimatedBill)} บาท`,
      },
      {
        label: "ประหยัด/ปี",
        value: `${formatNumber(comparison.bestScenario.savingsAnnual)} บาท`,
      },
      {
        label: "Core annual cost",
        value: `${formatNumber(bestFinancial.annualCostThb)} บาท`,
      },
      {
        label: "Core annual saving",
        value: `${formatNumber(bestFinancial.annualSavingThb)} บาท`,
      },
      {
        label: "Data quality",
        value: `${comparison.dataQuality.level} ${comparison.dataQuality.score}/100`,
      },
    ],
    assumptions: [
      { label: "Profile", value: profile },
      {
        label: "Meter switching cost",
        value: `${formatNumber(meterCost)} บาท`,
      },
      { label: "Shift percent", value: `${formatNumber(shiftPercent)}%` },
      { label: "Source window", value: `${sourceStart}-${sourceEnd}` },
      { label: "Target window", value: targetWindow },
      {
        label: "Report basis",
        value: "saved bills when available, otherwise sample screening profile",
      },
    ],
    resultRows: rows.map((scenario) => ({
      scenario: scenario.name,
      monthlyBillThb: round(scenario.monthlyEstimatedBill),
      annualBillThb: round(scenario.annualEstimatedBill),
      savingsMonthlyThb: round(scenario.savingsMonthly),
      savingsAnnualThb: round(scenario.savingsAnnual),
      effectiveRateThbPerKwh: round(scenario.effectiveRatePerKwh),
    })),
    recommendations: comparison.recommendations.map((recommendation) => ({
      title: recommendation.title,
      description: recommendation.explanation,
      nextAction: recommendation.nextAction,
    })),
    sections: [
      {
        title: "Tariff snapshot",
        items: [
          { label: "Tariff version", value: bestTrace.tariffVersionLabel },
          { label: "Tariff status", value: bestTrace.tariffStatus },
          {
            label: "Source",
            value: bestTrace.sourceUrl ?? "embedded tariff snapshot",
          },
          {
            label: "Bill date",
            value: String(comparison.bestScenario.assumptions.billDate ?? "-"),
          },
        ],
        paragraphs: [
          "Scenario calculations use the tariff snapshot captured in the calculation trace, including TOU classification, Ft, VAT, service charge, weekends, and holidays.",
        ],
      },
      {
        title: "Data quality",
        items: [
          { label: "Level", value: comparison.dataQuality.level },
          { label: "Score", value: `${comparison.dataQuality.score}/100` },
          {
            label: "Interval days",
            value: `${comparison.dataQuality.metrics.intervalDays}`,
          },
          {
            label: "Bill months",
            value: `${comparison.dataQuality.metrics.billMonthCount}`,
          },
          {
            label: "Missing ratio",
            value: `${formatNumber(comparison.dataQuality.metrics.missingRatio * 100)}%`,
          },
        ],
        paragraphs: [
          ...comparison.dataQuality.reasons,
          ...(comparison.dataQuality.limitations.length > 0
            ? comparison.dataQuality.limitations
            : [
                "No additional data quality limitations were returned by the calculation engine.",
              ]),
        ],
      },
      {
        title: "Calculation core trace",
        items: [
          {
            label: "Baseline annual cost",
            value: `${formatNumber(comparison.financialComparison.baselineAnnualCostThb)} บาท`,
          },
          {
            label: "Best financial scenario",
            value: bestFinancial.scenarioName,
          },
          { label: "Recommendation", value: bestFinancial.recommendation },
          {
            label: "Best scenario intervals traced",
            value: `${bestTrace.intervalTraceCount}`,
          },
          {
            label: "Load shifted",
            value: loadShiftTrace
              ? `${formatNumber(loadShiftTrace.actualShiftKwh)} kWh from peak to off-peak`
              : "No load shift trace",
          },
        ],
        paragraphs: bestFinancial.recommendationReasons,
      },
      {
        title: "Methodology",
        paragraphs: [
          "Scenario annual savings are calculated by comparing each annual cost against Current Normal.",
          "TOU period classification and bill breakdown come from tariff-engine configuration, including Ft, VAT, service charge, weekends, and holidays.",
        ],
      },
    ],
    references: [
      {
        label: "Tariff snapshot",
        value: `${bestTrace.tariffVersionLabel} (${bestTrace.tariffStatus})`,
      },
      {
        label: "Calculation engine",
        value: String(
          comparison.bestScenario.assumptions.engineVersion ??
            "scenario engine",
        ),
      },
    ],
    limitations: [
      {
        title: "Screening estimate only",
        description:
          "ผลลัพธ์ใช้เพื่อคัดกรองทางเลือกเบื้องต้น ต้องตรวจสอบ tariff รอบล่าสุด เงื่อนไขการเปลี่ยนมิเตอร์ และรูปแบบโหลดจริงก่อนตัดสินใจ",
        nextAction:
          "เก็บข้อมูลโหลดหรือบิลให้ครบขึ้น แล้วตรวจเงื่อนไขกับ MEA/PEA ก่อนดำเนินการจริง",
      },
      {
        title: "Data quality affects confidence",
        description:
          comparison.dataQuality.limitations.join(" ") ||
          "ไม่มีข้อจำกัดเพิ่มเติมจาก calculation engine แต่ยังควรตรวจข้อมูลต้นทางก่อนใช้จริง",
        nextAction:
          "เพิ่มข้อมูลให้ใกล้ 12 เดือนหรือใช้ interval load profile เมื่อมีข้อมูลละเอียด",
      },
    ],
  };
}

function flattenSearchParams(params: SearchParams) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function round(value: number) {
  return Number(value.toFixed(2));
}
