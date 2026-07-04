import { AlertTriangle, ReceiptText } from "lucide-react";
import { demoManualBills, summarizeBills, validateMonthlyBills } from "@thai-energy-planner/calculation-engine";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainNav } from "@/components/main-nav";

export default function BillsPage() {
  const validation = validateMonthlyBills(demoManualBills);
  const summary = summarizeBills(demoManualBills);
  const billsByMonth = new Map(validation.bills.map((bill) => [bill.month, bill]));

  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="mb-5 flex flex-wrap gap-2">
          <Badge>Manual Bill Input</Badge>
          <Badge variant="outline">สูงสุดอย่างน้อย 12 เดือน</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-normal">กรอกบิลค่าไฟย้อนหลัง</h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          หน้านี้แสดง form structure และ demo validation สำหรับข้อมูลบิลหลายเดือน รวมถึงค่า Ft, VAT, ขนาดมิเตอร์ และแรงดัน
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-5">
          <Metric label="จำนวนเดือน" value={summary.monthCount.toString()} />
          <Metric label="หน่วยรวม" value={`${formatNumber(summary.totalKwh)} kWh`} />
          <Metric label="ค่าไฟรวม" value={`${formatNumber(summary.totalCostThb)} บาท`} />
          <Metric label="เฉลี่ยต่อหน่วย" value={summary.averageCostPerKwh ? `${formatNumber(summary.averageCostPerKwh)} บาท/kWh` : "-"} />
          <Metric label="เดือนสูงสุด" value={summary.highestMonth?.month ?? "-"} />
        </div>

        {validation.issues.length > 0 ? (
          <Card className="mt-5 border-warning">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle aria-hidden="true" className="h-5 w-5" />
                Validation warnings/errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 text-sm">
                {validation.issues.map((issue) => (
                  <li key={`${issue.code}-${issue.rowNumber}`}>{issue.messageTh}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText aria-hidden="true" className="h-5 w-5 text-primary" />
              ตารางบิลย้อนหลัง
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">เดือน</th>
                    <th className="px-3 py-2">หน่วยงาน</th>
                    <th className="px-3 py-2">มิเตอร์</th>
                    <th className="px-3 py-2">kWh</th>
                    <th className="px-3 py-2">ค่าไฟรวม</th>
                    <th className="px-3 py-2">Ft</th>
                    <th className="px-3 py-2">VAT</th>
                    <th className="px-3 py-2">เฉลี่ย/หน่วย</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.monthlyTrend.map((row) => {
                    const bill = billsByMonth.get(row.month);
                    return (
                      <tr key={row.month} className="border-t border-border">
                        <td className="px-3 py-2">{row.month}</td>
                        <td className="px-3 py-2">{bill?.authority ?? "-"}</td>
                        <td className="px-3 py-2">{bill?.meterMode ?? "-"}</td>
                        <td className="px-3 py-2">{formatNumber(row.energyKwh)}</td>
                        <td className="px-3 py-2">{formatNumber(row.totalCostThb)}</td>
                        <td className="px-3 py-2">{bill?.ftThbPerKwh === undefined ? "-" : formatNumber(bill.ftThbPerKwh)}</td>
                        <td className="px-3 py-2">{bill?.vatThb === undefined ? "-" : formatNumber(bill.vatThb)}</td>
                        <td className="px-3 py-2">{row.averageCostPerKwh ? formatNumber(row.averageCostPerKwh) : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-5">
          <CardHeader>
            <CardTitle>ฟอร์มบิลใหม่</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              {["หน่วยงาน PEA/MEA", "ประเภทผู้ใช้ไฟ", "เดือน/ปี", "จำนวนหน่วย kWh", "ค่าไฟรวม", "ค่า Ft", "ค่าบริการ", "VAT", "ขนาดมิเตอร์", "แรงดันไฟฟ้า", "หมายเหตุ"].map((field) => (
                <label key={field} className="grid gap-2 text-sm font-medium">
                  {field}
                  <input className="h-10 rounded-md border border-input px-3 text-sm" placeholder={field} />
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-normal">{value}</p>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}
