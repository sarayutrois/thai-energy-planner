"use client";

import {
  ArrowRight,
  Building2,
  FileSpreadsheet,
  FileUp,
  Gauge,
  Home,
  PlayCircle,
  PlugZap,
  ReceiptText,
  Store,
  SunMedium,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildAnalysisStartHref,
  type AnalysisAudience,
  type AnalysisSource,
} from "@/lib/analysis-start";
import {
  billReportStorageKey,
  billWorkspaceStorageKey,
  type StoredBillWorkspace,
} from "@/lib/local-analysis-snapshot";
import {
  analysisGoalCopy,
  getAnalysisGoalGuidance,
  readAnalysisGoal,
  saveAnalysisGoal,
  type AnalysisGoal,
} from "@/lib/analysis-preferences";

const userTypes: Array<{
  value: AnalysisAudience;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    value: "home",
    title: "บ้านพักอาศัย",
    description:
      "เหมาะกับเจ้าของบ้านที่อยากรู้ว่าค่าไฟสูงเพราะอะไร และ Solar คุ้มไหม",
    icon: Home,
  },
  {
    value: "shop",
    title: "ร้านค้า",
    description:
      "เหมาะกับร้านที่เปิดกลางวัน มีแอร์ ตู้แช่ หรือโหลดค่อนข้างสม่ำเสมอ",
    icon: Store,
  },
  {
    value: "business",
    title: "ธุรกิจขนาดเล็ก",
    description:
      "เหมาะกับออฟฟิศ โกดัง หรือกิจการที่อยากเทียบ Normal, TOU และ Solar",
    icon: Building2,
  },
];

const goals: Array<{ value: AnalysisGoal; icon: LucideIcon }> = [
  { value: "save", icon: Zap },
  { value: "tou", icon: Gauge },
  { value: "solar", icon: SunMedium },
  { value: "understand", icon: PlugZap },
];

const dataOptions: Array<{
  value: AnalysisSource;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge: string;
}> = [
  {
    value: "interval",
    title: "มีไฟล์โหลด CSV/XLSX",
    description:
      "ใช้ข้อมูลละเอียดระดับเวลา เพื่อเทียบ TOU และ Solar ได้แม่นขึ้น",
    href: "/analysis/load-data/import",
    icon: FileUp,
    badge: "ถ้ามีไฟล์",
  },
  {
    value: "appliances",
    title: "สร้างจากเครื่องใช้ไฟฟ้า",
    description:
      "กรอกจำนวนเครื่อง กำลังไฟ และเวลาเปิดใช้งาน เพื่อให้ระบบคำนวณโหลดก่อนวิเคราะห์",
    href: "/analysis/load-data/appliances",
    icon: PlugZap,
    badge: "แนะนำ",
  },
];

const nextJourneys: Array<{
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  experimental?: boolean;
}> = [
  {
    title: "ดูภาพรวมโหลด",
    description: "สรุป kWh, peak, load factor และช่วงเวลาที่ใช้ไฟเยอะ",
    href: "/analysis/load-data/dashboard",
    icon: Gauge,
  },
  {
    title: "เทียบ Normal / TOU",
    description: "ดูว่าควรเปลี่ยนรูปแบบมิเตอร์หรือปรับเวลาใช้ไฟหรือไม่",
    href: "/analysis/scenarios",
    icon: Zap,
  },
  {
    title: "ลอง Solar",
    description: "ประเมินขนาดระบบ เงินลงทุน คืนทุน และผลประหยัดต่อปี",
    href: "/analysis/solar",
    icon: SunMedium,
  },
];

