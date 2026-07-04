import type { ScenarioComparisonResult, ScenarioResult } from "@thai-energy-planner/calculation-engine";
import { AlertTriangle, BadgeCheck, Info, ReceiptText, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioComparisonCharts } from "@/components/scenario-comparison-charts";

export function ScenarioView({ comparison }: { comparison: ScenarioComparisonResult }) {
  const allScenarios = [comparison.baseline, ...comparison.scenarios];
  const shifted = comparison.scenarios.find((scenario) => scenario.kind === "LOAD_SHIFT_TO_OFF_PEAK");
  const loadShift = shifted?.calculationTrace.loadShift;

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="ตัวเลือกที่แนะนำ" value={comparison.bestScenario.name} />
        <Metric label="ค่าไฟต่ำสุด/เดือน" value={`${formatNumber(comparison.bestScenario.grandTotal)} บาท`} />
        <Metric label="Off-Peak ปัจจุบัน" value={`${formatNumber(comparison.breakEven.currentOffPeakRatio)}%`} />
        <Metric label="Data Quality" value={`${comparison.dataQuality.level} ${comparison.dataQuality.score}/100`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown aria-hidden="true" className="h-5 w-5 text-primary" />
            ตารางเปรียบเทียบ Scenario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Scenario</th>
                  <th className="px-3 py-2">Monthly Bill</th>
                  <th className="px-3 py-2">Annual Bill</th>
                  <th className="px-3 py-2">Peak kWh</th>
                  <th className="px-3 py-2">Off-Peak kWh</th>
                  <th className="px-3 py-2">Effective Rate</th>
                  <th className="px-3 py-2">Savings / Month</th>
                  <th className="px-3 py-2">Savings / Year</th>
                  <th className="px-3 py-2">Payback</th>
                  <th className="px-3 py-2">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {allScenarios.map((scenario) => (
                  <tr key={scenario.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{scenario.name}</td>
                    <td className="px-3 py-2">{formatNumber(scenario.monthlyEstimatedBill)}</td>
                    <td className="px-3 py-2">{formatNumber(scenario.annualEstimatedBill)}</td>
                    <td className="px-3 py-2">{formatNumber(scenario.peakKwh)}</td>
                    <td className="px-3 py-2">{formatNumber(scenario.offPeakKwh)}</td>
                    <td className="px-3 py-2">{formatNumber(scenario.effectiveRatePerKwh)}</td>
                    <td className="px-3 py-2">{formatSigned(scenario.savingsMonthly)}</td>
                    <td className="px-3 py-2">{formatSigned(scenario.savingsAnnual)}</td>
                    <td className="px-3 py-2">{scenario.paybackMonths ? `${formatNumber(scenario.paybackMonths)} เดือน` : "-"}</td>
                    <td className="px-3 py-2">{scenario.id === comparison.bestScenario.id ? "แนะนำ" : "เปรียบเทียบ"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ScenarioComparisonCharts
        scenarios={allScenarios.map((scenario) => ({
          name: shortName(scenario.name),
          monthlyBill: scenario.monthlyEstimatedBill,
          annualBill: scenario.annualEstimatedBill,
          peakKwh: scenario.peakKwh,
          offPeakKwh: scenario.offPeakKwh,
          annualSavings: scenario.savingsAnnual
        }))}
        loadShift={
          loadShift
            ? [
                { label: "ก่อน Shift", peakKwh: loadShift.sourcePeakKwhBefore, offPeakKwh: loadShift.targetOffPeakKwhBefore },
                { label: "หลัง Shift", peakKwh: loadShift.sourcePeakKwhAfter, offPeakKwh: loadShift.targetOffPeakKwhAfter }
              ]
            : [
                { label: "Normal", peakKwh: comparison.baseline.peakKwh, offPeakKwh: comparison.baseline.offPeakKwh },
                { label: "Best", peakKwh: comparison.bestScenario.peakKwh, offPeakKwh: comparison.bestScenario.offPeakKwh }
              ]
        }
      />

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
              <div key={`${recommendation.type}-${recommendation.title}`} className="rounded-md border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{recommendation.type}</Badge>
                  <Badge variant="outline">priority {recommendation.priority}</Badge>
                  <Badge variant={recommendation.confidence === "high" ? "default" : "outline"}>{recommendation.confidence}</Badge>
                </div>
                <h3 className="mt-3 font-semibold">{recommendation.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{recommendation.explanation}</p>
                <p className="mt-2 text-sm font-medium">{recommendation.nextAction}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info aria-hidden="true" className="h-5 w-5 text-primary" />
              Break-even และข้อจำกัดข้อมูล
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm leading-6">
            <div className="rounded-md border border-border p-4">
              <p>{comparison.breakEven.explanation}</p>
              <dl className="mt-3 grid gap-2">
                <BreakEvenRow label="Off-Peak ที่ต้องมี" value={`${formatNumber(comparison.breakEven.requiredOffPeakRatio)}%`} />
                <BreakEvenRow label="kWh ที่ควรย้าย/เดือน" value={`${formatNumber(comparison.breakEven.requiredShiftKwhPerMonth)} kWh`} />
                <BreakEvenRow label="ประหยัดหลัง Shift" value={`${formatNumber(comparison.breakEven.estimatedSavingsAfterShift)} บาท/เดือน`} />
                <BreakEvenRow label="Payback" value={comparison.breakEven.paybackMonths ? `${formatNumber(comparison.breakEven.paybackMonths)} เดือน` : "-"} />
              </dl>
            </div>
            <div className="rounded-md border border-border p-4">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle aria-hidden="true" className="h-4 w-4" />
                Data quality
              </div>
              <p className="mt-2 text-muted-foreground">{comparison.dataQuality.reasons.join(" ")}</p>
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
            Breakdown ของ Scenario ที่แนะนำ
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
            <th className="px-3 py-2">Component</th>
            <th className="px-3 py-2">Quantity</th>
            <th className="px-3 py-2">Rate</th>
            <th className="px-3 py-2">Amount</th>
          </tr>
        </thead>
        <tbody>
          {scenario.calculationTrace.lineItems.map((item) => (
            <tr key={item.component} className="border-t border-border">
              <td className="px-3 py-2">{item.labelTh}</td>
              <td className="px-3 py-2">
                {item.quantity} {item.unit}
              </td>
              <td className="px-3 py-2">{item.rate ?? "-"}</td>
              <td className="px-3 py-2">{formatNumber(Number(item.amountThb))}</td>
            </tr>
          ))}
          <tr className="border-t border-border font-medium">
            <td className="px-3 py-2">VAT</td>
            <td className="px-3 py-2">-</td>
            <td className="px-3 py-2">-</td>
            <td className="px-3 py-2">{formatNumber(scenario.vat)}</td>
          </tr>
          <tr className="border-t border-border font-semibold">
            <td className="px-3 py-2">Grand total</td>
            <td className="px-3 py-2">-</td>
            <td className="px-3 py-2">-</td>
            <td className="px-3 py-2">{formatNumber(scenario.grandTotal)}</td>
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

function shortName(value: string) {
  return value.replace("Switch to TOU - ", "TOU ").replace("Load Shift to ", "Shift ");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${formatNumber(value)}`;
}
