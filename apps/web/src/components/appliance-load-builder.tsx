"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Gauge,
  Plus,
  ReceiptText,
  Save,
  Trash2,
  Zap,
} from "lucide-react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import { simulateApplianceLoadProfileRange } from "@thai-energy-planner/calculation-engine";
import type {
  ApplianceInput,
  ApplianceScheduleInput,
  LoadIntervalInput,
} from "@thai-energy-planner/shared-types";
import { Button } from "@/components/ui/button";
import {
  persistLocalLoadProfile,
  saveLocalLoadProfileSnapshot,
} from "@/lib/local-load-profile";
import { applianceSourceLabel, storedApplianceWorkspaceMode, type ApplianceWorkspaceMode } from "@/components/appliance-workspace-state";

const draftStorageKey = "thai-energy-planner.appliance-workspace.v3";
const days = [
  { value: 1, label: "จ" },
  { value: 2, label: "อ" },
  { value: 3, label: "พ" },
  { value: 4, label: "พฤ" },
  { value: 5, label: "ศ" },
  { value: 6, label: "ส" },
  { value: 0, label: "อา" },
];
const airConditionerSizes = [
  { btu: 9000, inverterW: 800, fixedSpeedW: 950 },
  { btu: 12000, inverterW: 1100, fixedSpeedW: 1350 },
  { btu: 18000, inverterW: 1700, fixedSpeedW: 2100 },
  { btu: 24000, inverterW: 2300, fixedSpeedW: 2800 },
] as const;

const presets = [
  { name: "เครื่องปรับอากาศ Inverter 9,000 BTU", category: "เครื่องปรับอากาศ", powerW: 800, dutyCycle: 0.65, start: "18:00", end: "23:00" },
  { name: "ตู้เย็น", category: "ตู้เย็น", powerW: 120, dutyCycle: 0.35, start: "00:00", end: "00:00" },
  { name: "เครื่องทำน้ำอุ่น", category: "เครื่องทำน้ำอุ่น", powerW: 3500, dutyCycle: 1, start: "06:30", end: "07:00" },
  { name: "เครื่องซักผ้า", category: "เครื่องซักผ้า", powerW: 500, dutyCycle: 1, start: "10:00", end: "11:00" },
  { name: "โทรทัศน์", category: "เครื่องใช้ไฟฟ้าภายในบ้าน", powerW: 100, dutyCycle: 1, start: "18:00", end: "22:00" },
  { name: "ไฟส่องสว่าง LED", category: "แสงสว่าง", powerW: 12, dutyCycle: 1, start: "18:00", end: "23:00" },
  { name: "คอมพิวเตอร์ตั้งโต๊ะ", category: "สำนักงาน", powerW: 250, dutyCycle: 1, start: "09:00", end: "17:00" },
  { name: "เครื่องชาร์จรถยนต์ไฟฟ้า", category: "EV", powerW: 7400, dutyCycle: 1, start: "22:00", end: "02:00" },
] as const;

type ApplianceSeed = {
  name: string;
  category: string;
  powerW: number;
  dutyCycle: number;
  start: string;
  end: string;
  quantity?: number;
  daysOfWeek?: number[];
  coolingCapacityBtu?: number;
  compressorType?: "inverter" | "fixed_speed";
};

const additionalPresets: ApplianceSeed[] = [
  { name: "หม้อหุงข้าว", category: "ครัว", powerW: 700, dutyCycle: 0.75, start: "17:30", end: "18:30" },
  { name: "ไมโครเวฟ", category: "ครัว", powerW: 1200, dutyCycle: 0.5, start: "18:00", end: "18:30" },
  { name: "ปั๊มน้ำ", category: "ปั๊มน้ำ", powerW: 370, dutyCycle: 0.4, start: "06:00", end: "20:00" },
  { name: "พัดลม", category: "เครื่องใช้ไฟฟ้าภายในบ้าน", powerW: 55, dutyCycle: 1, start: "18:00", end: "06:00" },
  { name: "เครื่องอบผ้า", category: "เครื่องซักผ้า", powerW: 2500, dutyCycle: 0.75, start: "10:00", end: "11:30", daysOfWeek: [6, 0] },
  { name: "เครื่องล้างจาน", category: "ครัว", powerW: 1300, dutyCycle: 0.7, start: "20:00", end: "21:00" },
];
const allPresets: ApplianceSeed[] = [...presets, ...additionalPresets];

