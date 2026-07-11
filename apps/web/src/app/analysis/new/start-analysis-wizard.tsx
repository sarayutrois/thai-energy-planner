"use client";

import {
  ArrowRight,
  BatteryCharging,
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
import { useMemo, useState } from "react";
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
      "เหมาะกับเจ้าของบ้านที่อยากรู้ว่าค่าไฟสูงเพราะอะไร และ Solar/EV คุ้มไหม",
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

const dataOptions: Array<{
  value: AnalysisSource;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge: string;
}> = [
  {
    value: "bills",
    title: "มีบิลค่าไฟ",
    description:
      "เริ่มง่ายที่สุด กรอกบิลย้อนหลังเพื่อดูค่าไฟเฉลี่ยและแนวโน้มเบื้องต้น",
    href: "/analysis/load-data/bills",
    icon: ReceiptText,
    badge: "ข้อมูลจากบิล",
  },
  {
    value: "interval",
    title: "มีไฟล์โหลด CSV/XLSX",
    description:
      "ใช้ข้อมูลละเอียดระดับเวลา เพื่อเทียบ TOU, Solar, Battery และ EV ได้แม่นขึ้น",
    href: "/analysis/load-data/import",
    icon: FileUp,
    badge: "ละเอียด",
  },
  {
    value: "appliances",
    title: "สร้างโหลดจากเครื่องใช้ไฟฟ้า",
    description:
      "กรอกจำนวนเครื่อง กำลังไฟ และเวลาเปิดใช้งาน เพื่อให้ระบบคำนวณโหลดก่อนวิเคราะห์",
    href: "/analysis/load-data/appliances",
    icon: PlugZap,
    badge: "แนะนำ",
  },
];

const orderedDataOptions = [
  ...dataOptions.filter((item) => item.value === "appliances"),
  ...dataOptions.filter((item) => item.value === "bills"),
  ...dataOptions.filter((item) => item.value === "interval"),
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
  {
    title: "ลอง Battery / EV",
    description: "ดูผลของแบตเตอรี่และการชาร์จรถไฟฟ้าต่อค่าไฟ",
    href: "/analysis/battery",
    icon: BatteryCharging,
    experimental: true,
  },
];

export function StartAnalysisWizard() {
  const [audience, setAudience] = useState<AnalysisAudience>("home");
  const primaryHref = useMemo(
    () =>
      buildAnalysisStartHref(
        "/analysis/load-data/appliances",
        audience,
        "appliances",
      ),
    [audience],
  );
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

  function startDemoWorkspace() {
    const payload: StoredBillWorkspace = {
      audience,
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
      <section className="border-b border-border bg-white/72">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 md:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:py-10">
          <div className="flex flex-col justify-center gap-6">
            <div className="flex flex-wrap gap-2">
              <Badge>Start Analysis</Badge>
              <Badge variant="outline">ใช้งานแบบทีละขั้น</Badge>
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-normal text-foreground md:text-4xl">
                เริ่มวิเคราะห์ค่าไฟแบบไม่ต้องรู้เทคนิคก่อน
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                เลือกว่าคุณเป็นผู้ใช้แบบไหน มีข้อมูลอะไรอยู่
                แล้วระบบจะพาไปหน้าที่เหมาะที่สุด
                เพื่อเริ่มจากค่าไฟปัจจุบันก่อนต่อยอดไป Normal/TOU, Solar,
                Battery และ EV
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-base font-medium text-primary-foreground transition hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring"
                href={primaryHref}
              >
                สร้าง Load Profile
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </a>
              <a
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-card px-5 text-base font-medium text-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                href={importHref}
              >
                อัปโหลดไฟล์โหลด
                <FileSpreadsheet aria-hidden="true" className="h-5 w-5" />
              </a>
              <a
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-primary/35 bg-primary/5 px-5 text-base font-medium text-foreground transition hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-ring"
                href={appliancesHref}
              >
                สร้างโหลดจากเครื่องใช้ไฟฟ้า
                <PlugZap aria-hidden="true" className="h-5 w-5 text-primary" />
              </a>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-card px-5 text-base font-medium text-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={startDemoWorkspace}
                type="button"
              >
                ใช้ค่าประมาณเริ่มต้น
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
                label="ประเภทผู้ใช้"
                value={
                  userTypes.find((item) => item.value === audience)?.title ??
                  "บ้านพักอาศัย"
                }
              />
              <StatusRow
                label="คำแนะนำแรก"
                value="เริ่มจากข้อมูลที่มีอยู่จริงก่อน แล้วค่อยทดลอง scenario"
              />
              <StatusRow
                label="ข้อมูลจะถูกส่งต่อ"
                value="ลิงก์ถัดไปจะติด audience/source เพื่อให้หน้าปลายทางแนะนำต่อได้"
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="mb-5">
          <p className="text-sm font-medium text-primary">Step 1</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-normal">
            เลือกประเภทผู้ใช้
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {userTypes.map((item) => {
            const selected = item.value === audience;
            return (
              <button
                key={item.value}
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

      <section className="border-y border-border bg-white/78">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
          <div className="mb-5">
            <p className="text-sm font-medium text-primary">Step 2</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal">
              เลือกข้อมูลที่มีตอนนี้
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {orderedDataOptions.map((item) => (
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
                        variant={item.value === "appliances" ? "success" : "outline"}
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
          <p className="text-sm font-medium text-primary">Step 3</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-normal">
            ต่อยอดหลังมีข้อมูลแล้ว
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
