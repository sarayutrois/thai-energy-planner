import {
  BatteryCharging,
  ClipboardCheck,
  FileUp,
  Landmark,
  PlugZap,
  Settings2,
  SunMedium,
  WalletCards,
  Zap
} from "lucide-react";
import type { MonthlyBillInput } from "@thai-energy-planner/shared-types";

export const demoBills: MonthlyBillInput[] = [
  { month: "2026-01", energyKwh: 620, totalCostThb: 3020 },
  { month: "2026-02", energyKwh: 650, totalCostThb: 3180 },
  { month: "2026-03", energyKwh: 710, totalCostThb: 3520 },
  { month: "2026-04", energyKwh: 760, totalCostThb: 3800 },
  { month: "2026-05", energyKwh: 735, totalCostThb: 3670 },
  { month: "2026-06", energyKwh: 690, totalCostThb: 3420 }
];

export const workflowSteps = [
  {
    title: "ข้อมูลสถานที่",
    description: "พื้นที่ ประเภทผู้ใช้ไฟ การไฟฟ้า และข้อมูลมิเตอร์",
    icon: Landmark
  },
  {
    title: "นำเข้าโหลด",
    description: "บิลย้อนหลัง, CSV/XLSX หรือสร้างจากเครื่องใช้ไฟฟ้า",
    icon: FileUp
  },
  {
    title: "ตรวจข้อมูล",
    description: "คุณภาพข้อมูล timestamp, interval, หน่วย และ anomaly",
    icon: ClipboardCheck
  },
  {
    title: "ตั้งสถานการณ์",
    description: "Normal, TOU, Load shifting, Solar, Battery และ EV",
    icon: Settings2
  },
  {
    title: "คำนวณผล",
    description: "ค่าไฟ เงินประหยัด Payback, NPV, IRR และคำแนะนำ",
    icon: WalletCards
  }
];

export const scenarioPreviewRows = [
  {
    name: "มิเตอร์ปกติ",
    monthlyCost: "รออัตรา verified",
    investment: "0 บาท",
    annualSaving: "-",
    payback: "-",
    note: "ใช้เป็น baseline"
  },
  {
    name: "TOU ไม่เปลี่ยนพฤติกรรม",
    monthlyCost: "รอ engine Phase 2",
    investment: "ตามค่าบริการจริง",
    annualSaving: "ต้องคำนวณจาก profile",
    payback: "-",
    note: "พิจารณา Peak/Off-Peak ตามเวลาไทย"
  },
  {
    name: "Solar",
    monthlyCost: "รอ Solar Phase 5",
    investment: "ตามขนาดระบบ",
    annualSaving: "จาก self-consumption",
    payback: "คำนวณภายหลัง",
    note: "ไม่แนะนำจาก kWh รายเดือนอย่างเดียว"
  },
  {
    name: "TOU + Solar + EV",
    monthlyCost: "รอ Scenario Phase 4-6",
    investment: "รวมหลายโมดูล",
    annualSaving: "จากหลายสมมติฐาน",
    payback: "คำนวณภายหลัง",
    note: "ต้องบันทึก assumption snapshot"
  }
];

export const moduleTiles = [
  { label: "Normal / TOU", icon: Zap },
  { label: "Solar", icon: SunMedium },
  { label: "Battery", icon: BatteryCharging },
  { label: "EV", icon: PlugZap }
];