const homeStarterSets: Array<{ id: string; label: string; description: string; items: ApplianceSeed[] }> = [
  {
    id: "compact_home",
    label: "บ้านเล็ก 1 ห้องนอน",
    description: "แอร์ 1 เครื่อง ตู้เย็น ทีวี ไฟ และเครื่องครัวพื้นฐาน",
    items: [
      { name: "เครื่องปรับอากาศ Inverter 12,000 BTU", category: "เครื่องปรับอากาศ", coolingCapacityBtu: 12000, compressorType: "inverter", powerW: 1100, dutyCycle: 0.65, start: "18:00", end: "06:00" },
      { name: "ตู้เย็น", category: "ตู้เย็น", powerW: 120, dutyCycle: 0.35, start: "00:00", end: "00:00" },
      { name: "โทรทัศน์", category: "เครื่องใช้ไฟฟ้าภายในบ้าน", powerW: 100, dutyCycle: 1, start: "18:00", end: "22:00" },
      { name: "ไฟส่องสว่าง LED", category: "แสงสว่าง", powerW: 12, quantity: 8, dutyCycle: 1, start: "18:00", end: "23:00" },
      { name: "หม้อหุงข้าว", category: "ครัว", powerW: 700, dutyCycle: 0.75, start: "17:30", end: "18:30" },
      { name: "เครื่องซักผ้า", category: "เครื่องซักผ้า", powerW: 500, dutyCycle: 1, start: "10:00", end: "11:00", daysOfWeek: [6, 0] },
    ],
  },
  {
    id: "family_home",
    label: "บ้านครอบครัว 2 ห้องนอน",
    description: "แอร์ 2 เครื่อง พร้อมปั๊มน้ำ เครื่องทำน้ำอุ่น และเครื่องใช้ทั่วไป",
    items: [
      { name: "เครื่องปรับอากาศ Inverter 9,000 BTU", category: "เครื่องปรับอากาศ", coolingCapacityBtu: 9000, compressorType: "inverter", powerW: 800, dutyCycle: 0.65, start: "18:00", end: "06:00" },
      { name: "เครื่องปรับอากาศ Inverter 18,000 BTU", category: "เครื่องปรับอากาศ", coolingCapacityBtu: 18000, compressorType: "inverter", powerW: 1700, dutyCycle: 0.65, start: "18:00", end: "06:00" },
      { name: "ตู้เย็น", category: "ตู้เย็น", powerW: 120, dutyCycle: 0.35, start: "00:00", end: "00:00" },
      { name: "ไฟส่องสว่าง LED", category: "แสงสว่าง", powerW: 12, quantity: 14, dutyCycle: 1, start: "18:00", end: "23:00" },
      { name: "โทรทัศน์", category: "เครื่องใช้ไฟฟ้าภายในบ้าน", powerW: 100, quantity: 2, dutyCycle: 1, start: "18:00", end: "22:00" },
      { name: "เครื่องทำน้ำอุ่น", category: "เครื่องทำน้ำอุ่น", powerW: 3500, dutyCycle: 1, start: "06:30", end: "07:00" },
      { name: "ปั๊มน้ำ", category: "ปั๊มน้ำ", powerW: 370, dutyCycle: 0.4, start: "06:00", end: "20:00" },
    ],
  },
  {
    id: "condo",
    label: "ห้องเช่า/คอนโด",
    description: "แอร์ 1 เครื่อง ตู้เย็น และไฟส่องสว่าง",
    items: [presets[0], presets[1], presets[5]],
  },
  {
    id: "small_shop",
    label: "ร้านค้าขนาดเล็ก",
    description: "แอร์ ไฟส่องสว่าง และอุปกรณ์หน้าร้าน",
    items: [presets[0], presets[5], presets[6]],
  },
  {
    id: "multi_air",
    label: "บ้านที่มีเครื่องปรับอากาศหลายเครื่อง",
    description: "ตัวอย่างแอร์ 2 เครื่อง พร้อมตู้เย็นและไฟส่องสว่าง",
    items: [presets[0], { ...presets[0], name: "เครื่องปรับอากาศ Inverter 18,000 BTU", powerW: 1700 }, presets[1], presets[5]],
  },
  {
    id: "ev_home",
    label: "บ้านที่มีรถยนต์ไฟฟ้า",
    description: "ตัวอย่างบ้านพร้อมเครื่องชาร์จรถยนต์ไฟฟ้า",
    items: [presets[0], presets[1], presets[5], presets[7]],
  },
];

