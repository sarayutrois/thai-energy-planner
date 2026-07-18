import type { MonthlyBillInput } from "@thai-energy-planner/shared-types";
import type { LocalLoadProfileSnapshot } from "./local-load-profile";

export type AnalysisDataTrustLevel = "low" | "medium" | "high";
export type AnalysisDataTrustIssue = {
  code:
    | "sample_data"
    | "no_profile"
    | "short_profile"
    | "no_bills"
    | "short_bill_history"
    | "missing_bill_months"
    | "stale_bills"
    | "usage_outlier"
    | "cost_outlier"
    | "mixed_authority"
    | "mixed_meter_mode"
    | "uncalibrated"
    | "large_variance";
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  action: string;
};

export type AnalysisDataTrust = {
  score: number;
  level: AnalysisDataTrustLevel;
  label: string;
  summary: string;
  nextAction: string;
  billMonthCount: number;
  consecutiveBillMonthCount: number;
  missingBillMonthCount: number;
  profileDayCount: number;
  profileSourceLabel: string;
  reconciliation: {
    billMonthlyKwh: number | null;
    profileMonthlyKwhBefore: number | null;
    profileMonthlyKwhCurrent: number | null;
    varianceBeforeKwh: number | null;
    varianceBeforePercent: number | null;
    residualKwh: number | null;
    residualPercent: number | null;
    calibrationFactor: number | null;
    isCalibrated: boolean;
  };
  issues: AnalysisDataTrustIssue[];
};

