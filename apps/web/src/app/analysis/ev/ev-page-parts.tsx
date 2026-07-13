import type { ReactNode } from "react";
import type { EvScenarioComparisonResult, EvScenarioResult, Phase6DemoInput } from "@thai-energy-planner/calculation-engine";
import { BatteryCharging, CarFront, Clock, Database, PlugZap } from "lucide-react";
import { EvAnalysisCharts } from "@/components/battery-ev-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildEvQuery, evStrategyOptions, phase6ProfileOptions, type EvDemoSettings } from "@/lib/phase6-demo";

type SavedBillContext = {
  audience?: string | undefined;
  source?: string | undefined;
};

const tabs = [
  { key: "overview", href: "/analysis/ev", label: "Overview" },
  { key: "config", href: "/analysis/ev/config", label: "Config" },
  { key: "results", href: "/analysis/ev/results", label: "Results" },
  { key: "charging", href: "/analysis/ev/charging", label: "Charging" }
];

export function EvPageShell({
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
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="flex flex-wrap gap-2">
          <Badge>การประเมินรถยนต์ไฟฟ้า</Badge>
          <Badge variant="outline">EV Module</Badge>
          <Badge variant="warning">ค่ามาตรฐานของระบบ (ต้องยืนยันก่อนตัดสินใจ)</Badge>
        </div>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">EV Charging Analysis</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Interval charging profile, TOU-aware bill impact, and strategy comparison for home charging.
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

export function EvControls({
  settings,
  action,
  savedBillContext
}: {
  settings: EvDemoSettings;
  action: string;
  savedBillContext?: SavedBillContext | undefined;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlugZap aria-hidden="true" className="h-5 w-5 text-primary" />
          ข้อมูลระบบ EV เบื้องต้น
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
          <Field label="Charging strategy">
            <select name="strategy" defaultValue={settings.strategy} className={inputClassName}>
              {evStrategyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Daily distance (km)">
            <input
              name="dailyDistanceKm"
              type="number"
              min="0"
              step="1"
              defaultValue={settings.dailyDistanceKm}
              className={inputClassName}
            />
          </Field>
          <Field label="Charger power (kW)">
            <input
              name="chargerPowerKw"
              type="number"
              min="0.1"
              step="0.1"
              defaultValue={settings.chargerPowerKw}
              className={inputClassName}
            />
          </Field>
          <Field label="Arrival">
            <input name="arrivalTime" type="time" defaultValue={settings.arrivalTime} className={inputClassName} />
          </Field>
          <Field label="Departure">
            <input name="departureTime" type="time" defaultValue={settings.departureTime} className={inputClassName} />
          </Field>
          <Field label="Initial SOC (%)">
            <input
              name="initialSocPercent"
              type="number"
              min="0"
              max="100"
              step="1"
              defaultValue={settings.initialSocPercent}
              className={inputClassName}
            />
          </Field>
          <Field label="Target SOC (%)">
            <input
              name="targetSocPercent"
              type="number"
              min="1"
              max="100"
              step="1"
              defaultValue={settings.targetSocPercent}
              className={inputClassName}
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Run EV analysis
            </Button>
          </div>
          <div className="flex items-end">
            <a
              href={`/analysis/ev/results?${withSavedBillContext(buildEvQuery(settings), savedBillContext)}`}
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

export function EvSummary({ selectedScenario, comparison }: { selectedScenario: EvScenarioResult; comparison: EvScenarioComparisonResult }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <Metric label="Selected strategy" value={selectedScenario.strategy} />
      <Metric label="Added EV energy" value={`${formatNumber(selectedScenario.addedEvKwh)} kWh/mo`} />
      <Metric label="Monthly increase" value={`${formatNumber(selectedScenario.monthlyBillIncreaseThb)} THB`} />
      <Metric label="Cost / 100 km" value={selectedScenario.costPer100Km === null ? "-" : `${formatNumber(selectedScenario.costPer100Km)} THB`} />
      <Metric label="Best strategy" value={comparison.bestChargingStrategy.strategy} />
    </div>
  );
}

export function EvChartsSection({
  demo,
  selectedScenario,
  comparison
}: {
  demo: Phase6DemoInput;
  selectedScenario: EvScenarioResult;
  comparison: EvScenarioComparisonResult;
}) {
  const loadByTimestamp = new Map(demo.loadIntervals.map((interval) => [interval.timestamp, interval.energyKwh]));
  return (
    <EvAnalysisCharts
      charging={selectedScenario.profile.intervals.slice(0, 48).map((row) => {
        const baseLoadKwh = loadByTimestamp.get(row.timestamp) ?? 0;
        return {
          label: formatBangkokHour(row.timestamp),
          energyKwh: row.energyKwh,
          gridEnergyKwh: row.gridEnergyKwh,
          solarEnergyKwh: row.solarEnergyKwh,
          baseLoadKwh,
          loadAfterEvKwh: baseLoadKwh + row.energyKwh
        };
      })}
      strategies={comparison.scenarios.map((scenario) => ({
        strategy: strategyLabel(scenario.strategy),
        monthlyBillIncreaseThb: scenario.monthlyBillIncreaseThb,
        costPer100Km: scenario.costPer100Km ?? 0,
        peakDemandIncreaseKw: scenario.peakDemandIncreaseKw
      }))}
    />
  );
}

export function EvSourcePanel({ demo, selectedScenario }: { demo: Phase6DemoInput; selectedScenario: EvScenarioResult }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <InfoCard title="Tariff version" icon={<Database aria-hidden="true" className="h-5 w-5 text-primary" />}>
        <InfoRow label="Version" value={selectedScenario.billAfterEv.tariffVersionLabel} />
        <InfoRow label="Status" value={selectedScenario.billAfterEv.tariffStatus} />
        <InfoRow label="แหล่งข้อมูล" value={selectedScenario.billAfterEv.sourceUrl ?? "ค่ามาตรฐานของระบบ"} />
      </InfoCard>
      <InfoCard title="EV config" icon={<CarFront aria-hidden="true" className="h-5 w-5 text-primary" />}>
        <InfoRow label="Vehicle" value={demo.evConfig.vehicleName} />
        <InfoRow label="Cost status" value={demo.evConfig.costSource.status} />
        <InfoRow label="Completion" value={selectedScenario.chargingCompletionStatus} />
      </InfoCard>
      <InfoCard title="Charging split" icon={<BatteryCharging aria-hidden="true" className="h-5 w-5 text-primary" />}>
        <InfoRow label="Grid energy" value={`${formatNumber(selectedScenario.profile.gridEnergyKwh)} kWh`} />
        <InfoRow label="Solar surplus" value={`${formatNumber(selectedScenario.profile.solarSurplusUsedKwh)} kWh`} />
        <InfoRow label="Peak impact" value={`${formatNumber(selectedScenario.peakDemandIncreaseKw)} kW`} />
      </InfoCard>
    </div>
  );
}

export function EvComparisonTable({ comparison }: { comparison: EvScenarioComparisonResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock aria-hidden="true" className="h-5 w-5 text-primary" />
          Strategy comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Strategy</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Added kWh/mo</th>
                <th className="px-3 py-2">Bill increase</th>
                <th className="px-3 py-2">Cost / 100 km</th>
                <th className="px-3 py-2">Grid kWh/mo</th>
                <th className="px-3 py-2">Peak impact</th>
              </tr>
            </thead>
            <tbody>
              {comparison.scenarios.map((scenario) => (
                <tr key={scenario.strategy} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{strategyLabel(scenario.strategy)}</td>
                  <td className="px-3 py-2">{scenario.chargingCompletionStatus}</td>
                  <td className="px-3 py-2">{formatNumber(scenario.addedEvKwh)}</td>
                  <td className="px-3 py-2">{formatNumber(scenario.monthlyBillIncreaseThb)} THB</td>
                  <td className="px-3 py-2">{scenario.costPer100Km === null ? "-" : `${formatNumber(scenario.costPer100Km)} THB`}</td>
                  <td className="px-3 py-2">{formatNumber(scenario.gridImportIncreaseKwh)}</td>
                  <td className="px-3 py-2">{formatNumber(scenario.peakDemandIncreaseKw)} kW</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function EvChargingTable({ selectedScenario }: { selectedScenario: EvScenarioResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Charging trace</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">EV kWh</th>
                <th className="px-3 py-2">Grid kWh</th>
                <th className="px-3 py-2">Solar kWh</th>
                <th className="px-3 py-2">Power</th>
                <th className="px-3 py-2">Cost</th>
              </tr>
            </thead>
            <tbody>
              {selectedScenario.profile.intervals.slice(0, 72).map((row) => (
                <tr key={row.timestamp} className="border-t border-border">
                  <td className="px-3 py-2">{formatBangkokHour(row.timestamp)}</td>
                  <td className="px-3 py-2">{row.periodType}</td>
                  <td className="px-3 py-2">{row.source}</td>
                  <td className="px-3 py-2">{formatNumber(row.energyKwh)}</td>
                  <td className="px-3 py-2">{formatNumber(row.gridEnergyKwh)}</td>
                  <td className="px-3 py-2">{formatNumber(row.solarEnergyKwh)}</td>
                  <td className="px-3 py-2">{formatNumber(row.powerKw)} kW</td>
                  <td className="px-3 py-2">{formatNumber(row.costThb)} THB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function EvRecommendations({ comparison }: { comparison: EvScenarioComparisonResult }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {comparison.recommendations.map((recommendation) => (
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

function strategyLabel(strategy: string) {
  return strategy.replaceAll("_", " ");
}

function formatNumber(value: number | string) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(Number(value));
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
