import type {
  ScenarioComparisonResult,
  ScenarioResult,
} from "@thai-energy-planner/calculation-engine";
import {
  AlertTriangle,
  BadgeCheck,
  Info,
  ReceiptText,
  TrendingDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioComparisonCharts } from "@/components/scenario-comparison-charts";
import { DecisionStory } from "@/components/decision-story";

export function ScenarioView({
  comparison,
}: {
  comparison: ScenarioComparisonResult;
}) {
  const allScenarios = [comparison.baseline, ...comparison.scenarios];
  const shifted = comparison.scenarios.find(
    (scenario) => scenario.kind === "LOAD_SHIFT_TO_OFF_PEAK",
  );
  const loadShift = shifted?.calculationTrace.loadShift;
  const primaryRecommendation = comparison.recommendations[0];
  const bestScenario = comparison.bestScenario;

  return (
    <div className="grid gap-5">
      <DecisionStory
        title={formatScenarioName(bestScenario.name)}
        reason={
          primaryRecommendation?.explanation ??
          formatBreakEvenSummary(comparison)
        }
        evidence={[
          {
            label: "ผลต่างจากแผนฐาน",
            value: `${formatSigned(bestScenario.savingsAnnual)} บาท/ปี`,
          },
          {
            label: "สัดส่วน Off-Peak ปัจจุบัน",
            value: `${formatNumber(comparison.breakEven.currentOffPeakRatio)}%`,
          },
          {
            label: "ข้อมูลที่ใช้เปรียบเทียบ",
            value: `${comparison.dataQuality.metrics.intervalDays} วัน`,
          },
        ]}
        limitations={comparison.dataQuality.limitations.slice(0, 2)}
        nextAction={
          primaryRecommendation?.nextAction ??
          "ตรวจรายการเครื่องใช้ไฟฟ้าที่สามารถย้ายเวลาใช้งานได้ก่อนตัดสินใจเปลี่ยนมิเตอร์"
        }
        confidence={`ความน่าเชื่อถือ ${formatDataQuality(comparison.dataQuality.level)} · ${comparison.dataQuality.score}/100`}
        tone={comparison.dataQuality.level === "LOW" ? "caution" : "positive"}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Metric
          label="ทางเลือกที่เหมาะกับคุณ"
          value={formatScenarioName(comparison.bestScenario.name)}
        />
        <Metric
          label="ค่าไฟที่คาดว่าจะจ่าย"
          value={`${formatNumber(comparison.bestScenario.grandTotal)} บาท/เดือน`}
        />
        <Metric
          label="ใช้ไฟช่วง Off-Peak"
          value={`${formatNumber(comparison.breakEven.currentOffPeakRatio)}%`}
        />
        <Metric
          label="ความน่าเชื่อถือของข้อมูล"
          value={`${formatDataQuality(comparison.dataQuality.level)} ${comparison.dataQuality.score}/100`}
        />
      </div>

      <details className="group rounded-2xl border border-border/90 bg-card/80 shadow-panel">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 font-semibold md:p-6">
          <span className="flex items-center gap-2">
            <TrendingDown aria-hidden="true" className="h-5 w-5 text-primary" />
            ดูตารางและกราฟเปรียบเทียบ
          </span>
          <span className="text-sm font-medium text-muted-foreground group-open:hidden">
            เปิดรายละเอียด
          </span>
          <span className="hidden text-sm font-medium text-muted-foreground group-open:inline">
            ซ่อนรายละเอียด
          </span>
        </summary>
        <div className="grid gap-5 border-t border-border/80 p-5 md:p-6">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">ทางเลือก</th>
                  <th className="px-3 py-2">ค่าไฟ/เดือน</th>
                  <th className="px-3 py-2">ค่าไฟ/ปี</th>
                  <th className="px-3 py-2">Peak kWh</th>
                  <th className="px-3 py-2">Off-Peak kWh</th>
                  <th className="px-3 py-2">ค่าเฉลี่ย/หน่วย</th>
                  <th className="px-3 py-2">ประหยัด/เดือน</th>
                  <th className="px-3 py-2">ประหยัด/ปี</th>
                  <th className="px-3 py-2">คืนทุน</th>
                  <th className="px-3 py-2">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {allScenarios.map((scenario) => (
                  <tr key={scenario.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">
                      {formatScenarioName(scenario.name)}
                    </td>
                    <td className="px-3 py-2">
                      {formatNumber(scenario.monthlyEstimatedBill)}
                    </td>
                    <td className="px-3 py-2">
                      {formatNumber(scenario.annualEstimatedBill)}
                    </td>
                    <td className="px-3 py-2">
                      {formatNumber(scenario.peakKwh)}
                    </td>
                    <td className="px-3 py-2">
                      {formatNumber(scenario.offPeakKwh)}
                    </td>
                    <td className="px-3 py-2">
                      {formatNumber(scenario.effectiveRatePerKwh)}
                    </td>
                    <td className="px-3 py-2">
                      {formatSigned(scenario.savingsMonthly)}
                    </td>
                    <td className="px-3 py-2">
                      {formatSigned(scenario.savingsAnnual)}
                    </td>
                    <td className="px-3 py-2">
                      {scenario.paybackMonths
                        ? `${formatNumber(scenario.paybackMonths)} เดือน`
                        : "-"}
                    </td>
                    <td className="px-3 py-2">
                      {scenario.id === comparison.bestScenario.id
                        ? "เหมาะสมที่สุด"
                        : "เปรียบเทียบ"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ScenarioComparisonCharts
            scenarios={allScenarios.map((scenario) => ({
              name: formatScenarioName(scenario.name),
              monthlyBill: scenario.monthlyEstimatedBill,
              annualBill: scenario.annualEstimatedBill,
              peakKwh: scenario.peakKwh,
              offPeakKwh: scenario.offPeakKwh,
              annualSavings: scenario.savingsAnnual,
            }))}
            loadShift={
              loadShift
                ? [
                    {
                      label: "ก่อน Shift",
                      peakKwh: loadShift.sourcePeakKwhBefore,
                      offPeakKwh: loadShift.targetOffPeakKwhBefore,
                    },
                    {
                      label: "หลัง Shift",
                      peakKwh: loadShift.sourcePeakKwhAfter,
                      offPeakKwh: loadShift.targetOffPeakKwhAfter,
                    },
                  ]
                : [
                    {
                      label: "แบบปกติ",
                      peakKwh: comparison.baseline.peakKwh,
                      offPeakKwh: comparison.baseline.offPeakKwh,
                    },
                    {
                      label: "ทางเลือกที่เหมาะ",
                      peakKwh: comparison.bestScenario.peakKwh,
                      offPeakKwh: comparison.bestScenario.offPeakKwh,
                    },
                  ]
            }
          />
        </div>
      </details>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck aria-hidden="true" className="h-5 w-5 text-primary" />
              คำแนะนำ
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {comparison.recommendations.map((recommendation) => (
              <div
                key={`${recommendation.type}-${recommendation.title}`}
                className="rounded-md border border-border p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      recommendation.priority === 1 ? "success" : "outline"
                    }
                  >
                    {formatPriority(recommendation.priority)}
                  </Badge>
                  <Badge
                    variant={
                      recommendation.confidence === "high"
                        ? "default"
                        : "outline"
                    }
                  >
                    {formatConfidence(recommendation.confidence)}
                  </Badge>
                </div>
                <h3 className="mt-3 font-semibold">{recommendation.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {recommendation.explanation}
                </p>
                <p className="mt-2 text-sm font-medium">
                  {recommendation.nextAction}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info aria-hidden="true" className="h-5 w-5 text-primary" />
              เงื่อนไขและความน่าเชื่อถือ
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm leading-6">
            <div className="rounded-md border border-border p-4">
              <p>{formatBreakEvenSummary(comparison)}</p>
              <dl className="mt-3 grid gap-2">
                <BreakEvenRow
                  label="สัดส่วน Off-Peak ที่ควรมี"
                  value={`${formatNumber(comparison.breakEven.requiredOffPeakRatio)}%`}
                />
                <BreakEvenRow
                  label="พลังงานที่ควรย้ายต่อเดือน"
                  value={`${formatNumber(comparison.breakEven.requiredShiftKwhPerMonth)} kWh`}
                />
                <BreakEvenRow
                  label="ประหยัดได้หลังย้ายเวลา"
                  value={`${formatNumber(comparison.breakEven.estimatedSavingsAfterShift)} บาท/เดือน`}
                />
                <BreakEvenRow
                  label="ระยะคืนทุนค่าเปลี่ยนมิเตอร์"
                  value={
                    comparison.breakEven.paybackMonths
                      ? `${formatNumber(comparison.breakEven.paybackMonths)} เดือน`
                      : "ไม่ต้องมีค่าเปลี่ยนมิเตอร์"
                  }
                />
              </dl>
            </div>
            <div className="rounded-md border border-border p-4">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle aria-hidden="true" className="h-4 w-4" />
                คุณภาพข้อมูล
              </div>
              <p className="mt-2 text-muted-foreground">
                มีข้อมูลช่วงเวลา {comparison.dataQuality.metrics.intervalDays}{" "}
                วัน · ความน่าเชื่อถือ{" "}
                {formatDataQuality(comparison.dataQuality.level)} (
                {comparison.dataQuality.score}/100)
              </p>
              {comparison.dataQuality.limitations.length > 0 ? (
                <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                  {comparison.dataQuality.limitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText aria-hidden="true" className="h-5 w-5 text-primary" />
            รายละเอียดค่าไฟของทางเลือกที่เหมาะ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BreakdownTable scenario={comparison.bestScenario} />
        </CardContent>
      </Card>
    </div>
  );
}

function BreakdownTable({ scenario }: { scenario: ScenarioResult }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-3 py-2">องค์ประกอบค่าไฟ</th>
            <th className="px-3 py-2 text-right">ปริมาณ</th>
            <th className="px-3 py-2 text-right">อัตรา</th>
            <th className="px-3 py-2 text-right">จำนวนเงิน (บาท)</th>
          </tr>
        </thead>
        <tbody>
          {scenario.calculationTrace.lineItems.map((item) => (
            <tr key={item.component} className="border-t border-border">
              <td className="px-3 py-2">{item.labelTh}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatQuantity(item.quantity)} {item.unit}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatRate(item.rate)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatMoney(Number(item.amountThb))}
              </td>
            </tr>
          ))}
          <tr className="border-t border-border font-medium">
            <td className="px-3 py-2">VAT</td>
            <td className="px-3 py-2 text-right">-</td>
            <td className="px-3 py-2 text-right">-</td>
            <td className="px-3 py-2 text-right tabular-nums">
              {formatMoney(scenario.vat)}
            </td>
          </tr>
          <tr className="border-t border-border font-semibold">
            <td className="px-3 py-2">รวมสุทธิ</td>
            <td className="px-3 py-2 text-right">-</td>
            <td className="px-3 py-2 text-right">-</td>
            <td className="px-3 py-2 text-right tabular-nums">
              {formatMoney(scenario.grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-normal">{value}</p>
    </div>
  );
}

function BreakEvenRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function formatScenarioName(value: string) {
  if (value.includes("Load Shift")) return "ย้ายการใช้ไฟไปช่วง Off-Peak";
  if (value.includes("Switch to TOU")) return "เปลี่ยนเป็นมิเตอร์ TOU";
  if (value.includes("Current TOU"))
    return "มิเตอร์ TOU ตามรูปแบบการใช้ไฟปัจจุบัน";
  if (value.includes("Current Normal"))
    return "มิเตอร์ปกติตามรูปแบบการใช้ไฟปัจจุบัน";
  return value;
}

function formatDataQuality(level: string) {
  const normalized = level.toLowerCase();
  return normalized === "high"
    ? "สูง"
    : normalized === "medium"
      ? "ปานกลาง"
      : "ต่ำ";
}

function formatConfidence(value: string) {
  return value === "high"
    ? "มั่นใจสูง"
    : value === "medium"
      ? "มั่นใจปานกลาง"
      : "ควรตรวจเพิ่ม";
}

function formatPriority(value: number) {
  return value === 1
    ? "ควรทำก่อน"
    : value === 2
      ? "ควรพิจารณา"
      : "ข้อมูลประกอบ";
}

function formatBreakEvenSummary(comparison: ScenarioComparisonResult) {
  const touScenario = comparison.scenarios.find((scenario) =>
    scenario.name.includes("Current TOU"),
  );
  const saving = touScenario?.savingsMonthly ?? 0;
  return saving > 0
    ? `จากรูปแบบการใช้ไฟปัจจุบัน มิเตอร์ TOU ประหยัดกว่ามิเตอร์ปกติประมาณ ${formatNumber(saving)} บาท/เดือน.`
    : "จากรูปแบบการใช้ไฟปัจจุบัน มิเตอร์ TOU ยังไม่ช่วยลดค่าไฟมากกว่ามิเตอร์ปกติ.";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function formatQuantity(value: number | string) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "-";
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 2,
  }).format(numericValue);
}

function formatRate(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "-";
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "-";
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 4,
  }).format(numericValue);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${formatNumber(value)}`;
}