export function assessAnalysisDataTrust(input: {
  profileSnapshot: LocalLoadProfileSnapshot | null;
  bills: MonthlyBillInput[];
  asOf?: Date;
}): AnalysisDataTrust {
  const profile = input.profileSnapshot;
  const bills = normalizeBills(input.bills);
  const profileDayCount = profile
    ? new Set(profile.rows.map((row) => bangkokDate(row.timestamp))).size
    : 0;
  const profileMonthlyKwhCurrent =
    profile && profileDayCount > 0
      ? (profile.totalKwh / profileDayCount) * 30.44
      : null;
  const billMonthlyKwh = bills.length
    ? bills.reduce((sum, bill) => sum + bill.energyKwh, 0) / bills.length
    : null;
  const profileMonthlyKwhBefore =
    profile?.calibration?.profileMonthlyKwhBefore ?? profileMonthlyKwhCurrent;
  const varianceBeforeKwh = difference(profileMonthlyKwhBefore, billMonthlyKwh);
  const varianceBeforePercent = percentDifference(
    profileMonthlyKwhBefore,
    billMonthlyKwh,
  );
  const residualKwh = difference(profileMonthlyKwhCurrent, billMonthlyKwh);
  const residualPercent = percentDifference(
    profileMonthlyKwhCurrent,
    billMonthlyKwh,
  );
  const missingBillMonthCount = countMissingMonths(
    bills.map((bill) => bill.month),
  );
  const consecutiveBillMonthCount = longestConsecutiveMonths(
    bills.map((bill) => bill.month),
  );
  const issues: AnalysisDataTrustIssue[] = [];

  if (profile?.isSample) {
    issues.push({
      code: "sample_data",
      severity: "critical",
      title: "ยังเป็นข้อมูลตัวอย่าง",
      detail: "ผลลัพธ์ยังไม่ได้สะท้อนสถานที่และพฤติกรรมการใช้ไฟของคุณ",
      action: "แทนที่ Load Profile และบิลตัวอย่างด้วยข้อมูลจริงก่อนตัดสินใจ",
    });
  }
  if (!profile) {
    issues.push({
      code: "no_profile",
      severity: "critical",
      title: "ยังไม่มี Load Profile",
      detail: "ระบบยังไม่รู้ว่าคุณใช้ไฟช่วงเวลาใด",
      action: "สร้าง Load Profile จากเครื่องใช้ไฟฟ้าหรือนำเข้าข้อมูลมิเตอร์",
    });
  } else if (profileDayCount < 30) {
    issues.push({
      code: "short_profile",
      severity: profileDayCount < 7 ? "critical" : "warning",
      title: "ช่วงข้อมูลการใช้ไฟยังสั้น",
      detail: `Load Profile ครอบคลุม ${profileDayCount} วัน จึงอาจไม่เห็นวันหยุดและความเปลี่ยนแปลงตามสัปดาห์`,
      action: "เพิ่มข้อมูลให้ครอบคลุมอย่างน้อย 30 วัน",
    });
  }
  if (!bills.length) {
    issues.push({
      code: "no_bills",
      severity: "critical",
      title: "ยังไม่มีบิลจริงช่วยยืนยัน",
      detail: "ปริมาณไฟรวมยังอ้างอิง Load Profile เพียงอย่างเดียว",
      action: "เพิ่มบิลย้อนหลังอย่างน้อย 1 เดือน และแนะนำ 6–12 เดือน",
    });
  } else if (bills.length < 6) {
    issues.push({
      code: "short_bill_history",
      severity: bills.length < 3 ? "warning" : "info",
      title: "ประวัติบิลยังไม่ครอบคลุมฤดูกาล",
      detail: `มีบิล ${bills.length} เดือน ผลเฉลี่ยอาจยังไม่สะท้อนช่วงร้อน ฝน และวันหยุด`,
      action: "เพิ่มบิลให้ครบอย่างน้อย 6 เดือน และแนะนำ 12 เดือน",
    });
  }
  if (missingBillMonthCount > 0) {
    issues.push({
      code: "missing_bill_months",
      severity: "warning",
      title: "มีเดือนขาดระหว่างช่วงบิล",
      detail: `พบเดือนที่ขาด ${missingBillMonthCount} เดือน ค่าเฉลี่ยอาจข้ามช่วงที่ใช้ไฟต่างจากปกติ`,
      action: "เพิ่มบิลของเดือนที่ขาด หรือระบุว่าไม่มีข้อมูลเดือนนั้น",
    });
  }
  if (isStaleBillHistory(bills, input.asOf ?? new Date())) {
    issues.push({
      code: "stale_bills",
      severity: "warning",
      title: "บิลล่าสุดเก่ากว่า 18 เดือน",
      detail: "รูปแบบการใช้ไฟและค่า Ft อาจเปลี่ยนไปจากช่วงข้อมูลนี้แล้ว",
      action: "เพิ่มบิลล่าสุดก่อนใช้ผลตัดสินใจลงทุน",
    });
  }
  if (hasUsageOutlier(bills)) {
    issues.push({
      code: "usage_outlier",
      severity: "warning",
      title: "พบเดือนที่ใช้ไฟต่างจากปกติมาก",
      detail: "มีอย่างน้อยหนึ่งเดือนต่ำกว่า 40% หรือสูงกว่า 200% ของค่ากลาง",
      action:
        "ตรวจตัวเลข kWh และระบุเหตุการณ์พิเศษ เช่น บ้านว่างหรือเปิดแอร์เพิ่ม",
    });
  }
  if (hasCostOutlier(bills)) {
    issues.push({
      code: "cost_outlier",
      severity: "warning",
      title: "ค่าไฟต่อหน่วยมีค่าผิดสังเกต",
      detail: "ค่าใช้จ่ายหารด้วย kWh บางเดือนต่างจากช่วงทั่วไปมาก",
      action: "ตรวจยอดรวม หน่วย kWh ประเภทมิเตอร์ และรายการค้างชำระในบิล",
    });
  }
  if (distinctDefined(bills.map((bill) => bill.authority)).length > 1) {
    issues.push({
      code: "mixed_authority",
      severity: "warning",
      title: "ข้อมูลมีทั้ง PEA และ MEA",
      detail: "บิลอาจมาจากคนละสถานที่หรือเลือกการไฟฟ้าผิดเดือน",
      action: "แยกวิเคราะห์แต่ละสถานที่ หรือแก้การไฟฟ้าให้ตรงกับบิล",
    });
  }
  if (distinctDefined(bills.map((bill) => bill.meterMode)).length > 1) {
    issues.push({
      code: "mixed_meter_mode",
      severity: "warning",
      title: "ประเภทมิเตอร์เปลี่ยนในชุดบิล",
      detail:
        "มีทั้งมิเตอร์ปกติและ TOU จึงไม่ควรรวมค่าใช้จ่ายเป็นฐานเดียวกันโดยไม่ตรวจช่วงเปลี่ยน",
      action: "ตรวจเดือนที่เปลี่ยนมิเตอร์และใช้เฉพาะช่วงที่เทียบกันได้",
    });
  }
  if (profile && bills.length && !profile.calibration) {
    issues.push({
      code: "uncalibrated",
      severity: "warning",
      title: "ยังไม่ได้ยืนยันใช้บิลปรับ Load Profile",
      detail: "TOU และ Solar ยังใช้ปริมาณไฟรวมจาก Load Profile เดิม",
      action: "ไปหน้า Dashboard เพื่อตรวจส่วนต่างและยืนยันการปรับเทียบ",
    });
  }
  if (Math.abs(varianceBeforePercent ?? 0) > 35 && profile && bills.length) {
    issues.push({
      code: "large_variance",
      severity:
        Math.abs(varianceBeforePercent ?? 0) > 60 ? "critical" : "warning",
      title: "Load Profile ต่างจากบิลมาก",
      detail: `ก่อนปรับเทียบมีส่วนต่าง ${formatPercent(Math.abs(varianceBeforePercent ?? 0))} ซึ่งบ่งชี้ว่าอุปกรณ์หรือเวลาใช้งานอาจยังไม่ครบ`,
      action:
        "ตรวจเครื่องใช้กำลังสูงและช่วงเวลาใช้งาน ก่อนยืนยันขนาด Solar หรือเปลี่ยนมิเตอร์",
    });
  }

  let score = 0;
  if (profile) score += 15;
  score += profileDayCount >= 30 ? 15 : profileDayCount >= 7 ? 8 : 3;
  if (profile) score += profileSourceScore(profile);
  score += Math.min(30, bills.length * 5);
  score +=
    consecutiveBillMonthCount >= 6
      ? 10
      : consecutiveBillMonthCount >= 3
        ? 5
        : 0;
  const absoluteVariance = Math.abs(
    varianceBeforePercent ?? Number.POSITIVE_INFINITY,
  );
  score += absoluteVariance <= 15 ? 15 : absoluteVariance <= 35 ? 8 : 0;
  if (profile?.calibration) score += 10;
  if (missingBillMonthCount > 0)
    score -= Math.min(10, missingBillMonthCount * 3);
  if (issues.some((issue) => issue.code === "usage_outlier")) score -= 8;
  if (issues.some((issue) => issue.code === "cost_outlier")) score -= 8;
  if (issues.some((issue) => issue.code === "mixed_authority")) score -= 10;
  if (issues.some((issue) => issue.code === "mixed_meter_mode")) score -= 10;
  if (issues.some((issue) => issue.code === "stale_bills")) score -= 10;
  if (profile?.isSample) score = Math.min(score, 35);
  score = Math.max(0, Math.min(100, Math.round(score)));

  const level: AnalysisDataTrustLevel =
    score >= 75 && bills.length >= 3 && Boolean(profile?.calibration)
      ? "high"
      : score >= 50
        ? "medium"
        : "low";
  const label =
    level === "high"
      ? "ความน่าเชื่อถือสูง"
      : level === "medium"
        ? "ความน่าเชื่อถือปานกลาง"
        : "ความน่าเชื่อถือต่ำ";
  const summary =
    level === "high"
      ? "ข้อมูลเพียงพอสำหรับใช้ตัดสินใจเบื้องต้น โดยยังควรยืนยันหน้างานและใบเสนอราคา"
      : level === "medium"
        ? "ใช้เปรียบเทียบทางเลือกได้ แต่ควรแก้ประเด็นที่แจ้งก่อนยืนยันเงินลงทุน"
        : "ข้อมูลยังไม่พอสำหรับข้อสรุปด้านการลงทุน ควรปรับข้อมูลก่อนใช้คำแนะนำ";
  const nextIssue =
    issues.find((issue) => issue.severity === "critical") ??
    issues.find((issue) => issue.severity === "warning") ??
    issues[0];

  return {
    score,
    level,
    label,
    summary,
    nextAction:
      nextIssue?.action ?? "ทบทวนข้อมูลเมื่อมีบิลหรือ Load Profile ชุดใหม่",
    billMonthCount: bills.length,
    consecutiveBillMonthCount,
    missingBillMonthCount,
    profileDayCount,
    profileSourceLabel: profileSourceLabel(profile),
    reconciliation: {
      billMonthlyKwh,
      profileMonthlyKwhBefore,
      profileMonthlyKwhCurrent,
      varianceBeforeKwh,
      varianceBeforePercent,
      residualKwh,
      residualPercent,
      calibrationFactor: profile?.calibration?.factor ?? null,
      isCalibrated: Boolean(profile?.calibration),
    },
    issues,
  };
}

