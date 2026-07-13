import type { ReactNode } from "react";
import type { SolarAnalysisResult } from "@thai-energy-planner/calculation-engine";
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Calculator,
  CircleDollarSign,
  Info,
  Settings,
  ShieldCheck,
  SunMedium,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SolarAnalysisCharts } from "@/components/solar-analysis-charts";
import { SolarLocationFields } from "@/components/solar-location-fields";
import type { SolarDemoSettings } from "@/lib/solar-demo";
import { buildSolarQuery, solarProfileOptions } from "@/lib/solar-demo";
import {
  formatApproximateMoneyRange,
  solarReadinessCopy,
} from "@/lib/solar-readiness-copy";
import { PageHeader } from "@/components/ui/page-layout";

type SavedBillContext = {
  audience?: string | undefined;
  source?: string | undefined;
};

const tabs = [
  { key: "overview", href: "/analysis/solar", label: "ภาพรวม" },
  { key: "config", href: "/analysis/solar/config", label: "สมมติฐาน" },
  { key: "results", href: "/analysis/solar/results", label: "ผลลัพธ์" },
  { key: "sizing", href: "/analysis/solar/sizing", label: "ขนาดระบบ" },
  { key: "finance", href: "/analysis/solar/finance", label: "การเงิน" },
  {
    key: "sensitivity",
    href: "/analysis/solar/sensitivity",
    label: "ความไวของผลลัพธ์",
  },
];

