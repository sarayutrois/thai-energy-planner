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
    name: "มิเตอร์ปกติ (Baseline)",
    monthlyCost: "6,500 บาท",
    investment: "0 บาท",
    annualSaving: "-",
    payback: "-",
    note: "อัตราก้าวหน้าปกติ"
  },
  {
    name: "เปลี่ยนมิเตอร์ TOU",
    monthlyCost: "5,800 บาท",
    investment: "6,900 บาท",
    annualSaving: "8,400 บาท/ปี",
    payback: "0.8 ปี",
    note: "เหมาะกับบ้านที่ใช้ไฟกลางคืนเยอะ"
  },
  {
    name: "TOU + โซลาร์เซลล์ (5kW)",
    monthlyCost: "2,500 บาท",
    investment: "150,000 บาท",
    annualSaving: "48,000 บาท/ปี",
    payback: "3.1 ปี",
    note: "คุ้มค่าที่สุดสำหรับคนอยู่บ้านกลางวัน"
  },
  {
    name: "TOU + โซลาร์เซลล์ + แบตเตอรี่",
    monthlyCost: "800 บาท",
    investment: "280,000 บาท",
    annualSaving: "68,400 บาท/ปี",
    payback: "4.1 ปี",
    note: "อิสระจากบิลค่าไฟอย่างแท้จริง"
  }
];

export const moduleTiles = [
  { label: "Normal / TOU", icon: Zap },
  { label: "Solar", icon: SunMedium },
  { label: "Battery", icon: BatteryCharging },
  { label: "EV", icon: PlugZap }
];
