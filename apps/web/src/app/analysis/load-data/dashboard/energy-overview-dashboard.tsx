"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, FileWarning, ReceiptText, SunMedium, Zap } from "lucide-react";
import { summarizeLoadProfile } from "@thai-energy-planner/calculation-engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { billWorkspaceStorageKey, type StoredBillWorkspace } from "@/lib/local-analysis-snapshot";
import { readLocalLoadProfileSnapshot, type LocalLoadProfileSnapshot } from "@/lib/local-load-profile";

export function EnergyOverviewDashboard() {
  const [profile, setProfile] = useState<LocalLoadProfileSnapshot | null>(null);
  const [bills, setBills] = useState<StoredBillWorkspace | null>(null);
  useEffect(() => { try { setProfile(readLocalLoadProfileSnapshot()); const raw = window.localStorage.getItem(billWorkspaceStorageKey); const parsed = raw ? JSON.parse(raw) as StoredBillWorkspace : null; setBills(parsed?.mode === "user" ? parsed : null); } catch { setProfile(null); setBills(null); } }, []);
  const load = useMemo(() => profile?.canonicalProfile ? summarizeLoadProfile(profile.canonicalProfile.intervals.map((row) => ({ timestamp: row.timestamp, energyKwh: row.energyKwh, powerKw: row.averagePowerKw }))) : null, [profile]);
  const validBills = useMemo(() => (bills?.rows ?? []).map((row) => ({ kwh: Number(row.energyKwh), cost: Number(row.totalCostThb) })).filter((row) => Number.isFinite(row.kwh) && row.kwh > 0 && Number.isFinite(row.cost) && row.cost > 0), [bills]);
  const billMonthlyKwh = validBills.length ? validBills.reduce((sum, row) => sum + row.kwh, 0) / validBills.length : null;
  const billMonthlyCost = validBills.length ? validBills.reduce((sum, row) => sum + row.cost, 0) / validBills.length : null;
  const profileMonthlyKwh = load ? load.averageDailyKwh * 30.44 : null;
  const sourceQuality = profile?.canonicalProfile?.quality.level === "measured" ? "สูง · ข้อมูลวัดจริง" : profile?.canonicalProfile?.quality.level === "modeled" ? "ปานกลาง · รูปแบบจำลอง" : profile ? "ต่ำ · ค่าประมาณ" : "ยังไม่มีข้อมูล";

  return <div className="mt-6 grid gap-5">
    <section className="rounded-xl border border-border bg-card p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h2 className="text-xl font-semibold">ภาพรวมข้อมูลการใช้ไฟ</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">ตัวเลขจากบิลจะมีความสำคัญเหนือกว่า Load Profile ที่สร้างจากรายการเครื่องใช้ไฟฟ้า</p></div><Badge variant={profile ? "success" : "outline"}>{sourceQuality}</Badge></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric icon={<Zap />} label="ใช้ไฟต่อเดือน" value={billMonthlyKwh ? `${format(billMonthlyKwh)} kWh` : profileMonthlyKwh ? `${format(profileMonthlyKwh)} kWh*` : "ยังไม่มีข้อมูล"} /><Metric icon={<ReceiptText />} label="ค่าไฟต่อเดือน" value={billMonthlyCost ? `${format(billMonthlyCost)} บาท` : "กรุณาเพิ่มบิล"} /><Metric icon={<BarChart3 />} label="Peak Load" value={load ? `${format(load.peakDemandKw)} kW` : "ยังไม่มีข้อมูล"} /><Metric icon={<SunMedium />} label="พร้อมวิเคราะห์ Solar" value={profile ? "พร้อม" : "ต้องมี Load Profile"} /></div>
      {profileMonthlyKwh && !billMonthlyKwh ? <p className="mt-4 text-xs text-muted-foreground">* ค่าประมาณจาก Load Profile ที่ผู้ใช้สร้าง ยังไม่ได้ปรับเทียบกับบิล</p> : null}
    </section>
    <div className="grid gap-5 lg:grid-cols-2"><SourceCard title="ข้อมูลจาก Load Profile" present={Boolean(profile)} lines={profile ? [`แหล่งข้อมูล: ${profile.sourceName}`, `จำนวนช่วงข้อมูล: ${profile.rowCount.toLocaleString("th-TH")}`, `อัปเดต: ${new Date(profile.updatedAt).toLocaleString("th-TH-u-ca-gregory", { dateStyle: "medium", timeStyle: "short" })}`] : ["กรุณาสร้างจากเครื่องใช้ไฟฟ้าหรือนำเข้าจากมิเตอร์"]} actionHref="/analysis/load-data" actionLabel={profile ? "แก้ไข Load Profile" : "เพิ่ม Load Profile"} /><SourceCard title="ข้อมูลจากบิลค่าไฟ" present={validBills.length > 0} lines={validBills.length ? [`จำนวนบิลที่ใช้: ${validBills.length} เดือน`, `เฉลี่ย: ${format(billMonthlyKwh ?? 0)} kWh / ${format(billMonthlyCost ?? 0)} บาท ต่อเดือน`, validBills.length >= 6 ? "ความน่าเชื่อถือ: ปานกลางถึงสูง" : "ความน่าเชื่อถือ: ควรเพิ่มบิลย้อนหลังอย่างน้อย 6 เดือน"] : ["ยังไม่มีข้อมูลจากบิล จึงยังตรวจสอบความใกล้เคียงของ Load Profile ไม่ได้"]} actionHref="/analysis/load-data/bills" actionLabel={validBills.length ? "แก้ไขข้อมูลบิล" : "เพิ่มข้อมูลบิล"} /></div>
    <section className="rounded-xl border border-primary/40 bg-primary/5 p-5"><h2 className="font-semibold">ขั้นตอนถัดไป</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">เมื่อข้อมูลสำคัญครบ ระบบจะใช้ Load Profile ที่เลือกคำนวณ Solar โดยแสดงสมมติฐาน ราคาอ้างอิง และข้อจำกัดก่อนตัดสินใจ</p><a className={`mt-4 inline-flex h-10 items-center rounded-md px-4 text-sm font-medium ${profile ? "bg-primary text-primary-foreground hover:bg-primary/90" : "pointer-events-none bg-muted text-muted-foreground"}`} href="/analysis/solar/results">ไปสรุป Solar</a></section>
  </div>;
}
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-lg border border-border bg-background p-4"><div className="flex items-center gap-2 text-primary">{icon}</div><p className="mt-2 text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>; }
function SourceCard({ title, present, lines, actionHref, actionLabel }: { title: string; present: boolean; lines: string[]; actionHref: string; actionLabel: string }) { return <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base">{present ? <ReceiptText className="h-5 w-5 text-primary" /> : <FileWarning className="h-5 w-5 text-warning" />}{title}</CardTitle></CardHeader><CardContent><div className="space-y-2 text-sm leading-6 text-muted-foreground">{lines.map((line) => <p key={line}>{line}</p>)}</div><a className="mt-4 inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-muted" href={actionHref}>{actionLabel}</a></CardContent></Card>; }
function format(value: number) { return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value); }