export function StartAnalysisWizard() {
  const [audience, setAudience] = useState<AnalysisAudience>("home");
  const [goal, setGoal] = useState<AnalysisGoal>("save");
  useEffect(() => {
    const storedGoal = readAnalysisGoal();
    if (storedGoal) setGoal(storedGoal);
  }, []);
  const importHref = useMemo(
    () =>
      buildAnalysisStartHref(
        "/analysis/load-data/import",
        audience,
        "interval",
      ),
    [audience],
  );
  const appliancesHref = useMemo(
    () =>
      buildAnalysisStartHref(
        "/analysis/load-data/appliances",
        audience,
        "appliances",
      ),
    [audience],
  );
  const goalPrimaryHref = appliancesHref;
  const billHref = useMemo(
    () =>
      buildAnalysisStartHref("/analysis/load-data/bills", audience, "bills"),
    [audience],
  );

  function chooseGoal(value: AnalysisGoal) {
    setGoal(value);
    saveAnalysisGoal(value);
  }

  function startDemoWorkspace() {
    const payload: StoredBillWorkspace = {
      audience,
      mode: "sample",
      rows: buildDemoBillRows(audience),
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(
      billWorkspaceStorageKey,
      JSON.stringify(payload),
    );
    window.localStorage.removeItem(billReportStorageKey);
    window.location.href = "/analysis/load-data/dashboard";
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-border/70 bg-card/55">
        <div className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-1/2 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--primary)/0.12),transparent_55%)]" />
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 md:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:py-10">
          <div className="flex flex-col justify-center gap-6">
            <div className="flex flex-wrap gap-2">
              <Badge>เริ่มวิเคราะห์</Badge>
              <Badge variant="outline">ใช้เวลาประมาณ 5–10 นาที</Badge>
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.035em] text-foreground md:text-5xl">
                เริ่มวิเคราะห์ค่าไฟแบบไม่ต้องรู้เทคนิคก่อน
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                บอกเป้าหมายและข้อมูลที่มี ระบบจะพาไปทีละขั้น
                เพื่อให้คุณเห็นคำแนะนำเรื่องค่าไฟ TOU หรือ Solar
                จากข้อมูลจริงของคุณ
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-md shadow-primary/15 transition hover:-translate-y-0.5 hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring"
                href={goalPrimaryHref}
              >
                {analysisGoalCopy[goal].nextStep}
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </a>
              <a
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-6 text-base font-semibold text-foreground transition hover:-translate-y-0.5 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                href={importHref}
              >
                อัปโหลดไฟล์โหลด
                <FileSpreadsheet aria-hidden="true" className="h-5 w-5" />
              </a>
              <button
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-6 text-base font-semibold text-foreground transition hover:-translate-y-0.5 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={startDemoWorkspace}
                type="button"
              >
                ดูตัวอย่างผลลัพธ์
                <PlayCircle aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
          </div>

          <Card className="shadow-panel">
            <CardHeader>
              <CardTitle>สถานะที่เลือกตอนนี้</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <StatusRow
                label="เป้าหมาย"
                value={analysisGoalCopy[goal].label}
              />
              <StatusRow
                label="ประเภทผู้ใช้"
                value={
                  userTypes.find((item) => item.value === audience)?.title ??
                  "บ้านพักอาศัย"
                }
              />
              <StatusRow
                label="คำแนะนำแรก"
                value={getAnalysisGoalGuidance(goal).focus}
              />
              <StatusRow
                label="ข้อมูลจะถูกส่งต่อ"
                value="ประเภทที่เลือกจะถูกส่งไปยังหน้ากรอกข้อมูล เพื่อใช้คำอธิบายและค่าเริ่มต้นที่เหมาะสม"
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-b border-border bg-muted/20">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
          <div className="mb-5">
            <p className="text-sm font-medium text-primary">ขั้นที่ 1</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal">
              เป้าหมายของคุณคืออะไร
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              เลือกเพียงข้อเดียวเพื่อให้ระบบจัดลำดับข้อมูลและคำแนะนำที่จำเป็น
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {goals.map((item) => {
              const selected = item.value === goal;
              const copy = analysisGoalCopy[item.value];
              return (
                <button
                  key={item.value}
                  aria-pressed={selected}
                  className={`rounded-lg text-left transition focus:outline-none focus:ring-2 focus:ring-ring ${selected ? "ring-2 ring-primary" : ""}`}
                  onClick={() => chooseGoal(item.value)}
                  type="button"
                >
                  <Card
                    className={`h-full transition ${selected ? "border-primary bg-primary/5" : "hover:border-primary"}`}
                  >
                    <CardContent className="flex h-full flex-col gap-3 p-5">
                      <item.icon
                        aria-hidden="true"
                        className="h-5 w-5 text-primary"
                      />
                      <div>
                        <h3 className="font-semibold">{copy.label}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {copy.description}
                        </p>
                        <p className="mt-3 border-t border-border/70 pt-3 text-xs leading-5 text-foreground">
                          ระบบจะเน้น:{" "}
                          {getAnalysisGoalGuidance(item.value).focus}
                        </p>
                      </div>
                      {selected ? (
                        <Badge variant="success" className="w-fit">
                          เลือกอยู่
                        </Badge>
                      ) : null}
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="mb-5">
          <p className="text-sm font-medium text-primary">ขั้นที่ 2</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-normal">
            เลือกประเภทอาคารหรือผู้ใช้
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {userTypes.map((item) => {
            const selected = item.value === audience;
            return (
              <button
                key={item.value}
                aria-pressed={selected}
                className={`rounded-lg text-left transition focus:outline-none focus:ring-2 focus:ring-ring ${
                  selected ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setAudience(item.value)}
                type="button"
              >
                <Card
                  className={`h-full transition ${selected ? "border-primary bg-primary/5" : "hover:border-primary"}`}
                >
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <item.icon aria-hidden="true" className="h-5 w-5" />
                      </div>
                      {selected ? (
                        <Badge variant="success">เลือกอยู่</Badge>
                      ) : null}
                    </div>
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </section>

      <section className="border-y border-border bg-card/65">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
          <div className="mb-5">
            <p className="text-sm font-medium text-primary">ขั้นที่ 3</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal">
              สร้างรูปแบบการใช้ไฟ
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              เลือกสร้างจากเครื่องใช้ไฟฟ้า หรือใช้ไฟล์โหลดที่มีอยู่
              ทั้งสองทางจะได้ Load Profile ก่อนเพิ่มบิล
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {dataOptions.map((item) => (
              <a
                key={item.value}
                href={buildAnalysisStartHref(item.href, audience, item.value)}
                className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <Card className="h-full transition hover:border-primary">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <item.icon aria-hidden="true" className="h-5 w-5" />
                      </div>
                      <Badge
                        variant={
                          item.value === "appliances" ? "success" : "outline"
                        }
                      >
                        {item.badge}
                      </Badge>
                    </div>
                    <CardTitle>{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="min-h-16 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
                      ไปหน้านี้
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="mb-5">
          <p className="text-sm font-medium text-primary">ขั้นที่ 4 · แนะนำ</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-normal">
            เพิ่มบิลเพื่อปรับความแม่นยำ
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            บิลไม่ได้ใช้สร้างช่วงเวลาโหลด
            แต่ช่วยปรับปริมาณพลังงานและค่าใช้จ่ายรายเดือนให้ใกล้ข้อมูลจริง
            คุณข้ามแล้วกลับมาเพิ่มภายหลังได้
          </p>
        </div>
        <a
          href={billHref}
          className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <Card className="transition hover:-translate-y-0.5 hover:border-primary/60">
            <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-7">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ReceiptText aria-hidden="true" className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-semibold">เพิ่มข้อมูลบิลค่าไฟ</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    ใช้บิลย้อนหลังอย่างน้อย 1 เดือน และแนะนำ 6–12
                    เดือนเพื่อเห็นฤดูกาล
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                เพิ่มบิลหลังมี Load Profile
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </a>
      </section>

      <section className="border-t border-border/70 bg-muted/20">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
          <div className="mb-5">
            <p className="text-sm font-medium text-primary">ขั้นที่ 5</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal">
              วิเคราะห์ตามเป้าหมายที่เลือก
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {nextJourneys
              .filter((item) => !item.experimental)
              .map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <Card className="h-full transition hover:border-primary">
                    <CardContent className="flex h-full flex-col gap-3 p-5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <item.icon aria-hidden="true" className="h-5 w-5" />
                      </div>
                      <div className="flex flex-1 flex-col">
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                          {item.description}
                        </p>
                        <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
                          เปิดดู
                          <ArrowRight aria-hidden="true" className="h-4 w-4" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              ))}
          </div>
        </div>
      </section>
    </>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/35 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}

function buildDemoBillRows(
  audience: AnalysisAudience,
): StoredBillWorkspace["rows"] {
  const profile = {
    home: { baseKwh: 420, baseCost: 1810, stepKwh: 38, stepCost: 170 },
    shop: { baseKwh: 980, baseCost: 4550, stepKwh: 72, stepCost: 335 },
    business: { baseKwh: 1480, baseCost: 7020, stepKwh: 95, stepCost: 460 },
  }[audience];

  return ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"].map(
    (month, index) => ({
      id: `demo-${audience}-${month}`,
      month,
      energyKwh: String(
        profile.baseKwh +
          index * profile.stepKwh +
          (index === 3 ? profile.stepKwh : 0),
      ),
      totalCostThb: String(
        profile.baseCost +
          index * profile.stepCost +
          (index === 3 ? profile.stepCost : 0),
      ),
      authority: "PEA",
      meterMode: audience === "home" ? "normal" : "tou",
    }),
  );
}
