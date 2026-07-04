"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportActions } from "./report-actions";
import { billReportStorageKey, localBillReportId, type LocalBillReportSnapshot } from "@/lib/local-analysis-snapshot";

const audienceLabels = {
  home: "บ้านพักอาศัย",
  shop: "ร้านค้า",
  business: "ธุรกิจขนาดเล็ก"
};

export function LocalBillReport() {
  const [snapshot, setSnapshot] = useState<LocalBillReportSnapshot | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(billReportStorageKey);
      const parsed = raw ? (JSON.parse(raw) as LocalBillReportSnapshot) : null;
      setSnapshot(parsed?.id === localBillReportId ? parsed : null);
    } catch {
      setSnapshot(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  if (!loaded) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">กำลังโหลดรายงานจาก browser...</CardContent>
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card className="border-warning">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
            ยังไม่มีรายงานจากบิลในเครื่องนี้
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm leading-6 text-muted-foreground">
            กลับไปหน้ากรอกบิล แล้วกด “สร้างรายงานจากบิลนี้” เพื่อสร้าง snapshot ที่เก็บไว้ใน browser ของคุณ
          </p>
          <a
            className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring"
            href="/analysis/load-data/bills"
          >
            ไปกรอกบิล
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <article className="rounded-md border border-border bg-card p-5 shadow-panel print:border-none print:shadow-none">
      <header className="border-b border-border pb-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ReceiptText aria-hidden="true" className="h-5 w-5" />
            </div>
            <h2 className="text-3xl font-semibold tracking-normal">{snapshot.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              สร้างเมื่อ {new Date(snapshot.createdAt).toLocaleString("th-TH")} · {audienceLabels[snapshot.audience]}
            </p>
          </div>
          <ReportActions />
        </div>
      </header>

      <section className="grid gap-5 py-5">
        <div className="grid gap-3 md:grid-cols-5">
          <Metric label="จำนวนเดือน" value={`${snapshot.monthCount}`} />
          <Metric label="หน่วยรวม" value={`${formatNumber(snapshot.totalKwh)} kWh`} />
          <Metric label="ค่าไฟรวม" value={`${formatNumber(snapshot.totalCostThb)} บาท`} />
          <Metric label="เฉลี่ยต่อเดือน" value={`${formatNumber(snapshot.averageMonthlyCostThb)} บาท`} />
          <Metric label="คุณภาพข้อมูล" value={`${snapshot.dataQualityLabel} (${snapshot.dataQualityScore})`} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 aria-hidden="true" className="h-5 w-5 text-primary" />
                สรุปคำแนะนำ
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {snapshot.recommendations.map((item) => (
                <div key={item.title} className="rounded-md border border-border p-4">
                  <Badge variant="outline">{item.badge}</Badge>
                  <p className="mt-3 font-semibold">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>เดือนที่ควรตรวจ</CardTitle>
            </CardHeader>
            <CardContent>
              {snapshot.highestMonth ? (
                <div className="rounded-md border border-border bg-muted/35 p-4">
                  <p className="text-sm font-medium">{snapshot.highestMonth.month}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    ใช้ {formatNumber(snapshot.highestMonth.energyKwh)} kWh และจ่าย{" "}
                    {formatNumber(snapshot.highestMonth.totalCostThb)} บาท
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลเดือนที่สรุปได้</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>รายการบิลที่ใช้สร้างรายงาน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">เดือน</th>
                    <th className="px-3 py-2 font-medium">kWh</th>
                    <th className="px-3 py-2 font-medium">ค่าไฟรวม</th>
                    <th className="px-3 py-2 font-medium">การไฟฟ้า</th>
                    <th className="px-3 py-2 font-medium">มิเตอร์</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.rows.map((row) => (
                    <tr key={row.month} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{row.month}</td>
                      <td className="px-3 py-2">{formatNumber(row.energyKwh)}</td>
                      <td className="px-3 py-2">{formatNumber(row.totalCostThb)}</td>
                      <td className="px-3 py-2">{row.authority}</td>
                      <td className="px-3 py-2">{row.meterMode.toUpperCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <p className="border-t border-border pt-4 text-center text-xs leading-6 text-muted-foreground">
          รายงานนี้สร้างจากข้อมูลที่เก็บใน browser ของเครื่องนี้ ยังไม่ใช่ข้อมูลจากฐานข้อมูลกลาง
          และยังใช้เพื่อประเมินเบื้องต้นก่อนตรวจ tariff ทางการ
        </p>
      </section>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/35 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-normal">{value}</p>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}
