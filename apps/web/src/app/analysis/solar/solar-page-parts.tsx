import type { ReactNode } from "react";
import type { SolarAnalysisResult } from "@thai-energy-planner/calculation-engine";
import { BadgeCheck, BarChart3, Calculator, CircleDollarSign, Settings, SunMedium } from "lucide-react";
import { MainNav } from "@/components/main-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SolarAnalysisCharts } from "@/components/solar-analysis-charts";
import type { SolarDemoSettings } from "@/lib/solar-demo";
import { buildSolarQuery, solarProfileOptions } from "@/lib/solar-demo";

const tabs = [
  { key: "overview", href: "/analysis/solar", label: "ภาพรวม" },
  { key: "config", href: "/analysis/solar/config", label: "สมมติฐาน" },
  { key: "results", href: "/analysis/solar/results", label: "ผลคำนวณ" },
  { key: "sizing", href: "/analysis/solar/sizing", label: "ขนาดระบบ" },
  { key: "finance", href: "/analysis/solar/finance", label: "การเงิน" },
  { key: "sensitivity", href: "/analysis/solar/sensitivity", label: "Sensitivity" }
];

export function SolarPageShell({
  active,
  queryString,
  children
}: {
  active: string;
  queryString: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="flex flex-wrap gap-2">
          <Badge>Phase 5</Badge>
          <Badge variant="outline">Solar Rooftop</Badge>
          <Badge variant="warning">ข้อมูล demo/draft</Badge>
        </div>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">วิเคราะห์ Solar Rooftop และความคุ้มค่าทางการเงิน</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              จำลองแบบ interval matching, ใช้ Tariff Engine คำนวณบิลหลัง Solar, แยก export revenue และแสดงสมมติฐาน demo/draft ที่ใช้
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

export function SolarControls({ settings, action }: { settings: SolarDemoSettings; action: string }) {
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
          ข้อมูล Solar yield และอัตรารับซื้อไฟในหน้านี้เป็น demo/draft เพื่อทดสอบ workflow เท่านั้น ต้องแทนด้วยแหล่งข้อมูลที่ตรวจสอบแล้วก่อนใช้ตัดสินใจลงทุน
        </div>
        {settings.validationMessages.length > 0 ? (
          <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-3 text-sm leading-6 text-destructive">
            {settings.validationMessages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        ) : (
          <div className="mb-4 rounded-md border border-border bg-muted/50 p-3 text-sm leading-6 text-muted-foreground">
            Validation: ขนาด Solar ต้องมากกว่า 0, CAPEX/O&M/พื้นที่หลังคา/อัตรารับซื้อไฟต้องไม่ติดลบ และอายุโครงการต้องมากกว่า 0
          </div>
        )}
        <form action={action} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Load Profile">
            <select name="profile" defaultValue={settings.profile} className={inputClassName}>
              {solarProfileOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="มิเตอร์ baseline">
            <select name="baseline" defaultValue={settings.baseline} className={inputClassName}>
              <option value="normal">Normal</option>
              <option value="tou">TOU</option>
            </select>
          </Field>
          <Field label="ขนาด Solar (kWp)">
            <input name="systemSizeKwp" type="number" min="0.1" step="0.1" defaultValue={settings.systemSizeKwp} className={inputClassName} />
          </Field>
          <Field label="พื้นที่หลังคา (ตร.ม.)">
            <input name="roofAreaSqm" type="number" min="0" step="1" defaultValue={settings.roofAreaSqm} className={inputClassName} />
          </Field>
          <Field label="จังหวัด / พื้นที่">
            <input name="province" defaultValue={settings.province} className={inputClassName} />
          </Field>
          <Field label="CAPEX (บาท)">
            <input name="capexThb" type="number" min="0" step="1000" defaultValue={settings.capexThb} className={inputClassName} />
          </Field>
          <Field label="O&M (บาท/ปี)">
            <input
              name="oAndMCostPerYear"
              type="number"
              min="0"
              step="100"
              defaultValue={settings.oAndMCostPerYear}
              className={inputClassName}
            />
          </Field>
          <Field label="อายุโครงการ (ปี)">
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
          <Field label="ขายไฟส่วนเกิน">
            <select name="exportEnabled" defaultValue={String(settings.exportEnabled)} className={inputClassName}>
              <option value="true">เปิด</option>
              <option value="false">ปิด</option>
            </select>
          </Field>
          <Field label="อัตรารับซื้อไฟ (บาท/kWh)">
            <input
              name="exportRateThbPerKwh"
              type="number"
              min="0"
              step="0.01"
              defaultValue={settings.exportRateThbPerKwh}
              className={inputClassName}
            />
          </Field>
          <div className="flex items-end gap-2">
            <Button type="submit" className="w-full">
              รันการจำลอง
            </Button>
          </div>
          <div className="flex items-end gap-2">
            <a
              href={`/analysis/solar/sizing?${buildSolarQuery(settings)}`}
              className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Optimize Size
            </a>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function SolarSummary({ analysis }: { analysis: SolarAnalysisResult }) {
  const comparison = analysis.billComparison;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <Metric label="Best after solar" value={comparison.bestWithSolar.label} />
      <Metric label="ผลประโยชน์ต่อปี" value={`${formatNumber(comparison.netAnnualBenefit)} บาท`} />
      <Metric label="ใช้ไฟ Solar เอง" value={formatPercent(analysis.selfConsumption.selfConsumptionRatio)} />
      <Metric label="คืนทุน" value={analysis.financial.simplePaybackYears ? `${analysis.financial.simplePaybackYears} ปี` : "-"} />
      <Metric label="NPV" value={`${formatNumber(analysis.financial.npvThb)} บาท`} />
    </div>
  );
}

export function SolarChartsSection({ analysis }: { analysis: SolarAnalysisResult }) {
  if (analysis.selfConsumption.intervalResults.length === 0) {
    return <EmptyState title="ยังไม่มีข้อมูล interval" text="นำเข้า Load Profile และ Solar Profile ก่อนดูกราฟ" />;
  }

  return (
    <SolarAnalysisCharts
      intervals={analysis.selfConsumption.intervalResults.slice(0, 48).map((row) => ({
        label: formatBangkokHour(row.timestamp),
        loadKwh: row.loadKwh,
        solarKwh: row.solarKwh,
        gridImportKwh: row.gridImportKwh,
        gridExportKwh: row.gridExportKwh
      }))}
      monthlyGeneration={analysis.solarProfile.monthlyGenerationKwh.map((row) => ({
        month: row.month,
        generationKwh: row.generationKwh
      }))}
      selfConsumption={[
        { name: "ใช้เอง", kwh: analysis.selfConsumption.selfConsumedKwh },
        { name: "ส่งออก", kwh: analysis.selfConsumption.gridExportKwh }
      ]}
      cashFlows={analysis.financial.cashFlows.map((row) => ({
        year: row.year,
        netCashFlowThb: row.netCashFlowThb,
        cumulativeCashFlowThb: row.cumulativeCashFlowThb
      }))}
      sizing={analysis.sizing.options.map((row) => ({
        systemSizeKwp: row.systemSizeKwp,
        npvThb: row.npvThb,
        paybackYears: row.simplePaybackYears,
        annualNetBenefitThb: row.annualNetBenefitThb
      }))}
    />
  );
}

export function BillComparisonTable({ analysis }: { analysis: SolarAnalysisResult }) {
  const rows = [
    analysis.billComparison.normalWithoutSolar,
    analysis.billComparison.touWithoutSolar,
    analysis.billComparison.normalWithSolar,
    analysis.billComparison.touWithSolar
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator aria-hidden="true" className="h-5 w-5 text-primary" />
          เปรียบเทียบบิลค่าไฟ
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Scenario</th>
                <th className="px-3 py-2">บิล/เดือน</th>
                <th className="px-3 py-2">บิล/ปี</th>
                <th className="px-3 py-2">ซื้อไฟ kWh/ปี</th>
                <th className="px-3 py-2">ขายไฟ kWh/ปี</th>
                <th className="px-3 py-2">ประหยัดบิล/ปี</th>
                <th className="px-3 py-2">รายได้ขายไฟ/ปี</th>
                <th className="px-3 py-2">ต้นทุนสุทธิ/เดือน</th>
                <th className="px-3 py-2">สถานะ tariff</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{row.label}</td>
                  <td className="px-3 py-2">{formatNumber(row.monthlyBillThb)}</td>
                  <td className="px-3 py-2">{formatNumber(row.annualBillThb)}</td>
                  <td className="px-3 py-2">{formatNumber(row.annualGridImportKwh)}</td>
                  <td className="px-3 py-2">{formatNumber(row.annualGridExportKwh)}</td>
                  <td className="px-3 py-2">{formatSigned(row.annualBillSavingsThb)}</td>
                  <td className="px-3 py-2">{formatNumber(row.annualExportRevenueThb)}</td>
                  <td className="px-3 py-2">{formatNumber(row.netMonthlyCostThb)}</td>
                  <td className="px-3 py-2">{row.bill.tariffStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function SizingTable({ analysis }: { analysis: SolarAnalysisResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 aria-hidden="true" className="h-5 w-5 text-primary" />
          วิเคราะห์ขนาดระบบ Solar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <Metric label="คืนทุนเร็วสุด" value={formatSizing(analysis.sizing.fastestPayback?.systemSizeKwp)} />
          <Metric label="NPV สูงสุด" value={formatSizing(analysis.sizing.highestNpv?.systemSizeKwp)} />
          <Metric label="ประโยชน์สูงสุด" value={formatSizing(analysis.sizing.highestAnnualSavings?.systemSizeKwp)} />
          <Metric label="ใช้เองดีที่สุด" value={formatSizing(analysis.sizing.bestSelfConsumption?.systemSizeKwp)} />
        </div>
        {analysis.sizing.options.length === 0 ? <EmptyState title="ยังไม่มีผล optimize" text="ปรับสมมติฐานแล้วกด Optimize Size อีกครั้ง" /> : null}
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2">kWp</th>
                <th className="px-3 py-2">ผลิตไฟ/ปี</th>
                <th className="px-3 py-2">ใช้เอง/ปี</th>
                <th className="px-3 py-2">ส่งออก/ปี</th>
                <th className="px-3 py-2">สัดส่วนใช้เอง</th>
                <th className="px-3 py-2">ประโยชน์สุทธิ/ปี</th>
                <th className="px-3 py-2">คืนทุน</th>
                <th className="px-3 py-2">NPV</th>
                <th className="px-3 py-2">IRR</th>
              </tr>
            </thead>
            <tbody>
              {analysis.sizing.options.map((row) => (
                <tr key={row.systemSizeKwp} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{row.systemSizeKwp}</td>
                  <td className="px-3 py-2">{formatNumber(row.annualGenerationKwh)}</td>
                  <td className="px-3 py-2">{formatNumber(row.annualSelfConsumedKwh)}</td>
                  <td className="px-3 py-2">{formatNumber(row.annualExportedKwh)}</td>
                  <td className="px-3 py-2">{formatPercent(row.selfConsumptionRatio)}</td>
                  <td className="px-3 py-2">{formatNumber(row.annualNetBenefitThb)}</td>
                  <td className="px-3 py-2">{row.simplePaybackYears ?? "-"}</td>
                  <td className="px-3 py-2">{formatNumber(row.npvThb)}</td>
                  <td className="px-3 py-2">{row.irrPercent === null ? "-" : `${formatNumber(row.irrPercent)}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function FinancialTable({ analysis }: { analysis: SolarAnalysisResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleDollarSign aria-hidden="true" className="h-5 w-5 text-primary" />
          ผลการเงิน
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="เงินลงทุนตั้งต้น" value={`${formatNumber(analysis.financial.initialInvestmentThb)} บาท`} />
          <Metric label="คืนทุนแบบคิดลด" value={analysis.financial.discountedPaybackYears ? `${analysis.financial.discountedPaybackYears} ปี` : "-"} />
          <Metric label="ROI" value={`${formatNumber(analysis.financial.roiPercent)}%`} />
          <Metric label="IRR" value={analysis.financial.irrPercent === null ? "-" : `${formatNumber(analysis.financial.irrPercent)}%`} />
        </div>
        {analysis.financial.cashFlows.length === 0 ? <EmptyState title="ยังไม่มี cash flow" text="รันการจำลองเพื่อสร้าง cash flow รายปี" /> : null}
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[940px] border-collapse text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2">ปี</th>
                <th className="px-3 py-2">ประหยัดบิล</th>
                <th className="px-3 py-2">รายได้ขายไฟ</th>
                <th className="px-3 py-2">O&M</th>
                <th className="px-3 py-2">เปลี่ยน inverter</th>
                <th className="px-3 py-2">กระแสเงินสดสุทธิ</th>
                <th className="px-3 py-2">สะสม</th>
                <th className="px-3 py-2">สะสมคิดลด</th>
              </tr>
            </thead>
            <tbody>
              {analysis.financial.cashFlows.map((row) => (
                <tr key={row.year} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{row.year}</td>
                  <td className="px-3 py-2">{formatNumber(row.billSavingsThb)}</td>
                  <td className="px-3 py-2">{formatNumber(row.exportRevenueThb)}</td>
                  <td className="px-3 py-2">{formatNumber(row.oAndMCostThb)}</td>
                  <td className="px-3 py-2">{formatNumber(row.replacementCostThb)}</td>
                  <td className="px-3 py-2">{formatSigned(row.netCashFlowThb)}</td>
                  <td className="px-3 py-2">{formatSigned(row.cumulativeCashFlowThb)}</td>
                  <td className="px-3 py-2">{formatSigned(row.cumulativeDiscountedCashFlowThb)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function SensitivityTable({ analysis }: { analysis: SolarAnalysisResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BadgeCheck aria-hidden="true" className="h-5 w-5 text-primary" />
          Sensitivity analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <Metric label="Base NPV" value={`${formatNumber(analysis.sensitivity.baseNpvThb)} บาท`} />
          <Metric label="ปัจจัยกระทบมากสุด" value={analysis.sensitivity.mostImpactfulVariable ?? "-"} />
        </div>
        {analysis.sensitivity.cases.length === 0 ? <EmptyState title="ยังไม่มี sensitivity case" text="รันการจำลองเพื่อสร้าง sensitivity analysis" /> : null}
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[800px] border-collapse text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2">ปัจจัย</th>
                <th className="px-3 py-2">กรณี</th>
                <th className="px-3 py-2">ค่า</th>
                <th className="px-3 py-2">NPV</th>
                <th className="px-3 py-2">ผลกระทบ</th>
                <th className="px-3 py-2">คืนทุน</th>
                <th className="px-3 py-2">ROI</th>
              </tr>
            </thead>
            <tbody>
              {analysis.sensitivity.cases.map((row) => (
                <tr key={`${row.variable}-${row.label}`} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{row.variable}</td>
                  <td className="px-3 py-2">{row.label}</td>
                  <td className="px-3 py-2">{row.value}</td>
                  <td className="px-3 py-2">{formatNumber(row.npvThb)}</td>
                  <td className="px-3 py-2">{formatSigned(row.impactOnNpvThb)}</td>
                  <td className="px-3 py-2">{row.simplePaybackYears ?? "-"}</td>
                  <td className="px-3 py-2">{formatNumber(row.roiPercent)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function RecommendationCards({ analysis }: { analysis: SolarAnalysisResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SunMedium aria-hidden="true" className="h-5 w-5 text-primary" />
          คำแนะนำ
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {analysis.recommendations.length === 0 ? <EmptyState title="ยังไม่มีคำแนะนำ" text="รันการจำลองเพื่อให้ระบบสร้างคำแนะนำ" /> : null}
        {analysis.recommendations.map((recommendation) => (
          <div key={`${recommendation.type}-${recommendation.title}`} className="rounded-md border border-border p-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{recommendation.type}</Badge>
              <Badge variant={recommendation.confidence === "high" ? "default" : "outline"}>{recommendation.confidence}</Badge>
            </div>
            <h3 className="mt-3 font-semibold">{recommendation.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{recommendation.explanation}</p>
            <p className="mt-2 text-sm font-medium">{recommendation.nextAction}</p>
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
    ["ขนาด Solar", `${assumptions.systemSizeKwp} kWp`],
    ["จังหวัด/พื้นที่", assumptions.province],
    ["พื้นที่หลังคา", `${assumptions.roofAreaSqm ?? "-"} ตร.ม.`],
    ["System loss", `${assumptions.systemLossPercent}%`],
    ["Shading loss", `${assumptions.shadingLossPercent}%`],
    ["สถานะข้อมูล yield", assumptions.yieldSource.status],
    ["แหล่งข้อมูล yield", assumptions.yieldSource.sourceUrl ?? assumptions.yieldSource.notes],
    ["สถานะ export policy", exportPolicy.status],
    ["อัตรารับซื้อไฟ", `${exportPolicy.exportRateThbPerKwh} บาท/kWh`],
    ["แหล่งข้อมูล export", exportPolicy.sourceUrl ?? exportPolicy.notes],
    ["อายุโครงการ", `${financial.projectLifeYears} ปี`],
    ["Discount rate", `${financial.discountRatePercent}%`],
    ["CAPEX", `${formatNumber(financial.capexThb)} บาท`],
    ["O&M", `${formatNumber(financial.oAndMCostPerYear)} บาท/ปี`]
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>สมมติฐานและแหล่งข้อมูลที่ใช้</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label} className="border-t border-border first:border-t-0">
                  <td className="w-64 bg-muted px-3 py-2 font-medium text-muted-foreground">{label}</td>
                  <td className="px-3 py-2">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-normal">{value}</p>
    </div>
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

const inputClassName =
  "h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring";

function formatSizing(value: number | undefined) {
  return value === undefined ? "-" : `${value} kWp`;
}

function formatPercent(value: number) {
  return `${formatNumber(value * 100)}%`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
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
    hourCycle: "h23"
  }).format(new Date(timestamp));
}
