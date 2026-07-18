"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  FileWarning,
  Gauge,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Zap,
} from "lucide-react";
import type { MonthlyBillInput } from "@thai-energy-planner/shared-types";
import { summarizeLoadProfile } from "@thai-energy-planner/calculation-engine";
import { Badge } from "@/components/ui/badge";
import {
  EnergyAction,
  EnergyMetric,
  EnergyPanel,
  EnergySectionHeading,
} from "@/components/energy-workspace";
import type { StoredBillWorkspace } from "@/lib/local-analysis-snapshot";
import {
  readStoredBillWorkspace,
  storedBillWorkspaceMatchesProject,
} from "@/lib/local-bill-workspace";
import {
  localLoadProfileMatchesProject,
  localLoadProfileChangedEvent,
  readLocalLoadProfileSnapshot,
  type LocalLoadProfileSnapshot,
} from "@/lib/local-load-profile";
import {
  activeProjectChangedEvent,
  readActiveProject,
} from "@/lib/active-project";
import { assessAnalysisDataTrust } from "@/lib/analysis-data-trust";

const EnergyLoadOverviewChart = dynamic(
  () =>
    import("@/components/energy-load-overview-chart").then(
      (module) => module.EnergyLoadOverviewChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        aria-label="กำลังโหลดกราฟการใช้ไฟ"
        className="h-[260px] animate-pulse rounded-2xl bg-background/60 md:h-[300px]"
      />
    ),
  },
);

const audienceSegment: Record<
  StoredBillWorkspace["audience"],
  MonthlyBillInput["customerSegment"]
> = {
  home: "residential",
  shop: "small_business",
  business: "medium_business",
};

