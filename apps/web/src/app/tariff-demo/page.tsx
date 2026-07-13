import { Calculator, Clock3, Database, ReceiptText, ShieldCheck } from "lucide-react";
import type { CalculationLineItem, TariffCalculationResult } from "@thai-energy-planner/tariff-engine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOfficialTariffDemo, type TariffDemoSearchParams } from "@/lib/tariff-demo";

export default async function TariffDemoPage({
  searchParams
}: {
  searchParams?: Promise<TariffDemoSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const { authority, billDate, customerSegment, normalKwh, normalResult, touResult, warnings } = getOfficialTariffDemo(params);
  const tariffReady = normalResult.tariffStatus === "published" && Boolean(getFtPeriod(normalResult, billDate));

  return (
    <main className="min-h-screen">
      <section className="border-b border-border bg-white/78">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 md:px-6 lg:py-10">
          <div className="flex flex-wrap gap-2">
            <Badge>อัตราค่าไฟ</Badge>
            <Badge variant="outline">ข้อมูลอัตราที่ใช้คำนวณ</Badge>
            <Badge variant={tariffReady ? "success" : "warning"}>{tariffReady ? "ตรวจสอบแล้ว" : "ข้อมูลอัตรายังไม่พร้อม"}</Badge>
          </div>
          <div className="max-w-3xl space-y-3">
            <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">ตรวจสอบอัตราค่าไฟที่ใช้คำนวณ</h1>
            <p className="leading-7 text-muted-foreground">
              ตรวจสอบอัตราค่าไฟที่ใช้คำนวณ พร้อมแหล่งอ้างอิงอัตราค่าไฟฐานและค่า Ft แยกกันอย่างชัดเจน
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
                  <option value="residential">บ้านอยู่อาศัย</option>
                  <option value="small_business">ธุรกิจขนาดเล็ก</option>
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

            {!tariffReady ? <div className="mt-6 rounded-md border border-warning bg-warning/10 p-4 text-sm leading-6 text-warning-foreground">ข้อมูลอัตราค่าไฟหรือค่า Ft สำหรับวันที่เลือกยังไม่พร้อมตรวจสอบ ระบบจะไม่ใช้ข้อมูลนี้สร้างผลลัพธ์โดยอัตโนมัติ</div> : null}
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <TariffSummary result={normalResult} billDate={billDate} customerSegment={customerSegment} />
          <ResultPanel icon={ReceiptText} result={normalResult} title="รายละเอียดค่าไฟอัตราปกติ" />
          <ResultPanel icon={Clock3} result={touResult} title="รายละเอียดค่าไฟตามช่วงเวลา (TOU)" />

          <details className="rounded-lg border border-border bg-card">
            <summary className="cursor-pointer px-5 py-4 text-lg font-semibold">รายละเอียดทางเทคนิค</summary>
            <div className="border-t border-border p-5">
              <div className="grid gap-3 text-sm leading-6 text-muted-foreground"><p><strong className="text-foreground">รหัสเวอร์ชัน:</strong> {normalResult.tariffVersionId}</p><p><strong className="text-foreground">สำเนาแหล่งข้อมูล:</strong> {normalResult.tariffSnapshot.capturedAt}</p><p><strong className="text-foreground">การตั้งค่าการคำนวณ:</strong> {normalResult.tariffVersionLabel}</p><p><strong className="text-foreground">เวลาที่ตรวจสอบล่าสุด:</strong> {normalResult.verifiedAt ?? "ไม่มี"}</p><p><strong className="text-foreground">โครงสร้างอัตราค่าไฟ:</strong> {normalResult.tariffSnapshot.tariffVersion.meterMode}</p><p><strong className="text-foreground">อัตราค่าไฟรายละเอียด:</strong> {normalResult.tariffSnapshot.tariffVersion.energyRateTiers.map((tier) => `${formatRate(tier.rateThbPerKwh)} บาท/kWh`).join(", ")}</p></div>
            </div>
          </details>

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
                      <th className="px-3 py-2 font-medium">เวลา</th>
                      <th className="px-3 py-2 font-medium">วันที่</th>
                      <th className="px-3 py-2 font-medium">ช่วงเวลา</th>
                      <th className="px-3 py-2 font-medium">วันหยุด</th>
                      <th className="px-3 py-2 font-medium">kWh</th>
                      <th className="px-3 py-2 font-medium">อัตรา</th>
                      <th className="px-3 py-2 font-medium">ค่าใช้จ่าย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {touResult.intervalTraces.map((trace) => (
                      <tr key={trace.timestamp} className="border-t border-border">
                        <td className="px-3 py-2">{trace.timestamp}</td>
                        <td className="px-3 py-2">{trace.localDate}</td>
                        <td className="px-3 py-2">{trace.periodLabel}</td>
                        <td className="px-3 py-2">{trace.isHoliday ? "ใช่" : "ไม่ใช่"}</td>
                        <td className="px-3 py-2">{formatKwh(trace.energyKwh)}</td>
                        <td className="px-3 py-2">{formatRate(trace.rateThbPerKwh)} บาท/kWh</td>
                        <td className="px-3 py-2">{formatThb(trace.energyChargeThb)} บาท</td>
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
            <Badge variant={result.tariffStatus === "published" ? "success" : "warning"}>{translateStatus(result.tariffStatus)}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          <Summary label="พลังงาน" value={formatKwh(result.energyKwh)} unit="kWh" />
          <Summary label="รวมก่อนภาษี" value={formatThb(result.subtotalBeforeVat)} unit="บาท" />
          <Summary label="VAT" value={formatThb(result.vat)} unit="บาท" />
          <Summary label="รวมภาษีแล้ว" value={formatThb(result.grandTotal)} unit="บาท" />
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
            <th className="px-3 py-2 font-medium">รายการ</th>
            <th className="px-3 py-2 font-medium">จำนวน</th>
            <th className="px-3 py-2 font-medium">หน่วย</th>
            <th className="px-3 py-2 font-medium">อัตรา</th>
            <th className="px-3 py-2 font-medium">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.component} className="border-t border-border">
              <td className="px-3 py-2 font-medium">{item.labelTh}</td>
              <td className="px-3 py-2">{formatQuantity(item.quantity)}</td>
              <td className="px-3 py-2">{item.unit}</td>
              <td className="px-3 py-2">{item.rate === null ? "-" : formatRate(item.rate)}</td>
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

function TariffSummary({ result, billDate, customerSegment }: { result: TariffCalculationResult; billDate: string; customerSegment: string }) {
  const snapshot = result.tariffSnapshot;
  const ftPeriod = getFtPeriod(result, billDate);
  const baseRate = snapshot.tariffVersion.energyRateTiers[0]?.rateThbPerKwh ?? null;
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck aria-hidden="true" className="h-5 w-5 text-primary" />สรุปอัตราค่าไฟสำหรับผู้ใช้ทั่วไป</CardTitle></CardHeader><CardContent className="grid gap-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Summary label="ประเภทอัตราค่าไฟ" value={customerSegment === "small_business" ? "ธุรกิจขนาดเล็ก" : "บ้านอยู่อาศัย"} unit={result.mode === "tou" ? "ตามช่วงเวลา" : "อัตราปกติ"} /><Summary label="การไฟฟ้าที่ใช้" value={snapshot.authority} unit={snapshot.authority === "PEA" ? "การไฟฟ้าส่วนภูมิภาค" : "การไฟฟ้านครหลวง"} /><Summary label="อัตราค่าไฟฐาน" value={baseRate === null ? "ไม่มีข้อมูล" : `${formatRate(baseRate)} บาท/หน่วย`} unit="อัตราเริ่มต้นก่อน Ft และ VAT" /><Summary label="ค่า Ft ปัจจุบัน" value={ftPeriod ? `${formatRate(ftPeriod.ftThbPerKwh)} บาท/หน่วย` : "ไม่มีข้อมูล Ft"} unit={ftPeriod ? `มีผล ${formatRange(ftPeriod.effectiveFrom, ftPeriod.effectiveTo)}` : "ไม่ควรใช้สร้างผลลัพธ์"} /><Summary label="วันที่มีผล" value={formatRange(snapshot.effectiveFrom, snapshot.effectiveTo)} unit="อัตราค่าไฟฐาน" /><Summary label="ตรวจสอบล่าสุด" value={formatDate(snapshot.verifiedAt)} unit="ภาษีมูลค่าเพิ่มรวมอยู่ในยอดรวมแล้ว" /></div><div className="grid gap-2 text-sm"><a className="w-fit text-primary underline underline-offset-4" href={snapshot.sourceUrl ?? "#"} target="_blank" rel="noreferrer">ดูแหล่งอ้างอิงอัตราค่าไฟฐาน</a>{ftPeriod?.sourceUrl ? <a className="w-fit text-primary underline underline-offset-4" href={ftPeriod.sourceUrl} target="_blank" rel="noreferrer">ดูแหล่งอ้างอิงค่า Ft</a> : null}</div></CardContent></Card>;
}

function getFtPeriod(result: TariffCalculationResult, billDate: string) { return result.tariffSnapshot.tariffVersion.ftPeriods.find((period) => billDate >= period.effectiveFrom && (period.effectiveTo === null || billDate <= period.effectiveTo)); }
function translateStatus(status: string) { return status === "published" ? "เผยแพร่แล้ว" : status === "verified" ? "ตรวจสอบแล้ว" : status === "draft" ? "ฉบับร่าง" : status; }
function formatRate(value: string | number) { return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(Number(value)); }
function formatKwh(value: string) { return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(Number(value)); }
function formatQuantity(value: string) { return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(Number(value)); }
function formatRange(from: string, to: string | null) { return `${formatDate(from)}${to ? ` ถึง ${formatDate(to)}` : " เป็นต้นไป"}`; }
function formatDate(value: string | null) { if (!value) return "ยังไม่ตรวจสอบ"; const date = new Date(`${value.slice(0, 10)}T12:00:00+07:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("th-TH-u-ca-gregory", { day: "numeric", month: "long", year: "numeric" }); }
