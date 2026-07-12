import type { MonthlyBillInput } from "@thai-energy-planner/shared-types";
import {
  billReportStorageKey,
  billWorkspaceStorageKey,
  localBillReportId,
  type LocalBillReportSnapshot,
  type StoredBillWorkspace
} from "@/lib/local-analysis-snapshot";

export function readLocalBillReportSnapshot(): LocalBillReportSnapshot | null {
  const raw = window.localStorage.getItem(billReportStorageKey);
  const parsed = raw ? (JSON.parse(raw) as LocalBillReportSnapshot) : null;
  if (parsed?.id === localBillReportId) return parsed;

  const workspaceRaw = window.localStorage.getItem(billWorkspaceStorageKey);
  const workspace = workspaceRaw ? (JSON.parse(workspaceRaw) as Partial<StoredBillWorkspace>) : null;
  const generatedSnapshot = workspace?.mode === "user" ? buildSnapshotFromWorkspace(workspace) : null;
  if (generatedSnapshot) {
    window.localStorage.setItem(billReportStorageKey, JSON.stringify(generatedSnapshot));
  }
  return generatedSnapshot;
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
    mode: "user",
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