export function EnergyOverviewDashboard() {
  const [profile, setProfile] = useState<LocalLoadProfileSnapshot | null>(null);
  const [bills, setBills] = useState<StoredBillWorkspace | null>(null);

  useEffect(() => {
    const refresh = () => {
      try {
        const projectId = readActiveProject(window.localStorage)?.id;
        const localProfile = readLocalLoadProfileSnapshot();
        const localBills = readStoredBillWorkspace();
        setProfile(
          localLoadProfileMatchesProject(localProfile, projectId)
            ? localProfile
            : null,
        );
        setBills(
          storedBillWorkspaceMatchesProject(localBills, projectId)
            ? localBills
            : null,
        );
      } catch {
        setProfile(null);
        setBills(null);
      }
    };
    refresh();
    window.addEventListener(localLoadProfileChangedEvent, refresh);
    window.addEventListener(activeProjectChangedEvent, refresh);
    return () => {
      window.removeEventListener(localLoadProfileChangedEvent, refresh);
      window.removeEventListener(activeProjectChangedEvent, refresh);
    };
  }, []);

  const load = useMemo(
    () =>
      profile?.canonicalProfile
        ? summarizeLoadProfile(
            profile.canonicalProfile.intervals.map((row) => ({
              timestamp: row.timestamp,
              energyKwh: row.energyKwh,
              powerKw: row.averagePowerKw,
            })),
          )
        : null,
    [profile],
  );
  const billInputs = useMemo<MonthlyBillInput[]>(
    () =>
      bills
        ? bills.rows
            .map((row) => ({
              month: row.month,
              energyKwh: parseNumber(row.energyKwh),
              totalCostThb: parseNumber(row.totalCostThb),
              authority: row.authority,
              meterMode: row.meterMode,
              customerSegment: audienceSegment[bills.audience],
            }))
            .filter(
              (row) =>
                /^\d{4}-(0[1-9]|1[0-2])$/.test(row.month) &&
                Number.isFinite(row.energyKwh) &&
                row.energyKwh > 0 &&
                Number.isFinite(row.totalCostThb) &&
                row.totalCostThb > 0,
            )
        : [],
    [bills],
  );
  const billMonthlyKwh = billInputs.length
    ? billInputs.reduce((sum, row) => sum + row.energyKwh, 0) /
      billInputs.length
    : null;
  const billMonthlyCost = billInputs.length
    ? billInputs.reduce((sum, row) => sum + row.totalCostThb, 0) /
      billInputs.length
    : null;
  const profileMonthlyKwh = load ? load.averageDailyKwh * 30.44 : null;
  const usingSampleBills = bills?.mode === "sample";
  const trust = useMemo(
    () =>
      assessAnalysisDataTrust({ profileSnapshot: profile, bills: billInputs }),
    [billInputs, profile],
  );
  const sourceQuality = usingSampleBills
    ? "ข้อมูลตัวอย่าง"
    : profile?.canonicalProfile?.quality.level === "measured"
      ? "ข้อมูลวัดจริง"
      : profile?.canonicalProfile?.quality.level === "modeled"
        ? "รูปแบบจำลอง"
        : profile
          ? "ค่าประมาณ"
          : "ยังไม่มีข้อมูล";
  const nextStep = getNextStep({
    hasProfile: Boolean(profile),
    hasUserBills: billInputs.length > 0 && !usingSampleBills,
    trustLevel: trust.level,
  });

  return (
    <div className="mt-7 grid gap-5 xl:gap-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <EnergyMetric
          detail={
            billMonthlyKwh ? "ค่าเฉลี่ยจากบิลจริง" : "ประมาณจาก Load Profile"
          }
          icon={Zap}
          label="ใช้ไฟต่อเดือน"
          tone="load"
          value={
            billMonthlyKwh
              ? `${format(billMonthlyKwh)} kWh`
              : profileMonthlyKwh
                ? `${format(profileMonthlyKwh)} kWh*`
                : "ยังไม่มีข้อมูล"
          }
        />
        <EnergyMetric
          detail={
            billInputs.length
              ? `${billInputs.length} เดือนที่ใช้คำนวณ`
              : "เพิ่มบิลเพื่อเห็นค่าใช้จ่ายจริง"
          }
          icon={CircleDollarSign}
          label="ค่าไฟต่อเดือน"
          tone="neutral"
          value={
            billMonthlyCost ? `${format(billMonthlyCost)} บาท` : "กรุณาเพิ่มบิล"
          }
        />
        <EnergyMetric
          detail={load ? "จากรูปแบบการใช้ไฟที่เลือก" : "ต้องมี Load Profile"}
          icon={Gauge}
          label="Peak Load"
          tone="tou"
          value={load ? `${format(load.peakDemandKw)} kW` : "ยังไม่มีข้อมูล"}
        />
        <EnergyMetric
          detail={usingSampleBills ? "ใช้ดูขั้นตอนเท่านั้น" : trust.summary}
          icon={ShieldCheck}
          label="ความน่าเชื่อถือ"
          tone={trust.level === "high" ? "success" : "solar"}
          value={usingSampleBills ? "ข้อมูลทดลอง" : `${trust.score}/100`}
        />
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-12 xl:gap-6">
        <EnergyPanel className="xl:col-span-8" tone="load">
          <EnergySectionHeading
            action={<Badge variant="outline">{sourceQuality}</Badge>}
            description="รูปแบบกำลังไฟเฉลี่ยตลอด 24 ชั่วโมงจาก Load Profile ที่กำลังใช้งาน"
            eyebrow="Load profile"
            title="จังหวะการใช้ไฟของคุณ"
          />
          <div className="mt-5">
            {load ? <EnergyLoadOverviewChart summary={load} /> : <EmptyChart />}
          </div>
        </EnergyPanel>

        <EnergyPanel
          className="flex flex-col xl:col-span-4"
          tone={nextStep.tone}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background/80 text-primary shadow-sm ring-1 ring-border/60">
              <Sparkles aria-hidden="true" className="h-5 w-5" />
            </span>
            <Badge variant={nextStep.badgeVariant}>{nextStep.badge}</Badge>
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            สิ่งที่ควรทำตอนนี้
          </p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-[-0.035em]">
            {nextStep.title}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {nextStep.description}
          </p>
          <div className="mt-auto pt-6">
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel focus:outline-none focus:ring-2 focus:ring-ring"
              href={nextStep.href}
            >
              {nextStep.action}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </EnergyPanel>

        <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:col-span-8">
          <SourceCard
            actionHref="/analysis/load-data"
            actionLabel={profile ? "แก้ไข Load Profile" : "เพิ่ม Load Profile"}
            lines={
              profile
                ? [
                    `แหล่งข้อมูล: ${profile.sourceName}`,
                    `${profile.rowCount.toLocaleString("th-TH")} ช่วงข้อมูล`,
                    `อัปเดต ${formatDate(profile.updatedAt)}`,
                  ]
                : ["สร้างจากเครื่องใช้ไฟฟ้า หรือนำเข้าข้อมูลจาก Smart Meter"]
            }
            present={Boolean(profile)}
            title="Load Profile"
          />
          <SourceCard
            actionHref="/analysis/load-data/bills"
            actionLabel={
              billInputs.length ? "แก้ไขข้อมูลบิล" : "เพิ่มข้อมูลบิล"
            }
            lines={
              billInputs.length
                ? [
                    `${billInputs.length} เดือนที่ใช้คำนวณ`,
                    `เฉลี่ย ${format(billMonthlyKwh ?? 0)} kWh / ${format(billMonthlyCost ?? 0)} บาท`,
                    usingSampleBills ? "ข้อมูลตัวอย่าง" : "ข้อมูลของคุณ",
                  ]
                : ["เพิ่มอย่างน้อย 1 เดือน และแนะนำ 6–12 เดือน"]
            }
            present={billInputs.length > 0}
            title="บิลค่าไฟ"
          />
        </div>

        <EnergyPanel className="xl:col-span-4" tone="neutral">
          <EnergySectionHeading
            description="เปิดผลวิเคราะห์ต่อจากข้อมูลชุดเดียวกัน"
            eyebrow="Analyze"
            title="ทางเลือกของคุณ"
          />
          <div className="mt-5 grid gap-3">
            <EnergyAction
              description="เทียบมิเตอร์ปกติกับ TOU"
              href="/analysis/scenarios"
              icon={BarChart3}
              label="ค่าไฟและ TOU"
              tone="tou"
            />
            <EnergyAction
              description="ดูขนาดระบบ งบ และคืนทุน"
              href="/analysis/solar"
              icon={SunMedium}
              label="ประเมิน Solar"
              tone="solar"
            />
          </div>
        </EnergyPanel>
      </div>

      {profileMonthlyKwh && !billMonthlyKwh ? (
        <p className="text-xs text-muted-foreground">
          * ค่าประมาณจาก Load Profile ที่ผู้ใช้สร้าง ยังไม่ได้ปรับเทียบกับบิล
        </p>
      ) : null}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-background/55 p-6 text-center md:min-h-[300px]">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <BarChart3 aria-hidden="true" className="h-6 w-6" />
      </span>
      <h3 className="mt-4 font-semibold">ยังไม่มีกราฟการใช้ไฟ</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        สร้างรูปแบบการใช้ไฟจากเครื่องใช้ไฟฟ้า
        หรือนำเข้าไฟล์จากมิเตอร์เพื่อดูช่วงที่ใช้ไฟสูงสุด
      </p>
      <Link
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        href="/analysis/load-data"
      >
        เพิ่ม Load Profile <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </div>
  );
}