type Draft = {
  mode: ApplianceWorkspaceMode;
  appliances: ApplianceInput[];
  intervalMinutes: 15 | 30 | 60;
  startDate: string;
  endDate: string;
};

function createDailySchedules(item: ApplianceInput): ApplianceScheduleInput[] {
  const sourceSchedules = item.schedules?.length ? item.schedules : [item.schedule];
  return days.flatMap((day) => {
    const source = sourceSchedules.find((schedule) => schedule.daysOfWeek.includes(day.value));
    return source ? [{ ...source, daysOfWeek: [day.value] }] : [];
  });
}

function scheduleForDay(item: ApplianceInput, day: number): ApplianceScheduleInput | undefined {
  const sourceSchedules = item.schedules?.length ? item.schedules : [item.schedule];
  return sourceSchedules.find((schedule) => schedule.daysOfWeek.includes(day));
}

function applianceFromSeed(seed: ApplianceSeed): ApplianceInput {
  const isAirConditioner = seed.coolingCapacityBtu !== undefined;
  return {
    name: seed.name,
    category: seed.category,
    power: seed.powerW,
    powerUnit: "W",
    quantity: seed.quantity ?? 1,
    dutyCycle: seed.dutyCycle,
    applianceKind: isAirConditioner ? "air_conditioner" : "other",
    ...(isAirConditioner ? {
      coolingCapacityBtu: seed.coolingCapacityBtu,
      compressorType: seed.compressorType ?? "inverter",
    } : {}),
    powerSource: "catalog",
    notes: "ค่ามาตรฐานเริ่มต้น กรุณาตรวจฉลากเครื่องจริง",
    schedule: {
      startTime: seed.start,
      endTime: seed.end,
      daysOfWeek: seed.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6],
      workingDayOnly: false,
      holidayOnly: false,
      seasonalMonths: [],
    },
  };
}

