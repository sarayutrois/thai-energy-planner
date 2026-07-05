"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, ReceiptText } from "lucide-react";
import type { MonthlyBillInput } from "@thai-energy-planner/shared-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportActions } from "./report-actions";
import {
  billReportStorageKey,
  billWorkspaceStorageKey,
  localBillReportId,
  type LocalBillReportSnapshot,
  type StoredBillWorkspace
} from "@/lib/local-analysis-snapshot";

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
      if (parsed?.id === localBillReportId) {
        setSnapshot(parsed);
        return;
      }

      const workspaceRaw = window.localStorage.getItem(billWorkspaceStorageKey);
      const workspace = workspaceRaw ? (JSON.parse(workspaceRaw) as Partial<StoredBillWorkspace>) : null;
      const generatedSnapshot = workspace ? buildSnapshotFromWorkspace(workspace) : null;
      if (generatedSnapshot) {
        window.localStorage.setItem(billReportStorageKey, JSON.stringify(generatedSnapshot));
      }
      setSnapshot(generatedSnapshot);
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
          <ReportActions
            csvRows={snapshot.rows.map((row) => ({
              authority: row.authority,
              energyKwh: row.energyKwh,
              meterMode: row.meterMode,
              month: row.month,
              totalCostThb: row.totalCostThb
            }))}
            fileBaseName="thai-energy-planner-bill-summary"
            jsonData={snapshot}
          />
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

function buildSnapshotFromWorkspace(input: Partial<StoredBillWorkspace>): LocalBillReportSnapshot | null {
  const workspace = normalizeWorkspace(input);
  const bills = workspace.rows
    .map((row) => toBillInput(row, workspace))
    .filter(isUsableBill)
    .sort((a, b) => a.month.localeCompare(b.month));
  const uniqueBills = Array.from(new Map(bills.map((bill) => [bill.month, bill])).values());
  if (uniqueBills.length === 0) return null;

  const summary = summarizeLocalBills(uniqueBills);
  const dataQuality = estimateLocalDataQuality(uniqueBills.length);
  const averageMonthlyCostThb = summary.monthCount > 0 ? summary.totalCostThb / summary.monthCount : 0;

  return {
    id: localBillReportId,
    title: "รายงานสรุปบิลค่าไฟ",
    createdAt: new Date().toISOString(),
    audience: workspace.audience,
    monthCount: summary.monthCount,
    totalKwh: summary.totalKwh,
    totalCostThb: summary.totalCostThb,
    averageMonthlyCostThb,
    averageCostPerKwh: summary.averageCostPerKwh,
    dataQualityLabel: dataQuality.labelTh,
    dataQualityScore: dataQuality.score,
    highestMonth: summary.highestMonth
      ? {
          month: summary.highestMonth.month,
          energyKwh: summary.highestMonth.energyKwh,
          totalCostThb: summary.highestMonth.totalCostThb
        }
      : null,
    recommendations: buildBillRecommendations(uniqueBills, summary),
    rows: uniqueBills.map((bill) => ({
      month: bill.month,
      energyKwh: bill.energyKwh,
      totalCostThb: bill.totalCostThb,
      authority: bill.authority ?? "PEA",
      meterMode: bill.meterMode ?? "normal"
    }))
  };
}

function normalizeWorkspace(input: Partial<StoredBillWorkspace>): StoredBillWorkspace {
  return {
    audience: input.audience === "shop" || input.audience === "business" ? input.audience : "home",
    rows: (input.rows ?? []).map((row) => ({
      id: row.id || crypto.randomUUID(),
      month: row.month ?? "",
      energyKwh: row.energyKwh ?? "",
      totalCostThb: row.totalCostThb ?? "",
      authority: row.authority === "MEA" ? "MEA" : "PEA",
      meterMode: row.meterMode === "tou" ? "tou" : "normal"
    })),
    updatedAt: input.updatedAt ?? new Date().toISOString()
  };
}

function toBillInput(row: StoredBillWorkspace["rows"][number], workspace: StoredBillWorkspace): MonthlyBillInput {
  return {
    month: row.month,
    energyKwh: parseLocalizedNumber(row.energyKwh),
    totalCostThb: parseLocalizedNumber(row.totalCostThb),
    authority: row.authority,
    meterMode: row.meterMode,
    customerSegment:
      workspace.audience === "shop" ? "small_business" : workspace.audience === "business" ? "medium_business" : "residential"
  };
}