function normalizeBills(bills: MonthlyBillInput[]) {
  const byMonth = new Map<string, MonthlyBillInput>();
  for (const bill of bills) {
    if (
      /^\d{4}-(0[1-9]|1[0-2])$/.test(bill.month) &&
      Number.isFinite(bill.energyKwh) &&
      bill.energyKwh >= 0 &&
      Number.isFinite(bill.totalCostThb) &&
      bill.totalCostThb >= 0
    ) {
      byMonth.set(bill.month, bill);
    }
  }
  return [...byMonth.values()].sort((left, right) =>
    left.month.localeCompare(right.month),
  );
}

function profileSourceScore(profile: LocalLoadProfileSnapshot) {
  const kind = profile.canonicalProfile?.source.kind;
  return kind === "smart_meter" || kind === "csv" || kind === "xlsx" ? 10 : 5;
}

function profileSourceLabel(profile: LocalLoadProfileSnapshot | null) {
  if (!profile) return "ยังไม่มี Load Profile";
  const kind = profile.canonicalProfile?.source.kind;
  if (kind === "smart_meter") return "ข้อมูลมิเตอร์";
  if (kind === "csv" || kind === "xlsx") return "ไฟล์ช่วงเวลา";
  if (kind === "appliance") return "รายการเครื่องใช้ไฟฟ้า";
  return profile.sourceName;
}