export function ApplianceLoadBuilder({
  initialAppliances,
  startDate: initialStartDate,
  endDate: initialEndDate,
}: {
  initialAppliances: ApplianceInput[];
  startDate: string;
  endDate: string;
}) {
  const [appliances, setAppliances] = useState(initialAppliances);
  const [mode, setMode] = useState<ApplianceWorkspaceMode>(initialAppliances.length ? "user" : "empty");
  const [intervalMinutes, setIntervalMinutes] = useState<15 | 30 | 60>(30);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [hydrated, setHydrated] = useState(false);
  const [autoSaveLabel, setAutoSaveLabel] = useState("กำลังเตรียมพื้นที่ทำงาน...");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "local_only">("idle");
  const hasUserEditedBeforeHydration = useRef(false);

  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(draftStorageKey);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft) as Partial<Draft>;
        if (!hasUserEditedBeforeHydration.current) {
          if (Array.isArray(draft.appliances)) {
            const storedMode = storedApplianceWorkspaceMode(draft.mode, draft.appliances.length);
            setAppliances(storedMode === "empty" ? [] : draft.appliances);
            setMode(storedMode);
          }
          if ([15, 30, 60].includes(draft.intervalMinutes ?? 0)) setIntervalMinutes(draft.intervalMinutes!);
          if (draft.startDate) setStartDate(draft.startDate);
          if (draft.endDate) setEndDate(draft.endDate);
        }
      }
    } catch {
      setAutoSaveLabel("ไม่สามารถเรียกข้อมูลที่บันทึกไว้ได้");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setAutoSaveLabel("กำลังบันทึก...");
    const timer = window.setTimeout(() => {
      if (mode === "empty") window.localStorage.removeItem(draftStorageKey);
      else {
        const draft: Draft = { mode, appliances, intervalMinutes, startDate, endDate };
        window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
      }
      setAutoSaveLabel(`บันทึกอัตโนมัติ ${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [appliances, endDate, hydrated, intervalMinutes, mode, startDate]);

  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    if (!appliances.length) issues.push("เพิ่มเครื่องใช้ไฟฟ้าอย่างน้อย 1 รายการ");
    if (endDate < startDate) issues.push("วันที่สิ้นสุดต้องไม่อยู่ก่อนวันที่เริ่มต้น");
    appliances.forEach((item, index) => {
      if (!item.name.trim()) issues.push(`รายการที่ ${index + 1}: ระบุชื่อเครื่องใช้ไฟฟ้า`);
      if (!(item.power > 0)) issues.push(`รายการที่ ${index + 1}: กำลังไฟต้องมากกว่า 0 W`);
      if (!(item.quantity > 0)) issues.push(`รายการที่ ${index + 1}: จำนวนต้องมากกว่า 0`);
      const hasScheduledDay = (item.schedules?.length ? item.schedules : [item.schedule])
        .some((schedule) => schedule.daysOfWeek.length > 0);
      if (!hasScheduledDay) issues.push(`รายการที่ ${index + 1}: เลือกวันใช้งานอย่างน้อย 1 วัน`);
    });
    return issues;
  }, [appliances, endDate, startDate]);

  const simulation = useMemo(() => {
    if (validationIssues.length) return null;
    try {
      return simulateApplianceLoadProfileRange({ appliances, startDate, endDate, intervalMinutes });
    } catch {
      return null;
    }
  }, [appliances, endDate, intervalMinutes, startDate, validationIssues.length]);

  const hasAppliances = appliances.length > 0;
  const dailyKwh = simulation?.averageDailyKwh ?? 0;
  const monthlyKwh = dailyKwh * 30.44;
  const peakKw = simulation?.peakKw ?? 0;
  const quality = appliances.length >= 5
      ? { label: "ปานกลาง", score: 62, detail: "คำนวณจากรายการและช่วงเวลาที่ระบุ" }
      : { label: "ต่ำ", score: 38, detail: "ข้อมูลเครื่องใช้ไฟฟ้ายังมีจำนวนจำกัด" };
  const chartData = useMemo(() => buildHourlyChart(simulation?.intervals ?? []), [simulation?.intervals]);

  function update(index: number, patch: Partial<ApplianceInput>) {
    setAppliances((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
    setMode("user");
    setSaveStatus("idle");
  }

  function updateDaySchedule(
    index: number,
    day: number,
    patch: Partial<ApplianceScheduleInput> | null,
  ) {
    setAppliances((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const existing = scheduleForDay(item, day);
      const schedules = createDailySchedules(item)
        .filter((schedule) => schedule.daysOfWeek[0] !== day);
      if (patch) {
        schedules.push({
          ...(existing ?? { ...item.schedule, daysOfWeek: [day] }),
          ...patch,
          daysOfWeek: [day],
        });
      }
      return { ...item, schedules };
    }));
    setMode("user");
    setSaveStatus("idle");
  }

  function copyDaySchedule(
    index: number,
    sourceDay: number,
    targetDays: number[],
  ) {
    setAppliances((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const source = scheduleForDay(item, sourceDay)
        ?? item.schedules?.[0]
        ?? item.schedule;
      const schedules = createDailySchedules(item)
        .filter((schedule) => !targetDays.includes(schedule.daysOfWeek[0] ?? -1));
      for (const day of targetDays) schedules.push({ ...source, daysOfWeek: [day] });
      return { ...item, schedules };
    }));
    setMode("user");
    setSaveStatus("idle");
  }

  function addPreset(presetName: string) {
    const preset = allPresets.find((item) => item.name === presetName);
    if (!preset) return;
    hasUserEditedBeforeHydration.current = true;
    setAppliances((current) => [...current, applianceFromSeed(preset)]);
    setMode("user");
  }

  function addHomeStarterSet(id: string) {
    const starterSet = homeStarterSets.find((item) => item.id === id);
    if (!starterSet) return;
    hasUserEditedBeforeHydration.current = true;
    if (appliances.length > 0 && !window.confirm("เปลี่ยนเป็นชุดตัวอย่างใหม่และแทนที่รายการเดิมใช่หรือไม่")) return;
    setAppliances(starterSet.items.map(applianceFromSeed));
    setMode("sample");
    setSaveStatus("idle");
  }

  function addCustom() {
    hasUserEditedBeforeHydration.current = true;
    setAppliances((current) => [...current, {
      name: "เครื่องใช้ไฟฟ้า",
      category: "กำหนดเอง",
      power: 100,
      powerUnit: "W",
      quantity: 1,
      dutyCycle: 1,
      applianceKind: "other",
      powerSource: "manual",
      schedule: { startTime: "18:00", endTime: "22:00", daysOfWeek: [0, 1, 2, 3, 4, 5, 6], workingDayOnly: false, holidayOnly: false, seasonalMonths: [] },
    }]);
    setMode("user");
  }

  function updateAirConditioner(index: number, btu: number, compressorType: "inverter" | "fixed_speed") {
    const size = airConditionerSizes.find((item) => item.btu === btu);
    if (!size) return;
    const power = compressorType === "inverter" ? size.inverterW : size.fixedSpeedW;
    update(index, {
      applianceKind: "air_conditioner",
      coolingCapacityBtu: btu,
      compressorType,
      power,
      powerUnit: "W",
      powerSource: "catalog",
      dutyCycle: compressorType === "inverter" ? 0.65 : 0.85,
      name: `เครื่องปรับอากาศ ${compressorType === "inverter" ? "Inverter" : "Fixed speed"} ${btu.toLocaleString("th-TH")} BTU`,
    });
  }

  async function saveLoadProfile(navigateToBills = false) {
    if (!simulation) return;
    if (mode === "sample" && !window.confirm("ชุดอุปกรณ์นี้ยังเป็นข้อมูลตัวอย่าง ผลลัพธ์เป็นเพียงตัวอย่าง ต้องการบันทึกต่อหรือไม่")) return;
    const rows = simulation.intervals;
    const snapshot = saveLocalLoadProfileSnapshot({
      sourceName: "Load Profile จากเครื่องใช้ไฟฟ้า",
      sourceKind: "appliance",
      totalKwh: rows.reduce((sum, row) => sum + row.energyKwh, 0),
      peakKw,
      detectedIntervalMinutes: intervalMinutes,
      rows,
      warnings: ["ผลคำนวณจากข้อมูลเครื่องใช้ไฟฟ้าที่ผู้ใช้ระบุ ยังไม่ได้เปรียบเทียบกับบิลค่าไฟ"],
      persist: false,
    });
    setSaveStatus("saving");
    const result = await persistLocalLoadProfile(snapshot);
    setSaveStatus(result.status === "saved" ? "saved" : "local_only");
    if (navigateToBills) window.location.assign("/analysis/load-data/bills?source=appliance");
  }

  function clearAll() {
    setAppliances([]);
    setMode("empty");
    setSaveStatus("idle");
  }

  function useSampleAsStartingPoint() {
    setMode("user");
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/35 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">ขั้นตอนที่ 1 จาก 4 · สร้าง Load Profile</p>
          <p className="mt-1 text-xs text-muted-foreground">ข้อมูลหน้านี้จะใช้ต่อใน Solar, Battery และการประมาณค่าไฟ</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Save className="h-4 w-4" />{autoSaveLabel}</div>
      </div>

      {mode === "sample" ? (
        <div className="rounded-xl border border-warning bg-warning/10 p-4">
          <p className="font-semibold">กำลังใช้ชุดอุปกรณ์ตัวอย่าง — กรุณาปรับจำนวน กำลังไฟ และเวลาใช้งานให้ตรงกับสถานที่จริง</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={useSampleAsStartingPoint}>ใช้ชุดนี้เป็นจุดเริ่มต้น</Button>
            <Button variant="outline" onClick={clearAll}>ล้างทั้งหมด</Button>
            <Button variant="outline" onClick={clearAll}>เปลี่ยนชุดตัวอย่าง</Button>
          </div>
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">1. เพิ่มเครื่องใช้ไฟฟ้า</h2>
            <p className="mt-1 text-sm text-muted-foreground">เลือกค่าตั้งต้นแล้วแก้กำลังไฟและเวลาใช้งานให้ตรงกับสถานที่จริง</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="grid gap-1 text-xs font-medium">
              รายการสำเร็จรูป
              <select className="h-10 min-w-64 rounded-md border border-input bg-background px-3 text-sm" defaultValue="" disabled={!hydrated} onChange={(event) => { addPreset(event.target.value); event.currentTarget.value = ""; }}>
                <option value="">เลือกเครื่องใช้ไฟฟ้า</option>
                {allPresets.map((preset) => <option key={preset.name} value={preset.name}>{preset.name} · {preset.powerW.toLocaleString("th-TH")} W</option>)}
              </select>
            </label>
            <Button className="self-end" variant="outline" disabled={!hydrated} onClick={addCustom}><Plus className="h-4 w-4" />เพิ่มเอง</Button>
          </div>
        </div>
        <div className="mt-4 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
          <p className="text-sm font-semibold">เริ่มจากบ้านตัวอย่าง</p>
          <p className="mt-1 text-xs text-muted-foreground">เพิ่มรายการพื้นฐานให้ครบก่อน แล้วแก้จำนวน กำลังไฟ และเวลาให้ตรงบ้านจริง</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {homeStarterSets.map((starterSet) => (
              <Button key={starterSet.id} variant="outline" disabled={!hydrated} className="h-auto min-h-10 flex-col items-start px-3 py-2 text-left" onClick={() => addHomeStarterSet(starterSet.id)}>
                <span>{starterSet.label}</span><span className="text-xs font-normal text-muted-foreground">{starterSet.description}</span>
              </Button>
            ))}
          </div>
        </div>

        {appliances.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-border px-5 py-10 text-center">
            <Zap className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">ยังไม่มีอุปกรณ์</p>
            <p className="mt-1 text-sm text-muted-foreground">เพิ่มเครื่องใช้ไฟฟ้าทีละรายการ หรือเลือกชุดตัวอย่างเพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {appliances.map((item, index) => (
              <div key={`${index}-${item.category}`} className="rounded-lg border border-border p-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_.7fr_auto]">
                  <TextField label="ชื่อเครื่องใช้ไฟฟ้า" value={item.name} onChange={(name) => update(index, { name })} />
                  <NumberField label="กำลังไฟ (W)" value={item.powerUnit === "kW" ? item.power * 1000 : item.power} min={1} step={1} onChange={(power) => update(index, { power, powerUnit: "W", powerSource: "nameplate" })} />
                  <NumberField label="จำนวน (เครื่อง)" value={item.quantity} min={1} step={1} onChange={(quantity) => update(index, { quantity: Math.max(1, Math.round(quantity)) })} />
                  <Button aria-label={`ลบ ${item.name}`} className="self-end px-3" variant="ghost" onClick={() => { const next = appliances.filter((_, itemIndex) => itemIndex !== index); setAppliances(next); setMode(next.length ? "user" : "empty"); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
                {isAirConditioner(item) ? (
                  <div className="mt-3 grid gap-3 rounded-md border border-primary/20 bg-primary/5 p-3 md:grid-cols-3">
                    <label className="grid gap-1 text-xs font-medium">ขนาดแอร์ (BTU)
                      <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={item.coolingCapacityBtu ?? 9000} onChange={(event) => updateAirConditioner(index, Number(event.target.value), item.compressorType ?? "inverter")}>
                        {airConditionerSizes.map((size) => <option key={size.btu} value={size.btu}>{size.btu.toLocaleString("th-TH")} BTU</option>)}
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs font-medium">ประเภทคอมเพรสเซอร์
                      <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={item.compressorType ?? "inverter"} onChange={(event) => updateAirConditioner(index, item.coolingCapacityBtu ?? 9000, event.target.value as "inverter" | "fixed_speed")}>
                        <option value="inverter">Inverter</option><option value="fixed_speed">Fixed speed</option>
                      </select>
                    </label>
                    <div className="rounded-md bg-background px-3 py-2 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">แหล่งกำลังไฟ: </strong>{powerSourceLabel(item.powerSource)}<br />ค่ามาตรฐานจาก BTU เป็นค่าเริ่มต้น ควรแก้ W ตามฉลากเครื่องจริงเพื่อเพิ่มความแม่นยำ</div>
                  </div>
                ) : null}
                <div className="mt-4 rounded-md border border-border bg-muted/20 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">ตั้งเวลาแยกตามวัน</p>
                      <p className="text-xs text-muted-foreground">กด “เปิดใช้” ที่วันนั้นก่อน จึงแก้เวลาเริ่ม–หยุดได้</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button className="h-8 px-3 text-xs" variant="outline" onClick={() => copyDaySchedule(index, 1, [6, 0])}>คัดลอก จ.–ศ. ไป ส.–อา.</Button>
                      <Button className="h-8 px-3 text-xs" variant="outline" onClick={() => copyDaySchedule(index, 1, days.map((day) => day.value))}>เปิดใช้ทุกวัน</Button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {days.map((day) => {
                      const schedule = scheduleForDay(item, day.value);
                      const active = Boolean(schedule);
                      return (
                        <div key={day.value} className={`grid grid-cols-[auto_1fr_1fr] items-end gap-2 rounded-md border p-2 ${active ? "border-primary/40 bg-background" : "border-border bg-muted/40"}`}>
                          <button
                            aria-label={`${day.label}: ${active ? "กำลังใช้งาน กดเพื่อปิด" : "ปิดอยู่ กดเพื่อเปิดใช้งาน"}`}
                            aria-pressed={active}
                            className={`flex h-10 min-w-12 flex-col items-center justify-center rounded-md px-2 text-xs font-semibold ${active ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                            onClick={() => updateDaySchedule(index, day.value, active ? null : {})}
                            type="button"
                          >
                            <span>{day.label}</span><span className="text-[10px] font-normal">{active ? "ใช้งาน" : "เปิดใช้"}</span>
                          </button>
                          <TimeField
                            label="เริ่ม"
                            value={schedule?.startTime ?? item.schedule.startTime}
                            disabled={!active}
                            onChange={(startTime) => updateDaySchedule(index, day.value, { startTime })}
                          />
                          <TimeField
                            label="หยุด"
                            value={schedule?.endTime ?? item.schedule.endTime}
                            disabled={!active}
                            onChange={(endTime) => updateDaySchedule(index, day.value, { endTime })}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">หากเวลาหยุดน้อยกว่าเวลาเริ่ม ระบบจะคิดว่าใช้งานต่อเนื่องข้ามเที่ยงคืน เช่น 18:00–06:00</p>
                </div>
                <p className="mt-3 text-right text-xs text-muted-foreground">ตัวคูณการทำงาน {Math.round(item.dutyCycle * 100)}%</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 md:p-5">
        <h2 className="text-lg font-semibold">2. ตรวจสอบผลการคำนวณ</h2>
        <p className="mt-1 text-sm font-medium text-muted-foreground">{applianceSourceLabel(mode)}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={<Gauge className="h-5 w-5" />} label="Peak Load" value={hasAppliances ? `${formatNumber(peakKw)} kW` : "N/A"} />
          <Metric icon={<Zap className="h-5 w-5" />} label="พลังงานต่อวัน" value={hasAppliances ? `${formatNumber(dailyKwh)} kWh/วัน` : "N/A"} />
          <Metric icon={<ReceiptText className="h-5 w-5" />} label="พลังงานต่อเดือน" value={hasAppliances ? `${formatNumber(monthlyKwh)} kWh/เดือน` : "N/A"} />
          <Metric icon={<CheckCircle2 className="h-5 w-5" />} label="ความน่าเชื่อถือ" value={hasAppliances ? `${quality.label} · ${quality.score}/100` : "ยังไม่มีข้อมูล"} detail={hasAppliances ? quality.detail : undefined} />
        </div>
        <div className="mt-5 h-[300px] rounded-lg border border-border p-3">
          {chartData.some((row) => row.loadKw > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs><linearGradient id="loadFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.35} /><stop offset="95%" stopColor="#f97316" stopOpacity={0.03} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={2} />
                <YAxis unit=" kW" tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={(value) => [`${formatNumber(Number(value))} kW`, "โหลดเฉลี่ย"]} />
                <Area dataKey="loadKw" name="โหลดเฉลี่ย" stroke="#ea580c" strokeWidth={2.5} fill="url(#loadFill)" type="monotone" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">กราฟจะแสดงเมื่อข้อมูลเครื่องใช้ไฟฟ้าครบ</div>}
        </div>
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-4 w-4" />กราฟแสดงกำลังไฟเฉลี่ยรายชั่วโมงตามช่วงเวลาที่ผู้ใช้ระบุ</p>
      </section>

      {validationIssues.length ? (
        <div className="rounded-lg border border-warning bg-warning/10 p-4 text-sm">
          <p className="font-semibold"><AlertCircle className="mr-2 inline h-4 w-4" />ข้อมูลที่ยังไม่ครบ</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{validationIssues.slice(0, 5).map((issue) => <li key={issue}>{issue}</li>)}</ul>
        </div>
      ) : null}

      <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <a className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:bg-muted" href="/analysis/load-data"><ArrowLeft className="h-4 w-4" />ย้อนกลับ</a>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <span className="text-xs text-muted-foreground">{saveStatus === "saving" ? "กำลังบันทึก..." : saveStatus === "saved" ? "บันทึกในบัญชีแล้ว" : saveStatus === "local_only" ? "บันทึกในอุปกรณ์นี้แล้ว" : "พร้อมบันทึกเมื่อข้อมูลครบ"}</span>
          <Button disabled={!simulation || validationIssues.length > 0 || saveStatus === "saving"} onClick={() => void saveLoadProfile()}>บันทึก Load Profile</Button>
          <Button disabled={!simulation || validationIssues.length > 0 || saveStatus === "saving"} onClick={() => void saveLoadProfile(true)}>บันทึกแล้วกรอกบิล<ArrowRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

function buildHourlyChart(rows: LoadIntervalInput[]) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour: `${String(hour).padStart(2, "0")}:00`, total: 0, count: 0 }));
  for (const row of rows) {
    const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", hourCycle: "h23" }).format(new Date(row.timestamp)));
    const bucket = buckets[hour];
    if (!bucket) continue;
    bucket.total += row.powerKw ?? 0;
    bucket.count += 1;
  }
  return buckets.map((bucket) => ({ hour: bucket.hour, loadKw: bucket.count ? bucket.total / bucket.count : 0 }));
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-xs font-medium">{label}<input className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
function TimeField({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return <label className={`grid gap-1 text-xs font-medium ${disabled ? "text-muted-foreground" : ""}`}>{label}<input className="h-10 rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50" type="time" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} /></label>;
}
function NumberField({ label, value, onChange, min, step }: { label: string; value: number; onChange: (value: number) => void; min?: number; step?: number }) {
  return <label className="grid gap-1 text-xs font-medium">{label}<input className="h-10 rounded-md border border-input bg-background px-3 text-sm" type="number" value={value} min={min} step={step} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail?: string | undefined }) {
  return <div className="rounded-lg border border-border bg-background p-4"><div className="flex items-center gap-2 text-primary">{icon}<p className="text-xs font-medium text-muted-foreground">{label}</p></div><p className="mt-3 text-xl font-semibold">{value}</p>{detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}</div>;
}
function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
}

function isAirConditioner(item: ApplianceInput) {
  return item.applianceKind === "air_conditioner" || item.category === "เครื่องปรับอากาศ";
}

function powerSourceLabel(source: ApplianceInput["powerSource"]) {
  if (source === "nameplate") return "ผู้ใช้ระบุจากฉลากเครื่องจริง";
  if (source === "manual") return "ผู้ใช้ระบุเอง";
  return "ค่ามาตรฐานจากขนาด BTU";
}