function isUsableBill(bill: MonthlyBillInput): bill is MonthlyBillInput & { authority: "PEA" | "MEA"; meterMode: "normal" | "tou" } {
  return (
    /^\d{4}-(0[1-9]|1[0-2])$/.test(bill.month) &&
    Number.isFinite(bill.energyKwh) &&
    bill.energyKwh >= 0 &&
    Number.isFinite(bill.totalCostThb) &&
    bill.totalCostThb >= 0
  );
}

function summarizeLocalBills(bills: MonthlyBillInput[]) {
  const totalKwh = bills.reduce((sum, bill) => sum + bill.energyKwh, 0);
  const totalCostThb = bills.reduce((sum, bill) => sum + bill.totalCostThb, 0);
  const highestMonth = bills.reduce<MonthlyBillInput | null>(
    (highest, bill) => (!highest || bill.energyKwh > highest.energyKwh ? bill : highest),
    null
  );

  return {
    monthCount: bills.length,
    totalKwh,
    totalCostThb,
    averageCostPerKwh: totalKwh > 0 ? totalCostThb / totalKwh : null,
    highestMonth
  };
}

function estimateLocalDataQuality(monthCount: number) {
  if (monthCount >= 12) return { labelTh: "ข้อมูลดีมาก", score: 95 };
  if (monthCount >= 6) return { labelTh: "ข้อมูลพอใช้", score: 75 };
  if (monthCount >= 3) return { labelTh: "ข้อมูลเริ่มต้น", score: 55 };
  return { labelTh: "ข้อมูลน้อย", score: 35 };
}

function buildBillRecommendations(
  bills: MonthlyBillInput[],
  summary: ReturnType<typeof summarizeLocalBills>
): LocalBillReportSnapshot["recommendations"] {
  const averageKwh = summary.monthCount > 0 ? summary.totalKwh / summary.monthCount : 0;
  const averageCost = summary.monthCount > 0 ? summary.totalCostThb / summary.monthCount : 0;
  const highest = summary.highestMonth;

  return [
    {
      title: bills.length >= 12 ? "ข้อมูลพร้อมดูภาพทั้งปี" : "ควรเพิ่มบิลให้ใกล้ 12 เดือน",
      description:
        bills.length >= 12
          ? "มีข้อมูลครบปีพอสำหรับดูฤดูกาลและค่าไฟเฉลี่ยรายปีได้ดีขึ้น"
          : "ใช้ดูภาพรวมเบื้องต้นได้แล้ว แต่ถ้าจะตัดสินใจเรื่อง Solar, Battery หรือ TOU ควรเพิ่มบิลย้อนหลังให้มากขึ้น",
      badge: `${bills.length} เดือน`
    },
    {
      title: averageKwh >= 500 ? "โหลดค่อนข้างสูง ควรลอง TOU และ Solar" : "โหลดไม่สูงมาก เริ่มจากดูพฤติกรรมใช้ไฟก่อน",
      description:
        averageKwh >= 500
          ? `ใช้ไฟเฉลี่ยประมาณ ${formatNumber(averageKwh)} kWh/เดือน มีโอกาสเห็นผลชัดจากการเทียบ TOU หรือ Solar`
          : `ใช้ไฟเฉลี่ยประมาณ ${formatNumber(averageKwh)} kWh/เดือน ควรดูช่วงเวลาใช้งานและอุปกรณ์หลักก่อนลงทุนใหญ่`,
      badge: `${formatNumber(averageCost)} บาท/เดือน`
    },
    {
      title: highest ? `เดือนที่สูงสุดคือ ${highest.month}` : "ยังไม่มีเดือนที่สรุปได้",
      description: highest
        ? `เดือนนี้ใช้ ${formatNumber(highest.energyKwh)} kWh และจ่าย ${formatNumber(highest.totalCostThb)} บาท ใช้เป็นจุดเริ่มต้นถามว่ามีกิจกรรมพิเศษหรือไม่`
        : "กรอกอย่างน้อยหนึ่งเดือนเพื่อให้ระบบสรุปเดือนที่ควรตรวจเป็นพิเศษ",
      badge: "ตรวจ pattern"
    }
  ];
}

function parseLocalizedNumber(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  return normalized ? Number(normalized) : Number.NaN;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}
