import type { ReactNode } from "react";
import type { BatteryAnalysisResult } from "@thai-energy-planner/calculation-engine";
import { BatteryCharging, Calculator, Database, Gauge, Settings } from "lucide-react";
import { MainNav } from "@/components/main-nav";
import { BatteryAnalysisCharts } from "@/components/battery-ev-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  batteryStrategyOptions,
  buildBatteryQuery,
  phase6ProfileOptions,
  type BatteryDemoSettings
} from "@/lib/phase6-demo";

type SavedBillContext = {
  audience?: string | undefined;
  source?: string | undefined;
};

const tabs = [
  { key: "overview", href: "/analysis/battery", label: "Overview" },
  { key: "config", href: "/analysis/battery/config", label: "Config" },
  { key: "results", href: "/analysis/battery/results", label: "Results" },
  { key: "dispatch", href: "/analysis/battery/dispatch", label: "Dispatch" }
];

export function BatteryPageShell({
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
          <Badge>การประเมินแบตเตอรี่</Badge>
          <Badge variant="outline">Battery Engine</Badge>
          <Badge variant="warning">ค่ามาตรฐานของระบบ (ต้องยืนยันก่อนตัดสินใจ)</Badge>
        </div>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">Battery + Solar Analysis</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Dispatch simulation, tariff-backed bill impact, and financial recommendation for storage scenarios.
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

export function BatteryControls({
  settings,
  action,
  savedBillContext
}: {
  settings: BatteryDemoSettings;
  action: string;
  savedBillContext?: SavedBillContext | undefined;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings aria-hidden="true" className="h-5 w-5 text-primary" />
          ข้อมูลระบบแบตเตอรี่เบื้องต้น
        </CardTitle>
      </CardHeader>
      <CardContent>
        {settings.validationMessages.length > 0 ? (
          <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-3 text-sm leading-6 text-destructive">
            {settings.validationMessages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        ) : null}
        <form action={action} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SavedBillHiddenInputs context={savedBillContext} />
          <Field label="โปรไฟล์สำหรับประเมินเบื้องต้น">
            <select name="profile" defaultValue={settings.profile} className={inputClassName}>
              {phase6ProfileOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Dispatch strategy">
            <select name="strategy" defaultValue={settings.strategy} className={inputClassName}>
              {batteryStrategyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Capacity (kWh)">
            <input name="capacityKwh" type="number" min="0.1" step="0.1" defaultValue={settings.capacityKwh} className={inputClassName} />
          </Field>
          <Field label="Usable capacity (kWh)">
            <input
              name="usableCapacityKwh"
              type="number"
              min="0.1"
              step="0.1"
              defaultValue={settings.usableCapacityKwh}
              className={inputClassName}
            />
          </Field>
          <Field label="CAPEX (THB)">
            <input name="capexThb" type="number" min="0" step="1000" defaultValue={settings.capexThb} className={inputClassName} />
          </Field>
          <Field label="Charge power (kW)">
            <input
              name="chargePowerKw"
              type="number"
              min="0.1"
              step="0.1"
              defaultValue={settings.chargePowerKw}
              className={inputClassName}
            />
          </Field>
          <Field label="Discharge power (kW)">
            <input
              name="dischargePowerKw"
              type="number"
              min="0.1"
              step="0.1"
              defaultValue={settings.dischargePowerKw}
              className={inputClassName}
            />
          </Field>
          <Field label="Reserve (%)">
            <input
              name="backupReservePercent"
              type="number"
              min="0"
              max="100"
              step="1"
              defaultValue={settings.backupReservePercent}
              className={inputClassName}
            />
          </Field>
          <Field label="Peak threshold (kW)">
            <input
              name="peakShavingThresholdKw"
              type="number"
              min="0"
              step="0.1"
              defaultValue={settings.peakShavingThresholdKw}
              className={inputClassName}
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Run battery analysis
            </Button>
          </div>
          <div className="flex items-end">
            <a
              href={`/analysis/battery/results?${withSavedBillContext(buildBatteryQuery(settings), savedBillContext)}`}
              className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Open results
            </a>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SavedBillHiddenInputs({ context }: { context?: SavedBillContext | undefined }) {
  if (context?.source !== "bills") return null;
  return (
    <>
      <input name="source" type="hidden" value="bills" />
      {context.audience ? <input name="audience" type="hidden" value={context.audience} /> : null}
    </>
  );
}

function withSavedBillContext(queryString: string, context?: SavedBillContext | undefined) {
  if (context?.source !== "bills") return queryString;

  const params = new URLSearchParams(queryString);
  params.set("source", "bills");
  if (context.audience) params.set("audience", context.audience);
  return params.toString();
}

export function BatterySummary({ analysis }: { analysis: BatteryAnalysisResult }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <Metric label="Monthly bill before" value={`${formatNumber(analysis.financial.billBeforeBatteryThb)} THB`} />
      <Metric label="Monthly bill after" value={`${formatNumber(analysis.financial.billAfterBatteryThb)} THB`} />
      <Metric label="Annual savings" value={`${formatNumber(analysis.financial.annualBillSavingsThb)} THB`} />
      <Metric label="Self-consumption" value={formatPercent(analysis.dispatch.selfConsumptionAfterRatio)} />
      <Metric label="Payback" value={analysis.financial.simplePaybackYears ? `${analysis.financial.simplePaybackYears} yr` : "-"} />
    </div>
  );
}

export function BatteryChartsSection({ analysis }: { analysis: BatteryAnalysisResult }) {
  return (
    <BatteryAnalysisCharts
      dispatch={analysis.dispatch.intervals.slice(0, 48).map((row) => ({
        label: formatBangkokHour(row.timestamp),
        socKwh: row.socAfterKwh,
        chargeKwh: row.chargeKwh,
        dischargeKwh: row.dischargeKwh,
        gridImportBeforeKwh: row.gridImportBeforeKwh,
        gridImportAfterKwh: row.gridImportAfterKwh,
        gridExportBeforeKwh: row.gridExportBeforeKwh,
        gridExportAfterKwh: row.gridExportAfterKwh
      }))}
      peak={[
        {
          name: "Peak",
          beforeKw: analysis.dispatch.peakDemandBeforeKw,
          afterKw: analysis.dispatch.peakDemandAfterKw
        }
      ]}
      cashFlows={analysis.financial.financialTrace.cashFlows.map((row) => ({
        year: row.year,
        netCashFlowThb: row.netCashFlowThb,
        cumulativeCashFlowThb: row.cumulativeCashFlowThb
      }))}
    />
  );
}

export function BatterySourcePanel({ analysis }: { analysis: BatteryAnalysisResult }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <InfoCard title="Tariff version" icon={<Database aria-hidden="true" className="h-5 w-5 text-primary" />}>
        <InfoRow label="Version" value={analysis.billAfterBattery.tariffVersionLabel} />
        <InfoRow label="Status" value={analysis.billAfterBattery.tariffStatus} />
        <InfoRow label="แหล่งข้อมูล" value={analysis.billAfterBattery.sourceUrl ?? "ค่ามาตรฐานของระบบ"} />
      </InfoCard>
      <InfoCard title="Dispatch totals" icon={<BatteryCharging aria-hidden="true" className="h-5 w-5 text-primary" />}>
        <InfoRow label="Charged from solar" value={`${formatNumber(analysis.dispatch.chargedFromSolarKwh)} kWh`} />
        <InfoRow label="Charged from grid" value={`${formatNumber(analysis.dispatch.chargedFromGridKwh)} kWh`} />
        <InfoRow label="Discharged to load" value={`${formatNumber(analysis.dispatch.dischargedToLoadKwh)} kWh`} />
      </InfoCard>
      <InfoCard title="Backup" icon={<Gauge aria-hidden="true" className="h-5 w-5 text-primary" />}>
        <InfoRow label="Reserve" value={`${formatNumber(analysis.dispatch.backupReserveKwh)} kWh`} />
        <InfoRow label="Estimated hours" value={analysis.dispatch.estimatedBackupHours ? `${analysis.dispatch.estimatedBackupHours} h` : "-"} />
        <InfoRow label="Trace delta" value={`${formatNumber(analysis.dispatch.energyBalanceDeltaKwh)} kWh`} />
      </InfoCard>
    </div>
  );
}

export function BatteryFinancialTable({ analysis }: { analysis: BatteryAnalysisResult }) {
  const rows = [
    ["Base energy before", analysis.billBeforeBattery.baseEnergyCharge],
    ["Base energy after", analysis.billAfterBattery.baseEnergyCharge],
    ["Peak charge after", analysis.billAfterBattery.peakEnergyCharge],
    ["Off-peak charge after", analysis.billAfterBattery.offPeakEnergyCharge],
    ["Ft after", analysis.billAfterBattery.ftCharge],
    ["VAT after", analysis.billAfterBattery.vat],
    ["Grand total after", analysis.billAfterBattery.grandTotal]
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator aria-hidden="true" className="h-5 w-5 text-primary" />
          Bill breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Component</th>
                <th className="px-3 py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{label}</td>
                  <td className="px-3 py-2">{value} THB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function BatteryDispatchTable({ analysis }: { analysis: BatteryAnalysisResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dispatch trace</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2">Load</th>
                <th className="px-3 py-2">Solar</th>
                <th className="px-3 py-2">Charge</th>
                <th className="px-3 py-2">Discharge</th>
                <th className="px-3 py-2">SOC before</th>
                <th className="px-3 py-2">SOC after</th>
                <th className="px-3 py-2">Import after</th>
                <th className="px-3 py-2">Export after</th>
              </tr>
            </thead>
            <tbody>
              {analysis.dispatch.intervals.slice(0, 48).map((row) => (
                <tr key={row.timestamp} className="border-t border-border">
                  <td className="px-3 py-2">{formatBangkokHour(row.timestamp)}</td>
                  <td className="px-3 py-2">{row.periodType}</td>
                  <td className="px-3 py-2">{formatNumber(row.loadKwh)}</td>
                  <td className="px-3 py-2">{formatNumber(row.solarKwh)}</td>
                  <td className="px-3 py-2">{formatNumber(row.chargeKwh)}</td>
                  <td className="px-3 py-2">{formatNumber(row.dischargeKwh)}</td>
                  <td className="px-3 py-2">{formatNumber(row.socBeforeKwh)}</td>
                  <td className="px-3 py-2">{formatNumber(row.socAfterKwh)}</td>
                  <td className="px-3 py-2">{formatNumber(row.gridImportAfterKwh)}</td>
                  <td className="px-3 py-2">{formatNumber(row.gridExportAfterKwh)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function BatteryRecommendations({ analysis }: { analysis: BatteryAnalysisResult }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {analysis.recommendations.map((recommendation) => (
        <Card key={`${recommendation.type}-${recommendation.title}`}>
          <CardHeader>
            <CardTitle className="text-base">{recommendation.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>{recommendation.explanation}</p>
            <p className="font-medium text-foreground">{recommendation.nextAction}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function InfoCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">{children}</CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-normal text-muted-foreground">{label}</p>
        <p className="mt-2 text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}

const inputClassName =
  "h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring";

function formatNumber(value: number | string) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(Number(value));
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "percent", maximumFractionDigits: 1 }).format(value);
}

function formatBangkokHour(timestamp: string) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}
