import { Calculator, Clock3, Database, ReceiptText } from "lucide-react";
import type { CalculationLineItem, TariffCalculationResult } from "@thai-energy-planner/tariff-engine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainNav } from "@/components/main-nav";
import { getOfficialTariffDemo, type TariffDemoSearchParams } from "@/lib/tariff-demo";

export default async function TariffDemoPage({
  searchParams
}: {
  searchParams?: Promise<TariffDemoSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const { authority, billDate, customerSegment, normalKwh, normalResult, touResult, warnings } = getOfficialTariffDemo(params);

  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="border-b border-border bg-white/78">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 md:px-6 lg:py-10">
          <div className="flex flex-wrap gap-2">
            <Badge>อัตราค่าไฟ</Badge>
            <Badge variant="outline">ข้อมูลอัตราที่ใช้คำนวณ</Badge>
            <Badge variant="success">{normalResult.tariffStatus}</Badge>
          </div>
          <div className="max-w-3xl space-y-3">
            <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">ตรวจสอบอัตราค่าไฟที่ใช้คำนวณ</h1>
            <p className="leading-7 text-muted-foreground">
              หน้านี้ใช้ tariff configuration ที่แยกจาก UI และมี version, effective date, Ft, VAT และ source snapshot
              เพื่อให้ตรวจสอบ calculation breakdown ได้อย่างโปร่งใส
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-8 md:px-6 lg:grid-cols-[360px_1fr] lg:py-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator aria-hidden="true" className="h-5 w-5 text-primary" />
              ข้อมูลสำหรับคำนวณค่าไฟ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" method="get">
              <label className="grid gap-2 text-sm font-medium">
                การไฟฟ้า
                <select className="h-10 rounded-md border border-input bg-transparent text-foreground px-3 text-sm" defaultValue={authority} name="authority">
                  <option value="PEA">PEA</option>
                  <option value="MEA">MEA</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                ประเภทผู้ใช้
                <select className="h-10 rounded-md border border-input bg-transparent text-foreground px-3 text-sm" defaultValue={customerSegment} name="customerSegment">
                  <option value="residential">Residential</option>
                  <option value="small_business">Small business</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                วันที่บิล
                <input
                  className="h-10 rounded-md border border-input bg-transparent text-foreground px-3 text-sm"
                  defaultValue={billDate}
                  name="billDate"
                  type="date"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                หน่วยไฟรายเดือน (kWh)
                <input
                  className="h-10 rounded-md border border-input bg-transparent text-foreground px-3 text-sm"
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

            {warnings.length > 0 ? (
              <div className="mt-6 rounded-md border border-warning bg-warning/10 p-4 text-sm leading-6 text-warning-foreground">
                {warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}

            <div className="mt-6 rounded-md border border-border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
              <p className="font-medium text-foreground">Tariff source</p>
              <p>Status: {normalResult.tariffStatus}</p>
              <p>Version: {normalResult.tariffVersionLabel}</p>
              <p>Effective from: {normalResult.tariffSnapshot.effectiveFrom}</p>
              <p>Verified at: {normalResult.verifiedAt ?? "ยังไม่ตรวจสอบ"}</p>
              <p className="break-all">Source: {normalResult.sourceUrl}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <ResultPanel icon={ReceiptText} result={normalResult} title="รายละเอียดค่าไฟอัตราปกติ" />
          <ResultPanel icon={Clock3} result={touResult} title="รายละเอียดค่าไฟตามช่วงเวลา (TOU)" />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database aria-hidden="true" className="h-5 w-5 text-primary" />
                รายละเอียดช่วงเวลา TOU
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
            <Badge variant={result.tariffStatus === "published" ? "success" : "warning"}>{result.tariffStatus}</Badge>
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

function formatThb(value: string) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value));
}
