import Decimal from "decimal.js";
import type { MonthlyBillInput } from "@thai-energy-planner/shared-types";

export type MonthlyBillSummary = {
  totalKwh: number;
  totalCost: number;
  averageKwh: number;
  averageCost: number;
  averageCostPerKwh: number | null;
  monthCount: number;
};

export type DataQualityInput = {
  source: "interval" | "bill" | "appliance" | "estimate";
  intervalMonths: number;
  hasTwelveMonthBills: boolean;
};

export type DataQualityResult = {
  level: "high" | "medium" | "low";
  labelTh: "สูง" | "ปานกลาง" | "ต่ำ";
  score: number;
  reasonTh: string;
};

export function summarizeMonthlyBills(bills: MonthlyBillInput[]): MonthlyBillSummary {
  const totalKwh = bills.reduce((sum, bill) => sum.plus(bill.energyKwh), new Decimal(0));
  const totalCost = bills.reduce((sum, bill) => sum.plus(bill.totalCostThb), new Decimal(0));
  const monthCount = bills.length;
  const averageKwh = monthCount > 0 ? totalKwh.div(monthCount) : new Decimal(0);
  const averageCost = monthCount > 0 ? totalCost.div(monthCount) : new Decimal(0);
  const averageCostPerKwh = totalKwh.gt(0) ? totalCost.div(totalKwh) : null;

  return {
    totalKwh: totalKwh.toNumber(),
    totalCost: totalCost.toNumber(),
    averageKwh: averageKwh.toNumber(),
    averageCost: averageCost.toNumber(),
    averageCostPerKwh: averageCostPerKwh?.toNumber() ?? null,
    monthCount
  };
}

export function estimateDataQuality(input: DataQualityInput): DataQualityResult {
  if (input.source === "interval" && input.intervalMonths >= 12) {
    return {
      level: "high",
      labelTh: "สูง",
      score: 95,
      reasonTh: "มี Load Profile ครบ 12 เดือน"
    };
  }

  if (input.hasTwelveMonthBills) {
    return {
      level: "medium",
      labelTh: "ปานกลาง",
      score: 70,
      reasonTh: "มีบิลย้อนหลัง 12 เดือนแต่ยังไม่มี Interval Data"
    };
  }

  return {
    level: "low",
    labelTh: "ต่ำ",
    score: 40,
    reasonTh: "ข้อมูลมาจากค่าเฉลี่ยหรือรายการเครื่องใช้ไฟฟ้า"
  };
}

export const calculationEngineVersion = "0.1.0-foundation";

export * from "./load-data.js";
export * from "./load-profile-adapters.js";
export * from "./appliance-profile.js";
export * from "./energy-types.js";
export * from "./financial.js";
export * from "./scenario.js";
export * from "./scenario-engine.js";
export * from "./solar-engine.js";
export * from "./battery-ev-engine.js";
export * from "./thai-billing.js";
