"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { ApplianceInput, LoadIntervalInput } from "@thai-energy-planner/shared-types";
import { Button } from "@/components/ui/button";
import {
  persistLocalLoadProfile,
  saveLocalLoadProfileSnapshot,
} from "@/lib/local-load-profile";
import { billWorkspaceStorageKey, type StoredBillWorkspace } from "@/lib/local-analysis-snapshot";

const draftStorageKey = "thai-energy-planner.appliance-workspace.v2";
const days = [
  { value: 1, label: "จ" },
  { value: 2, label: "อ" },
  { value: 3, label: "พ" },
  { value: 4, label: "พฤ" },
  { value: 5, label: "ศ" },
  { value: 6, label: "ส" },
  { value: 0, label: "อา" },
];
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

type Draft = {
  appliances: ApplianceInput[];
  intervalMinutes: 15 | 30 | 60;
  startDate: string;
  endDate: string;
  billTargetKwh: number | null;
  calibrated: boolean;
};

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
  const [intervalMinutes, setIntervalMinutes] = useState<15 | 30 | 60>(30);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [billTargetKwh, setBillTargetKwh] = useState<number | null>(null);
  const [calibrated, setCalibrated] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [autoSaveLabel, setAutoSaveLabel] = useState("กำลังเตรียมพื้นที่ทำงาน...");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "local_only">("idle");

  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(draftStorageKey);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft) as Partial<Draft>;
        if (Array.isArray(draft.appliances)) setAppliances(draft.appliances);
        if ([15, 30, 60].includes(draft.intervalMinutes ?? 0)) setIntervalMinutes(draft.intervalMinutes!);
        if (draft.startDate) setStartDate(draft.startDate);
        if (draft.endDate) setEndDate(draft.endDate);
        if (typeof draft.billTargetKwh === "number") setBillTargetKwh(draft.billTargetKwh);
        setCalibrated(Boolean(draft.calibrated));
      }
      const rawBills = window.localStorage.getItem(billWorkspaceStorageKey);
      if (rawBills && !rawDraft) {
        const workspace = JSON.parse(rawBills) as StoredBillWorkspace;
        const values = workspace.rows.map((row) => Number(row.energyKwh)).filter((value) => Number.isFinite(value) && value > 0);
        if (values.length) setBillTargetKwh(values.reduce((sum, value) => sum + value, 0) / values.length);
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
      const draft: Draft = { appliances, intervalMinutes, startDate, endDate, billTargetKwh, calibrated };
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
      setAutoSaveLabel(`บันทึกอัตโนมัติ ${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [appliances, billTargetKwh, calibrated, endDate, hydrated, intervalMinutes, startDate]);

  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    if (!appliances.length) issues.push("เพิ่มเครื่องใช้ไฟฟ้าอย่างน้อย 1 รายการ");
    if (endDate < startDate) issues.push("วันที่สิ้นสุดต้องไม่อยู่ก่อนวันที่เริ่มต้น");
    appliances.forEach((item, index) => {
      if (!item.name.trim()) issues.push(`รายการที่ ${index + 1}: ระบุชื่อเครื่องใช้ไฟฟ้า`);
      if (!(item.power > 0)) issues.push(`รายการที่ ${index + 1}: กำลังไฟต้องมากกว่า 0 W`);
      if (!(item.quantity > 0)) issues.push(`รายการที่ ${index + 1}: จำนวนต้องมากกว่า 0`);
      if (!item.schedule.daysOfWeek.length) issues.push(`รายการที่ ${index + 1}: เลือกวันใช้งานอย่างน้อย 1 วัน`);
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

  const modeledMonthlyKwh = (simulation?.averageDailyKwh ?? 0) * 30.44;
  const scaleFactor = calibrated && billTargetKwh && modeledMonthlyKwh > 0 ? billTargetKwh / modeledMonthlyKwh : 1;
  const dailyKwh = (simulation?.averageDailyKwh ?? 0) * scaleFactor;
  const monthlyKwh = dailyKwh * 30.44;
  const peakKw = (simulation?.peakKw ?? 0) * scaleFactor;
  const variancePercent = billTargetKwh && modeledMonthlyKwh > 0 ? ((modeledMonthlyKwh - billTargetKwh) / billTargetKwh) * 100 : null;
  const quality = billTargetKwh && calibrated
    ? { label: "สูง", score: 82, detail: "ปรับสเกลจากหน่วยไฟในบิลแล้ว" }
    : appliances.length >= 5
      ? { label: "ปานกลาง", score: 62, detail: "คำนวณจากรายการและช่วงเวลาที่ระบุ" }
      : { label: "ต่ำ", score: 38, detail: "ข้อมูลเครื่องใช้ไฟฟ้ายังมีจำนวนจำกัด" };
  const chartData = useMemo(() => buildHourlyChart(simulation?.intervals ?? [], scaleFactor), [scaleFactor, simulation?.intervals]);

  function update(index: number, patch: Partial<ApplianceInput>) {
    setAppliances((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
    setSaveStatus("idle");
  }

  function addPreset(presetName: string) {
    const preset = presets.find((item) => item.name === presetName);
    if (!preset) return;
    setAppliances((current) => [...current, {
      name: preset.name,
      category: preset.category,
      power: preset.powerW,
      powerUnit: "W",
      quantity: 1,
      dutyCycle: preset.dutyCycle,
      notes: "ค่ามาตรฐานเริ่มต้น กรุณาตรวจฉลากเครื่องจริง",
      schedule: { startTime: preset.start, endTime: preset.end, daysOfWeek: [0, 1, 2, 3, 4, 5, 6], workingDayOnly: false, holidayOnly: false, seasonalMonths: [] },
    }]);
  }

  function addCustom() {
    setAppliances((current) => [...current, {
      name: "เครื่องใช้ไฟฟ้า",
      category: "กำหนดเอง",
      power: 100,
      powerUnit: "W",
      quantity: 1,
      dutyCycle: 1,
      schedule: { startTime: "18:00", endTime: "22:00", daysOfWeek: [0, 1, 2, 3, 4, 5, 6], workingDayOnly: false, holidayOnly: false, seasonalMonths: [] },
    }]);
  }

  async function saveForSolar(navigate = false) {
    if (!simulation) return;
    const rows = simulation.intervals.map((row) => ({ ...row, energyKwh: row.energyKwh * scaleFactor, powerKw: (row.powerKw ?? 0) * scaleFactor }));
    const snapshot = saveLocalLoadProfileSnapshot({
      sourceName: calibrated ? "Load Profile จากเครื่องใช้ไฟฟ้า (ปรับเทียบบิลแล้ว)" : "Load Profile จากเครื่องใช้ไฟฟ้า",
      sourceKind: "appliance",
      totalKwh: rows.reduce((sum, row) => sum + row.energyKwh, 0),
      peakKw,
      detectedIntervalMinutes: intervalMinutes,
      rows,
      warnings: calibrated ? [`ปรับสเกล ${scaleFactor.toFixed(3)} เท่าเพื่อให้ใกล้เคียงบิล ${formatNumber(billTargetKwh ?? 0)} kWh/เดือน`] : ["ผลคำนวณจากข้อมูลเครื่องใช้ไฟฟ้าที่ผู้ใช้ระบุ"],
      persist: false,
    });
    setSaveStatus("saving");
    const result = await persistLocalLoadProfile(snapshot);
    setSaveStatus(result.status === "saved" ? "saved" : "local_only");
    if (navigate) window.location.assign("/analysis/solar?source=appliance");
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

      <section className="rounded-xl border border-border bg-card p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">1. เพิ่มเครื่องใช้ไฟฟ้า</h2>
            <p className="mt-1 text-sm text-muted-foreground">เลือกค่าตั้งต้นแล้วแก้กำลังไฟและเวลาใช้งานให้ตรงกับสถานที่จริง</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="grid gap-1 text-xs font-medium">
              รายการสำเร็จรูป
              <select className="h-10 min-w-64 rounded-md border border-input bg-background px-3 text-sm" defaultValue="" onChange={(event) => { addPreset(event.target.value); event.currentTarget.value = ""; }}>
                <option value="">เลือกเครื่องใช้ไฟฟ้า</option>
                {presets.map((preset) => <option key={preset.name} value={preset.name}>{preset.name} · {preset.powerW.toLocaleString("th-TH")} W</option>)}
              </select>
            </label>
            <Button className="self-end" variant="outline" onClick={addCustom}><Plus className="h-4 w-4" />เพิ่มเอง</Button>
          </div>
        </div>

        {appliances.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-border px-5 py-10 text-center">
            <Zap className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">ยังไม่มีข้อมูลเครื่องใช้ไฟฟ้า</p>
            <p className="mt-1 text-sm text-muted-foreground">เลือกจากรายการสำเร็จรูปหรือเพิ่มรายการเองเพื่อเริ่มคำนวณ</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {appliances.map((item, index) => (
              <div key={`${index}-${item.category}`} className="rounded-lg border border-border p-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_.7fr_1fr_1fr_auto]">
                  <TextField label="ชื่อเครื่องใช้ไฟฟ้า" value={item.name} onChange={(name) => update(index, { name })} />
                  <NumberField label="กำลังไฟ (W)" value={item.powerUnit === "kW" ? item.power * 1000 : item.power} min={1} step={1} onChange={(power) => update(index, { power, powerUnit: "W" })} />
                  <NumberField label="จำนวน (เครื่อง)" value={item.quantity} min={1} step={1} onChange={(quantity) => update(index, { quantity: Math.max(1, Math.round(quantity)) })} />
                  <TimeField label="เริ่มใช้" value={item.schedule.startTime} onChange={(startTime) => update(index, { schedule: { ...item.schedule, startTime } })} />
                  <TimeField label="หยุดใช้" value={item.schedule.endTime} onChange={(endTime) => update(index, { schedule: { ...item.schedule, endTime } })} />
                  <Button aria-label={`ลบ ${item.name}`} className="self-end px-3" variant="ghost" onClick={() => setAppliances((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-xs font-medium text-muted-foreground">วันที่ใช้งาน</span>
                  {days.map((day) => {
                    const active = item.schedule.daysOfWeek.includes(day.value);
                    return <button key={day.value} aria-pressed={active} className={`h-8 min-w-8 rounded-md border px-2 text-xs font-medium ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`} onClick={() => update(index, { schedule: { ...item.schedule, daysOfWeek: active ? item.schedule.daysOfWeek.filter((value) => value !== day.value) : [...item.schedule.daysOfWeek, day.value] } })} type="button">{day.label}</button>;
                  })}
                  <span className="ml-auto text-xs text-muted-foreground">ตัวคูณการทำงาน {Math.round(item.dutyCycle * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 md:p-5">
        <h2 className="text-lg font-semibold">2. ตรวจสอบผลการคำนวณ</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={<Gauge className="h-5 w-5" />} label="Peak Load" value={`${formatNumber(peakKw)} kW`} />
          <Metric icon={<Zap className="h-5 w-5" />} label="พลังงานต่อวัน" value={`${formatNumber(dailyKwh)} kWh/วัน`} />
          <Metric icon={<ReceiptText className="h-5 w-5" />} label="พลังงานต่อเดือน" value={`${formatNumber(monthlyKwh)} kWh/เดือน`} />
          <Metric icon={<CheckCircle2 className="h-5 w-5" />} label="ความน่าเชื่อถือ" value={`${quality.label} · ${quality.score}/100`} detail={quality.detail} />
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

      <section className="rounded-xl border border-border bg-card p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">3. เทียบกับบิลค่าไฟ</h2>
            <p className="mt-1 text-sm text-muted-foreground">ใช้หน่วยไฟเฉลี่ยจากบิลเพื่อปรับสเกล Load Profile ให้ใกล้เคียงการใช้ไฟจริง</p>
          </div>
          <a className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted" href="/analysis/load-data/bills">กรอกข้อมูลจากบิล</a>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <NumberField label="หน่วยไฟเฉลี่ยจากบิล (kWh/เดือน)" value={billTargetKwh ?? 0} min={0} step={1} onChange={(value) => { setBillTargetKwh(value || null); setCalibrated(false); }} />
          <div className="rounded-md bg-muted px-4 py-3 text-sm">
            <span className="text-muted-foreground">Load Profile ก่อนปรับ:</span> <strong>{formatNumber(modeledMonthlyKwh)} kWh/เดือน</strong>
            <br /><span className="text-muted-foreground">ความต่างจากบิล:</span> <strong>{variancePercent === null ? "ยังเทียบไม่ได้" : `${variancePercent > 0 ? "+" : ""}${formatNumber(variancePercent)}%`}</strong>
          </div>
          <Button disabled={!billTargetKwh || modeledMonthlyKwh <= 0} onClick={() => setCalibrated((value) => !value)}>{calibrated ? "ยกเลิกการปรับสเกล" : "เทียบและปรับสเกล"}</Button>
        </div>
        {calibrated ? <div className="mt-4 rounded-md border border-success bg-success/10 p-3 text-sm text-foreground"><CheckCircle2 className="mr-2 inline h-4 w-4 text-success" />ปรับโหลด {formatNumber(scaleFactor)} เท่า ให้พลังงานต่อเดือนตรงกับบิลแล้ว รูปทรงการใช้ไฟรายวันยังอ้างอิงช่วงเวลาที่ระบุ</div> : null}
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
          <Button disabled={!simulation || validationIssues.length > 0 || saveStatus === "saving"} onClick={() => void saveForSolar()}>บันทึก Load Profile</Button>
          <Button disabled={!simulation || validationIssues.length > 0 || saveStatus === "saving"} onClick={() => void saveForSolar(true)}>บันทึกแล้วไปต่อ<ArrowRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

function buildHourlyChart(rows: LoadIntervalInput[], scaleFactor: number) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour: `${String(hour).padStart(2, "0")}:00`, total: 0, count: 0 }));
  for (const row of rows) {
    const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", hourCycle: "h23" }).format(new Date(row.timestamp)));
    const bucket = buckets[hour];
    if (!bucket) continue;
    bucket.total += (row.powerKw ?? 0) * scaleFactor;
    bucket.count += 1;
  }
  return buckets.map((bucket) => ({ hour: bucket.hour, loadKw: bucket.count ? bucket.total / bucket.count : 0 }));
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-xs font-medium">{label}<input className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-xs font-medium">{label}<input className="h-10 rounded-md border border-input bg-background px-3 text-sm" type="time" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
function NumberField({ label, value, onChange, min, step }: { label: string; value: number; onChange: (value: number) => void; min?: number; step?: number }) {
  return <label className="grid gap-1 text-xs font-medium">{label}<input className="h-10 rounded-md border border-input bg-background px-3 text-sm" type="number" value={value} min={min} step={step} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail?: string }) {
  return <div className="rounded-lg border border-border bg-background p-4"><div className="flex items-center gap-2 text-primary">{icon}<p className="text-xs font-medium text-muted-foreground">{label}</p></div><p className="mt-3 text-xl font-semibold">{value}</p>{detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}</div>;
}
function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
}