export function SolarPageShell({
  active,
  queryString,
  children,
}: {
  active: string;
  queryString: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <PageHeader
          eyebrow={
            <>
              <Badge>ประเมินโซลาร์เซลล์</Badge>
              <Badge className="ml-2" variant="warning">
                ข้อมูลเพื่อประกอบการตัดสินใจ
              </Badge>
            </>
          }
          title="จำลองการติดตั้งโซลาร์เซลล์บนหลังคา"
          description="ประเมินสัดส่วนไฟ Solar ที่ใช้เอง ระยะเวลาคืนทุน ขนาดระบบที่เหมาะสม และความไวของผลลัพธ์ โดยไม่ใช่ใบเสนอราคาหรือการรับประกันผลประหยัด"
        />
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              เลือกดูเฉพาะรายละเอียดที่ต้องใช้เพื่อประกอบการตัดสินใจ
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <a
                key={tab.href}
                href={`${tab.href}?${queryString}`}
                className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition ${
                  active === tab.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </a>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-6">{children}</div>
      </section>
    </main>
  );
}

export function SolarControls({
  settings,
  action,
  savedBillContext,
}: {
  settings: SolarDemoSettings;
  action: string;
  savedBillContext?: SavedBillContext | undefined;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings aria-hidden="true" className="h-5 w-5 text-primary" />
          ข้อมูลสำหรับจำลอง
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-md border border-warning bg-warning/10 p-3 text-sm leading-6 text-warning-foreground">
          {solarReadinessCopy.globalDisclaimer}
        </div>
        {settings.validationMessages.length > 0 ? (
          <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-3 text-sm leading-6 text-destructive">
            {settings.validationMessages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        ) : null}
        <form
          action={action}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <SavedBillHiddenInputs context={savedBillContext} />
          <Field label="Load profile">
            <select
              name="profile"
              defaultValue={settings.profile}
              className={inputClassName}
            >
              {solarProfileOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Baseline meter">
            <select
              name="baseline"
              defaultValue={settings.baseline}
              className={inputClassName}
            >
              <option value="normal">Normal</option>
              <option value="tou">TOU</option>
            </select>
          </Field>
          <Field label="Model detail">
            <select
              name="modelMode"
              defaultValue={settings.modelMode}
              className={inputClassName}
            >
              <option value="easy">แบบประเมินเบื้องต้น</option>
              <option value="advanced">สมมติฐานขั้นสูง</option>
              <option value="xhigh">ตรวจสอบรายละเอียด</option>
            </select>
          </Field>
          <SolarLocationFields
            province={settings.province}
            latitude={settings.latitude}
            longitude={settings.longitude}
          />
          <Field label="Solar size (kWp)">
            <input
              name="systemSizeKwp"
              type="number"
              min="0.1"
              step="0.1"
              defaultValue={settings.systemSizeKwp}
              className={inputClassName}
            />
          </Field>
          <Field label="Roof area (sqm)">
            <input
              name="roofAreaSqm"
              type="number"
              min="0"
              step="1"
              defaultValue={settings.roofAreaSqm}
              className={inputClassName}
            />
          </Field>
          <Field label="Roof azimuth (degree)">
            <input
              name="roofAzimuth"
              type="number"
              min="0"
              max="360"
              step="1"
              defaultValue={settings.roofAzimuth}
              className={inputClassName}
            />
          </Field>
          <Field label="Roof tilt (degree)">
            <input
              name="roofTilt"
              type="number"
              min="0"
              max="60"
              step="1"
              defaultValue={settings.roofTilt}
              className={inputClassName}
            />
          </Field>
          <Field label="System loss (%)">
            <input
              name="systemLossPercent"
              type="number"
              min="0"
              max="100"
              step="0.1"
              defaultValue={settings.systemLossPercent}
              className={inputClassName}
            />
          </Field>
          <Field label="Shading loss (%)">
            <input
              name="shadingLossPercent"
              type="number"
              min="0"
              max="100"
              step="0.1"
              defaultValue={settings.shadingLossPercent}
              className={inputClassName}
            />
          </Field>
          <Field label="Degradation (%/year)">
            <input
              name="degradationPercentPerYear"
              type="number"
              min="0"
              max="100"
              step="0.1"
              defaultValue={settings.degradationPercentPerYear}
              className={inputClassName}
            />
          </Field>
          <Field label="CAPEX (baht)">
            <input
              name="capexThb"
              type="number"
              min="0"
              step="1000"
              defaultValue={settings.capexThb}
              className={inputClassName}
            />
          </Field>
          <Field label="O&M (baht/year)">
            <input
              name="oAndMCostPerYear"
              type="number"
              min="0"
              step="100"
              defaultValue={settings.oAndMCostPerYear}
              className={inputClassName}
            />
          </Field>
          <Field label="Project life (years)">
            <input
              name="projectLifeYears"
              type="number"
              min="1"
              step="1"
              defaultValue={settings.projectLifeYears}
              className={inputClassName}
            />
          </Field>
          <Field label="Discount rate (%)">
            <input
              name="discountRatePercent"
              type="number"
              min="0"
              step="0.1"
              defaultValue={settings.discountRatePercent}
              className={inputClassName}
            />
          </Field>
          <Field label="Electricity escalation (%)">
            <input
              name="electricityEscalationRatePercent"
              type="number"
              min="0"
              step="0.1"
              defaultValue={settings.electricityEscalationRatePercent}
              className={inputClassName}
            />
          </Field>
          <Field label="Inverter replacement (baht)">
            <input
              name="inverterReplacementCostThb"
              type="number"
              min="0"
              step="100"
              defaultValue={settings.inverterReplacementCostThb}
              className={inputClassName}
            />
          </Field>
          <Field label="Inverter year (0 = none)">
            <input
              name="inverterReplacementYear"
              type="number"
              min="0"
              step="1"
              defaultValue={settings.inverterReplacementYear}
              className={inputClassName}
            />
          </Field>
          <Field label="เปิดรับไฟฟ้าที่ส่งกลับเข้าสู่ระบบ">
            <select
              name="exportEnabled"
              defaultValue={String(settings.exportEnabled)}
              className={inputClassName}
            >
              <option value="true">เปิดใช้</option>
              <option value="false">ไม่เปิดใช้</option>
            </select>
          </Field>
          <Field label="อัตรารับซื้อไฟฟ้า (บาท/kWh)">
            <input
              name="exportRateThbPerKwh"
              type="number"
              min="0"
              step="0.01"
              defaultValue={settings.exportRateThbPerKwh}
              className={inputClassName}
            />
          </Field>
          <Field label="กำลังส่งกลับสูงสุด (kW)">
            <input
              name="exportLimitKw"
              type="number"
              min="0"
              step="0.1"
              defaultValue={settings.exportLimitKw}
              className={inputClassName}
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              คำนวณผลใหม่
            </Button>
          </div>
          <div className="flex items-end">
            <a
              href={`/analysis/solar/sizing?${withSavedBillContext(buildSolarQuery(settings), savedBillContext)}`}
              className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            >
              หาขนาดระบบที่เหมาะสม
            </a>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SavedBillHiddenInputs({
  context,
}: {
  context?: SavedBillContext | undefined;
}) {
  if (context?.source !== "bills") return null;
  return (
    <>
      <input name="source" type="hidden" value="bills" />
      {context.audience ? (
        <input name="audience" type="hidden" value={context.audience} />
      ) : null}
    </>
  );
}

function withSavedBillContext(
  queryString: string,
  context?: SavedBillContext | undefined,
) {
  if (context?.source !== "bills") return queryString;

  const params = new URLSearchParams(queryString);
  params.set("source", "bills");
  if (context.audience) params.set("audience", context.audience);
  return params.toString();
}

export function SolarSummary({ analysis }: { analysis: SolarAnalysisResult }) {
  const comparison = analysis.billComparison;
  const recommended = analysis.sizing.recommended;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
      <Metric label="Best after solar" value={comparison.bestWithSolar.label} />
      <Metric
        helpText={solarReadinessCopy.estimatedSavingsHint}
        label="ประมาณการประหยัด/ปี"
        value={`${formatApproximateMoneyRange(comparison.netAnnualBenefit)}/ปี`}
      />
      <Metric
        label="สัดส่วนไฟ Solar ที่ใช้ภายในสถานที่"
        value={formatPercent(analysis.selfConsumption.selfConsumptionRatio)}
      />
      <Metric
        label="ขนาดที่ผ่านเกณฑ์"
        value={
          recommended
            ? `${formatNumber(recommended.systemSizeKwp)} kWp`
            : "ยังไม่มี"
        }
      />
      <Metric
        label="ระยะเวลาคืนทุน"
        value={
          analysis.financial.simplePaybackYears
            ? `${analysis.financial.simplePaybackYears} ปี`
            : "-"
        }
      />
      <Metric
        label="NPV"
        value={`${formatNumber(analysis.financial.npvThb)} baht`}
      />
      <Metric
        label="IRR"
        value={
          analysis.financial.irrPercent === null
            ? "-"
            : `${formatNumber(analysis.financial.irrPercent)}%`
        }
      />
    </div>
  );
}

export function SolarDecisionSummary({
  analysis,
}: {
  analysis: SolarAnalysisResult;
}) {
  const recommended = analysis.sizing.recommended;
  const recommendation = analysis.recommendations[0];
  const decision =
    recommendation?.title ??
    (recommended
      ? `Solar มีแนวโน้มเหมาะที่ขนาด ${formatNumber(recommended.systemSizeKwp)} kWp`
      : "ยังไม่แนะนำติดตั้ง Solar ตามข้อมูลปัจจุบัน");
  const reason =
    recommendation?.explanation ??
    (recommended
      ? "ขนาดนี้ผ่านเกณฑ์ความคุ้มค่าของแบบจำลองภายใต้สมมติฐานปัจจุบัน"
      : "ยังไม่มีขนาดระบบที่ผ่านเกณฑ์ความคุ้มค่าของแบบจำลอง");
  return (
    <section className="rounded-xl border border-primary/35 bg-primary/5 p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">คำแนะนำหลัก</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            {decision}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {reason}
          </p>
          {recommendation?.nextAction ? (
            <p className="mt-3 text-sm font-medium">
              ขั้นตอนถัดไป: {recommendation.nextAction}
            </p>
          ) : null}
        </div>
        <Badge
          variant={analysis.modelQuality.score >= 70 ? "success" : "warning"}
        >
          ความมั่นใจ {analysis.modelQuality.label} ·{" "}
          {analysis.modelQuality.score}/100
        </Badge>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric
          label="ผลประหยัดสุทธิโดยประมาณ"
          value={`${formatApproximateMoneyRange(analysis.billComparison.netAnnualBenefit)}/ปี`}
        />
        <Metric
          label="ระยะเวลาคืนทุน"
          value={
            analysis.financial.simplePaybackYears
              ? `${analysis.financial.simplePaybackYears} ปี`
              : "ยังประเมินไม่ได้"
          }
        />
        <Metric
          label="ขนาดที่ผ่านเกณฑ์"
          value={
            recommended
              ? `${formatNumber(recommended.systemSizeKwp)} kWp`
              : "ไม่มี"
          }
        />
      </div>
    </section>
  );
}

export function ModelQualityPanel({
  analysis,
}: {
  analysis: SolarAnalysisResult;
}) {
  const quality = analysis.modelQuality;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="h-5 w-5 text-primary" />
          ความน่าเชื่อถือของโมเดลและความเสี่ยง
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="ระดับความมั่นใจ" value={quality.label} />
          <Metric label="Score" value={`${quality.score}/100`} />
          <Metric
            label="Detail mode"
            value={quality.detailLevel.toUpperCase()}
          />
          <Metric
            label="จำนวน risk flags"
            value={String(quality.risks.length)}
          />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {quality.risks.map((risk) => (
            <div
              key={risk.code}
              className="rounded-md border border-border p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <AlertTriangle
                  aria-hidden="true"
                  className="h-4 w-4 text-warning"
                />
                <Badge
                  variant={
                    risk.severity === "critical" || risk.severity === "warning"
                      ? "warning"
                      : "outline"
                  }
                >
                  {risk.severity}
                </Badge>
              </div>
              <h3 className="mt-2 font-semibold">{risk.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {risk.explanation}
              </p>
              <p className="mt-2 text-sm font-medium">{risk.mitigation}</p>
            </div>
          ))}
        </div>
        {quality.risks.length === 0 ? (
          <EmptyState
            title="No material risk flags"
            text="ยังต้องตรวจสอบแหล่งข้อมูลทางการก่อนใช้ประกอบการลงทุนจริง"
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SolarChartsSection({
  analysis,
}: {
  analysis: SolarAnalysisResult;
}) {
  if (analysis.selfConsumption.intervalResults.length === 0) {
    return (
      <EmptyState
        title="No interval data"
        text="Import load and solar profiles before using charts."
      />
    );
  }

  return (
    <SolarAnalysisCharts
      intervals={analysis.selfConsumption.intervalResults
        .slice(0, 48)
        .map((row) => ({
          label: formatBangkokHour(row.timestamp),
          loadKwh: row.loadKwh,
          solarKwh: row.solarKwh,
          gridImportKwh: row.gridImportKwh,
          gridExportKwh: row.gridExportKwh,
        }))}
      monthlyGeneration={analysis.solarProfile.monthlyGenerationKwh.map(
        (row) => ({
          month: row.month,
          generationKwh: row.generationKwh,
        }),
      )}
      selfConsumption={[
        { name: "Self-used", kwh: analysis.selfConsumption.selfConsumedKwh },
        { name: "Exported", kwh: analysis.selfConsumption.gridExportKwh },
      ]}
      cashFlows={analysis.financial.cashFlows.map((row) => ({
        year: row.year,
        netCashFlowThb: row.netCashFlowThb,
        cumulativeCashFlowThb: row.cumulativeCashFlowThb,
      }))}
      sizing={analysis.sizing.options.map((row) => ({
        systemSizeKwp: row.systemSizeKwp,
        npvThb: row.npvThb,
        paybackYears: row.simplePaybackYears,
        annualNetBenefitThb: row.annualNetBenefitThb,
      }))}
    />
  );
}

export function BillComparisonTable({
  analysis,
}: {
  analysis: SolarAnalysisResult;
}) {
  const rows = [
    analysis.billComparison.normalWithoutSolar,
    analysis.billComparison.touWithoutSolar,
    analysis.billComparison.normalWithSolar,
    analysis.billComparison.touWithSolar,
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator aria-hidden="true" className="h-5 w-5 text-primary" />
          เปรียบเทียบค่าไฟ
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <Th>ทางเลือก</Th>
              <Th>ค่าไฟ/เดือน</Th>
              <Th>ค่าไฟ/ปี</Th>
              <Th>ไฟฟ้าจากโครงข่าย (kWh/ปี)</Th>
              <Th>ไฟฟ้าที่ส่งกลับเข้าสู่ระบบ (kWh/ปี)</Th>
              <Th>ประหยัดค่าไฟ/ปี</Th>
              <Th>รายได้จากไฟฟ้าที่ส่งกลับ (บาท/ปี)</Th>
              <Th>สุทธิ/เดือน</Th>
              <Th>สถานะอัตราค่าไฟ</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <Td strong>{row.label}</Td>
                <Td>{formatNumber(row.monthlyBillThb)}</Td>
                <Td>{formatNumber(row.annualBillThb)}</Td>
                <Td>{formatNumber(row.annualGridImportKwh)}</Td>
                <Td>{formatNumber(row.annualGridExportKwh)}</Td>
                <Td>{formatSigned(row.annualBillSavingsThb)}</Td>
                <Td>{formatNumber(row.annualExportRevenueThb)}</Td>
                <Td>{formatNumber(row.netMonthlyCostThb)}</Td>
                <Td>{row.bill.tariffStatus}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function SizingTable({ analysis }: { analysis: SolarAnalysisResult }) {
  const recommended = analysis.sizing.recommended;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 aria-hidden="true" className="h-5 w-5 text-primary" />
          เปรียบเทียบขนาดระบบ Solar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 md:grid-cols-5">
          <Metric
            label="ขนาดที่ผ่านเกณฑ์"
            value={
              recommended
                ? `${formatSizing(recommended.systemSizeKwp)} · NPV ${formatNumber(recommended.npvThb)}`
                : "ไม่มีขนาดที่ผ่านเกณฑ์"
            }
          />
          <Metric
            label="ขนาดที่คืนทุนเร็วที่สุด"
            value={formatSizing(analysis.sizing.fastestPayback?.systemSizeKwp)}
          />
          <Metric
            label="Highest NPV"
            value={formatSizing(analysis.sizing.highestNpv?.systemSizeKwp)}
          />
          <Metric
            label="Highest benefit"
            value={formatSizing(
              analysis.sizing.highestAnnualSavings?.systemSizeKwp,
            )}
          />
          <Metric
            label="Best self-use"
            value={formatSizing(
              analysis.sizing.bestSelfConsumption?.systemSizeKwp,
            )}
          />
        </div>
        {analysis.sizing.options.length === 0 ? (
          <EmptyState
            title="ยังไม่มีขนาดระบบที่ประเมินได้"
            text="ตรวจสอบพื้นที่หลังคา กำลังส่งกลับสูงสุด และช่วงขนาดระบบที่ตั้งไว้"
          />
        ) : null}
        <Table>
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <Th>kWp</Th>
              <Th>
                <span className="inline-flex items-center gap-1">
                  Generation/year
                  <HelpIcon text={solarReadinessCopy.yieldHint} />
                </span>
              </Th>
              <Th>Self-used/year</Th>
              <Th>ไฟฟ้าที่ส่งกลับ/ปี</Th>
              <Th>Self-use</Th>
              <Th>Benefit/year</Th>
              <Th>ระยะเวลาคืนทุน</Th>
              <Th>NPV</Th>
              <Th>IRR</Th>
            </tr>
          </thead>
          <tbody>
            {analysis.sizing.options.map((row) => (
              <tr
                key={row.systemSizeKwp}
                className={`border-t border-border ${recommended?.systemSizeKwp === row.systemSizeKwp ? "bg-success/10" : ""}`}
              >
                <Td strong>{row.systemSizeKwp}</Td>
                <Td>{formatNumber(row.annualGenerationKwh)}</Td>
                <Td>{formatNumber(row.annualSelfConsumedKwh)}</Td>
                <Td>{formatNumber(row.annualExportedKwh)}</Td>
                <Td>{formatPercent(row.selfConsumptionRatio)}</Td>
                <Td>{formatNumber(row.annualNetBenefitThb)}</Td>
                <Td>{row.simplePaybackYears ?? "-"}</Td>
                <Td>{formatNumber(row.npvThb)}</Td>
                <Td>
                  {row.irrPercent === null
                    ? "-"
                    : `${formatNumber(row.irrPercent)}%`}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function FinancialTable({
  analysis,
}: {
  analysis: SolarAnalysisResult;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleDollarSign
            aria-hidden="true"
            className="h-5 w-5 text-primary"
          />
          ผลการประเมินทางการเงิน
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric
            label="Initial investment"
            value={`${formatNumber(analysis.financial.initialInvestmentThb)} baht`}
          />
          <Metric
            label="ระยะเวลาคืนทุนคิดลด"
            value={
              analysis.financial.discountedPaybackYears
                ? `${analysis.financial.discountedPaybackYears} ปี`
                : "-"
            }
          />
          <Metric
            label="ROI"
            value={`${formatNumber(analysis.financial.roiPercent)}%`}
          />
          <Metric
            label="IRR"
            value={
              analysis.financial.irrPercent === null
                ? "-"
                : `${formatNumber(analysis.financial.irrPercent)}%`
            }
          />
        </div>
        <Table>
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <Th>Year</Th>
              <Th>ประหยัดค่าไฟ</Th>
              <Th>รายได้จากไฟฟ้าที่ส่งกลับ</Th>
              <Th>O&M</Th>
              <Th>Inverter</Th>
              <Th>กระแสเงินสดสุทธิ</Th>
              <Th>สะสม</Th>
              <Th>สะสมคิดลด</Th>
            </tr>
          </thead>
          <tbody>
            {analysis.financial.cashFlows.map((row) => (
              <tr key={row.year} className="border-t border-border">
                <Td strong>{row.year}</Td>
                <Td>{formatNumber(row.billSavingsThb)}</Td>
                <Td>{formatNumber(row.exportRevenueThb)}</Td>
                <Td>{formatNumber(row.oAndMCostThb)}</Td>
                <Td>{formatNumber(row.replacementCostThb)}</Td>
                <Td>{formatSigned(row.netCashFlowThb)}</Td>
                <Td>{formatSigned(row.cumulativeCashFlowThb)}</Td>
                <Td>{formatSigned(row.cumulativeDiscountedCashFlowThb)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function SensitivityTable({
  analysis,
}: {
  analysis: SolarAnalysisResult;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BadgeCheck aria-hidden="true" className="h-5 w-5 text-primary" />
          Sensitivity analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric
            label="Base NPV"
            value={`${formatNumber(analysis.sensitivity.baseNpvThb)} baht`}
          />
          <Metric
            label="Most impactful"
            value={analysis.sensitivity.mostImpactfulVariable ?? "-"}
          />
          <Metric
            label="Break-even CAPEX"
            value={
              analysis.sensitivity.breakEvenCapexThb === null
                ? "-"
                : `${formatNumber(analysis.sensitivity.breakEvenCapexThb)} baht`
            }
          />
          <Metric
            label="NPV range"
            value={`${formatNumber(analysis.sensitivity.npvRangeThb.low)} to ${formatNumber(analysis.sensitivity.npvRangeThb.high)}`}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <StressCase
            title="Downside case"
            caseResult={analysis.sensitivity.downsideCase}
          />
          <StressCase
            title="Upside case"
            caseResult={analysis.sensitivity.upsideCase}
          />
        </div>
        <Table>
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <Th>Variable</Th>
              <Th>Case</Th>
              <Th>Value</Th>
              <Th>NPV</Th>
              <Th>Impact</Th>
              <Th>ระยะเวลาคืนทุน</Th>
              <Th>ROI</Th>
            </tr>
          </thead>
          <tbody>
            {analysis.sensitivity.cases.map((row) => (
              <tr
                key={`${row.variable}-${row.label}`}
                className="border-t border-border"
              >
                <Td strong>{row.variable}</Td>
                <Td>{row.label}</Td>
                <Td>{row.value}</Td>
                <Td>{formatNumber(row.npvThb)}</Td>
                <Td>{formatSigned(row.impactOnNpvThb)}</Td>
                <Td>{row.simplePaybackYears ?? "-"}</Td>
                <Td>{formatNumber(row.roiPercent)}%</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function RecommendationCards({
  analysis,
}: {
  analysis: SolarAnalysisResult;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SunMedium aria-hidden="true" className="h-5 w-5 text-primary" />
          Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {analysis.recommendations.length === 0 ? (
          <EmptyState
            title="No recommendations"
            text="Run the simulation to generate recommendations."
          />
        ) : null}
        {analysis.recommendations.map((recommendation) => (
          <div
            key={`${recommendation.type}-${recommendation.title}`}
            className="rounded-md border border-border p-4"
          >
            <div className="flex flex-wrap gap-2">
              <Badge>{recommendation.type}</Badge>
              <Badge
                variant={
                  recommendation.confidence === "high" ? "default" : "outline"
                }
              >
                {recommendation.confidence}
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
  );
}

export function ConfigDetails({ analysis }: { analysis: SolarAnalysisResult }) {
  const assumptions = analysis.solarProfile.assumptionsSnapshot;
  const financial = analysis.financial.assumptionsSnapshot;
  const exportPolicy = analysis.billComparison.exportPolicy;
  const rows = [
    ["Solar size", `${assumptions.systemSizeKwp} kWp`],
    ["Province / area", assumptions.province],
    ["Roof area", `${assumptions.roofAreaSqm ?? "-"} sqm`],
    ["Roof azimuth", `${assumptions.roofAzimuth ?? "-"} degree`],
    ["Roof tilt", `${assumptions.roofTilt ?? "-"} degree`],
    ["System loss", `${assumptions.systemLossPercent}%`],
    ["Shading loss", `${assumptions.shadingLossPercent}%`],
    ["Degradation", `${assumptions.degradationPercentPerYear}%/year`],
    ["Yield data status", assumptions.yieldSource.status],
    [
      "Yield source",
      assumptions.yieldSource.sourceUrl ?? assumptions.yieldSource.notes,
    ],
    ["สถานะการรับไฟฟ้าที่ส่งกลับ", exportPolicy.status],
    ["อัตรารับซื้อไฟฟ้า", `${exportPolicy.exportRateThbPerKwh} บาท/kWh`],
    ["กำลังส่งกลับสูงสุด", `${exportPolicy.exportLimitKw ?? "-"} kW`],
    ["แหล่งอ้างอิงอัตรารับซื้อ", exportPolicy.sourceUrl ?? exportPolicy.notes],
    ["Project life", `${financial.projectLifeYears} years`],
    ["Discount rate", `${financial.discountRatePercent}%`],
    [
      "Electricity escalation",
      `${financial.electricityEscalationRatePercent}%/year`,
    ],
    ["CAPEX", `${formatNumber(financial.capexThb)} baht`],
    ["O&M", `${formatNumber(financial.oAndMCostPerYear)} baht/year`],
    [
      "Inverter replacement",
      `${formatNumber(financial.inverterReplacementCostThb)} baht in year ${financial.inverterReplacementYear ?? "-"}`,
    ],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>สมมติฐานและแหล่งข้อมูล</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <tbody>
            {rows.map(([label, value]) => (
              <tr
                key={label}
                className="border-t border-border first:border-t-0"
              >
                <td className="w-64 bg-muted px-3 py-2 font-medium text-muted-foreground">
                  {label}
                </td>
                <td className="px-3 py-2">{value}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  );
}

function StressCase({
  title,
  caseResult,
}: {
  title: string;
  caseResult: SolarAnalysisResult["sensitivity"]["downsideCase"];
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {caseResult.label}
      </p>
      <div className="mt-3 grid gap-2 text-sm">
        <InfoRow
          label="NPV"
          value={`${formatNumber(caseResult.npvThb)} baht`}
        />
        <InfoRow
          label="ระยะเวลาคืนทุน"
          value={
            caseResult.simplePaybackYears === null
              ? "-"
              : `${caseResult.simplePaybackYears} ปี`
          }
        />
        <InfoRow
          label="IRR"
          value={
            caseResult.irrPercent === null
              ? "-"
              : `${formatNumber(caseResult.irrPercent)}%`
          }
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Metric({
  helpText,
  label,
  value,
}: {
  helpText?: string | undefined;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {label}
        {helpText ? <HelpIcon text={helpText} /> : null}
      </p>
      <p className="mt-2 text-lg font-semibold tracking-normal">{value}</p>
    </div>
  );
}

function HelpIcon({ text }: { text: string }) {
  return (
    <span className="inline-flex" title={text}>
      <Info aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="sr-only">{text}</span>
    </span>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/40 p-4 text-sm">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-muted-foreground">{text}</p>
    </div>
  );
}

function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[900px] border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-3 py-2">{children}</th>;
}

function Td({
  children,
  strong,
}: {
  children: ReactNode;
  strong?: boolean | undefined;
}) {
  return (
    <td className={`px-3 py-2 ${strong ? "font-medium" : ""}`}>{children}</td>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

const inputClassName =
  "h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring";

function formatSizing(value: number | undefined) {
  return value === undefined ? "-" : `${value} kWp`;
}

function formatPercent(value: number) {
  return `${formatNumber(value * 100)}%`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${formatNumber(value)}`;
}

function formatBangkokHour(timestamp: string) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestamp));
}
