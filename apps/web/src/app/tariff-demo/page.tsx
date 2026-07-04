import { Calculator, Clock3, Database, ReceiptText } from "lucide-react";
import {
  calculateNormalBill,
  calculateTouBill,
  demoNormalTariff,
  demoTouIntervals,
  demoTouTariff
} from "@thai-energy-planner/tariff-engine";
import type { CalculationLineItem, TariffCalculationResult } from "@thai-energy-planner/tariff-engine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainNav } from "@/components/main-nav";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function TariffDemoPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const normalKwh = getSingleParam(params.normalKwh) ?? "250";
  const billDate = getSingleParam(params.billDate) ?? "2026-02-01";

  const normalResult = calculateNormalBill({
    tariffVersion: demoNormalTariff,
    billDate,
    energyKwh: normalKwh
  });

  const touResult = calculateTouBill({
    tariffVersion: demoTouTariff,
    intervals: demoTouIntervals
  });

  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="border-b border-border bg-white/78">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 md:px-6 lg:py-10">
          <div className="flex flex-wrap gap-2">
            <Badge>Phase 2</Badge>
            <Badge variant="outline">Tariff Engine Demo</Badge>
            <Badge variant="warning">อัตราสาธิต draft</Badge>
          </div>
          <div className="max-w-3xl space-y-3">
            <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">ทดสอบ Tariff Engine</h1>
            <p className="leading-7 text-muted-foreground">
              หน้านี้เป็น developer/demo page สำหรับตรวจสอบ calculation breakdown จาก tariff configuration เท่านั้น
              ตัวเลขอัตราเป็น synthetic demo ไม่ใช่อัตราทางการของ PEA หรือ MEA
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-8 md:px-6 lg:grid-cols-[360px_1fr] lg:py-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator aria-hidden="true" className="h-5 w-5 text-primary" />
              Normal tariff input
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" method="get">
              <label className="grid gap-2 text-sm font-medium">
                วันที่บิล
                <input
                  className="h-10 rounded-md border border-input bg-white px-3 text-sm"
                  defaultValue={billDate}
                  name="billDate"
                  type="date"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                หน่วยไฟรายเดือน (kWh)
                <input
                  className="h-10 rounded-md border border-input bg-white px-3 text-sm"
                  defaultValue={normalKwh}
                  inputMode="decimal"
                  min="0"
                  name="normalKwh"
                  step="0.01"
                  type="number"
                />
              </label>
              <Button type="submit">คำนวณใหม่</Button>
            </form>

            <div className="mt-6 rounded-md border border-border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
              <p className="font-medium text-foreground">Tariff source</p>
              <p>Status: {normalResult.tariffStatus}</p>
              <p>Version: {normalResult.tariffVersionLabel}</p>
              <p>Effective from: {normalResult.tariffSnapshot.effectiveFrom}</p>
              <p>Verified at: {normalResult.verifiedAt ?? "ยังไม่ตรวจสอบ - demo draft"}</p>
              <p className="break-all">Source: {normalResult.sourceUrl}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <ResultPanel icon={ReceiptText} result={normalResult} title="Normal tariff breakdown" />
          <ResultPanel icon={Clock3} result={touResult} title="TOU demo intervals breakdown" />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database aria-hidden="true" className="h-5 w-5 text-primary" />
                TOU interval trace
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Timestamp</th>
                      <th className="px-3 py-2 font-medium">Local date</th>
                      <th className="px-3 py-2 font-medium">Period</th>
                      <th className="px-3 py-2 font-medium">Holiday</th>
                      <th className="px-3 py-2 font-medium">kWh</th>
                      <th className="px-3 py-2 font-medium">Rate</th>
                      <th className="px-3 py-2 font-medium">Charge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {touResult.intervalTraces.map((trace) => (
                      <tr key={trace.timestamp} className="border-t border-border">
                        <td className="px-3 py-2">{trace.timestamp}</td>
                        <td className="px-3 py-2">{trace.localDate}</td>
                        <td className="px-3 py-2">{trace.periodLabel}</td>
                        <td className="px-3 py-2">{trace.isHoliday ? "ใช่" : "ไม่ใช่"}</td>
                        <td className="px-3 py-2">{trace.energyKwh}</td>
                        <td className="px-3 py-2">{trace.rateThbPerKwh}</td>
                        <td className="px-3 py-2">{trace.energyChargeThb}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function ResultPanel({
  icon: Icon,
  result,
  title
}: {
  icon: typeof ReceiptText;
  result: TariffCalculationResult;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon aria-hidden="true" className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{result.mode.toUpperCase()}</Badge>
            <Badge variant="warning">{result.tariffStatus}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          <Summary label="Energy" value={result.energyKwh} unit="kWh" />
          <Summary label="Subtotal" value={formatThb(result.subtotalBeforeVat)} unit="ก่อน VAT" />
          <Summary label="VAT" value={formatThb(result.vat)} unit="บาท" />
          <Summary label="Grand total" value={formatThb(result.grandTotal)} unit="บาท" />
        </div>
        <BreakdownTable items={result.lineItems} />
      </CardContent>
    </Card>
  );
}

function Summary({ label, unit, value }: { label: string; unit: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-normal">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{unit}</p>
    </div>
  );
}

function BreakdownTable({ items }: { items: CalculationLineItem[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Component</th>
            <th className="px-3 py-2 font-medium">Quantity</th>
            <th className="px-3 py-2 font-medium">Unit</th>
            <th className="px-3 py-2 font-medium">Rate</th>
            <th className="px-3 py-2 font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.component} className="border-t border-border">
              <td className="px-3 py-2 font-medium">{item.labelTh}</td>
              <td className="px-3 py-2">{item.quantity}</td>
              <td className="px-3 py-2">{item.unit}</td>
              <td className="px-3 py-2">{item.rate ?? "-"}</td>
              <td className="px-3 py-2">{formatThb(item.amountThb)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatThb(value: string) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value));
}