function SourceCard({
  title,
  present,
  lines,
  actionHref,
  actionLabel,
}: {
  title: string;
  present: boolean;
  lines: string[];
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <EnergyPanel className="h-full" tone={present ? "success" : "neutral"}>
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/80 text-primary ring-1 ring-border/60">
          {present ? (
            <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-success" />
          ) : (
            <FileWarning aria-hidden="true" className="h-5 w-5 text-warning" />
          )}
        </span>
        <Badge variant={present ? "success" : "outline"}>
          {present ? "พร้อม" : "ควรเพิ่ม"}
        </Badge>
      </div>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <div className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <Link
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        href={actionHref}
      >
        {actionLabel} <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </EnergyPanel>
  );
}

function getNextStep(input: {
  hasProfile: boolean;
  hasUserBills: boolean;
  trustLevel: "low" | "medium" | "high";
}) {
  if (!input.hasProfile) {
    return {
      title: "สร้างรูปแบบการใช้ไฟก่อน",
      description:
        "ระบบต้องรู้ว่าคุณใช้ไฟช่วงเวลาใด จึงจะเปรียบเทียบ TOU และประเมินขนาด Solar ได้",
      href: "/analysis/load-data",
      action: "สร้าง Load Profile",
      badge: "เริ่มที่นี่",
      badgeVariant: "information" as const,
      tone: "load" as const,
    };
  }
  if (!input.hasUserBills) {
    return {
      title: "เพิ่มบิลจริงเพื่อยืนยันปริมาณไฟ",
      description:
        "Load Profile พร้อมแล้ว บิลย้อนหลังจะช่วยปรับปริมาณพลังงานและเงินประหยัดให้ใกล้เคียงสถานที่จริง",
      href: "/analysis/load-data/bills",
      action: "เพิ่มข้อมูลบิล",
      badge: "เพิ่มความแม่นยำ",
      badgeVariant: "warning" as const,
      tone: "solar" as const,
    };
  }
  if (input.trustLevel === "low") {
    return {
      title: "ตรวจข้อมูลก่อนตัดสินใจลงทุน",
      description:
        "ข้อมูลพร้อมคำนวณเบื้องต้น แต่ควรแก้ประเด็นความน่าเชื่อถือที่แจ้งด้านล่างก่อนยืนยันขนาดระบบหรือเงินลงทุน",
      href: "/analysis/load-data/dashboard#data-trust",
      action: "ตรวจความน่าเชื่อถือ",
      badge: "ควรตรวจเพิ่ม",
      badgeVariant: "warning" as const,
      tone: "solar" as const,
    };
  }
  return {
    title: "ข้อมูลพร้อมเปรียบเทียบทางเลือก",
    description:
      "เริ่มจากดูว่า TOU เหมาะกับช่วงเวลาใช้ไฟของคุณหรือไม่ แล้วนำผลไปประเมิน Solar ต่อในข้อมูลชุดเดียวกัน",
    href: "/analysis/scenarios",
    action: "เปรียบเทียบค่าไฟและ TOU",
    badge: input.trustLevel === "high" ? "พร้อมตัดสินใจ" : "พร้อมวิเคราะห์",
    badgeVariant:
      input.trustLevel === "high"
        ? ("success" as const)
        : ("information" as const),
    tone: input.trustLevel === "high" ? ("success" as const) : ("tou" as const),
  };
}

function parseNumber(value: string) {
  return Number(value.replace(/,/g, "").trim());
}

function format(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("th-TH-u-ca-gregory", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "ไม่ทราบเวลา";
}