function difference(left: number | null, right: number | null) {
  return left === null || right === null ? null : left - right;
}

function percentDifference(left: number | null, right: number | null) {
  return left === null || right === null || right <= 0
    ? null
    : ((left - right) / right) * 100;
}

function countMissingMonths(months: string[]) {
  if (months.length < 2) return 0;
  const sorted = [...new Set(months)].sort();
  return Math.max(
    0,
    monthIndex(sorted[sorted.length - 1]!) -
      monthIndex(sorted[0]!) +
      1 -
      sorted.length,
  );
}

function longestConsecutiveMonths(months: string[]) {
  const indexes = [...new Set(months)].map(monthIndex).sort((a, b) => a - b);
  let longest = indexes.length ? 1 : 0;
  let current = longest;
  for (let index = 1; index < indexes.length; index += 1) {
    current = indexes[index] === indexes[index - 1]! + 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

function monthIndex(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return year! * 12 + monthNumber! - 1;
}

function isStaleBillHistory(bills: MonthlyBillInput[], asOf: Date) {
  const latest = bills.at(-1)?.month;
  if (!latest) return false;
  const asOfMonth = asOf.getUTCFullYear() * 12 + asOf.getUTCMonth();
  return asOfMonth - monthIndex(latest) > 18;
}

function hasUsageOutlier(bills: MonthlyBillInput[]) {
  if (bills.length < 3) return false;
  const middle = median(bills.map((bill) => bill.energyKwh));
  if (middle <= 0) return false;
  return bills.some(
    (bill) => bill.energyKwh < middle * 0.4 || bill.energyKwh > middle * 2,
  );
}

function hasCostOutlier(bills: MonthlyBillInput[]) {
  const rates = bills
    .filter((bill) => bill.energyKwh > 0)
    .map((bill) => bill.totalCostThb / bill.energyKwh);
  if (!rates.length) return false;
  const middle = median(rates);
  return rates.some(
    (rate) =>
      rate < 1 ||
      rate > 12 ||
      (rates.length >= 3 && Math.abs(rate - middle) / middle > 0.75),
  );
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function distinctDefined<T>(values: Array<T | undefined>) {
  return [
    ...new Set(values.filter((value): value is T => value !== undefined)),
  ];
}

function bangkokDate(timestamp: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 }).format(value)}%`;
}
