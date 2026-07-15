"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, History, RefreshCw } from "lucide-react";
import {
  createScenarioInputFromCanonicalLoadProfile,
  runScenarioComparison,
  type ScenarioComparisonResult,
} from "@thai-energy-planner/calculation-engine";
import { getOfficialThaiTariffPair } from "@thai-energy-planner/tariff-engine";
import type {
  Authority,
  CanonicalLoadProfile,
} from "@thai-energy-planner/shared-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  hydrateLocalLoadProfileSnapshot,
  isSampleLocalLoadProfile,
  formatLocalLoadProfileLabel,
  listDistinctLocalLoadProfileSnapshots,
  readLocalLoadProfileSnapshot,
  selectLocalLoadProfileSnapshot,
  type LocalLoadProfileSnapshot,
} from "@/lib/local-load-profile";
import { authenticatedFetch } from "@/lib/auth-fetch";
import { ScenarioView } from "./scenario-view";
import { LocalBillResultContext } from "@/components/local-bill-result-context";
import { readLocalBillReportSnapshot } from "@/lib/local-bill-report";
import type { LocalAnalysisReportDraft } from "@/lib/local-analysis-snapshot";

export function CanonicalScenarioPanel() {
  const [snapshot, setSnapshot] = useState<LocalLoadProfileSnapshot | null>(
    null,
  );
  const [profiles, setProfiles] = useState<LocalLoadProfileSnapshot[]>([]);
  const [accountProfiles, setAccountProfiles] = useState<
    Array<{ id: string; name: string; intervalCount: number }>
  >([]);
  const [authority, setAuthority] = useState<Authority>("PEA");
  const [customerSegment, setCustomerSegment] = useState<
    "residential" | "small_business"
  >("residential");
  const [showHistory, setShowHistory] = useState(false);
  const [hasBillContext, setHasBillContext] = useState(false);

  function refreshProfiles() {
    setProfiles(listDistinctLocalLoadProfileSnapshots());
    setSnapshot(readLocalLoadProfileSnapshot());
  }

  useEffect(() => {
    refreshProfiles();
    setHasBillContext(Boolean(readLocalBillReportSnapshot()));
    void authenticatedFetch("/api/load-profiles")
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{
          profiles?: Array<{ id: string; name: string; intervalCount: number }>;
        }>;
      })
      .then((payload) => setAccountProfiles(payload?.profiles ?? []))
      .catch(() => setAccountProfiles([]));
  }, []);

  const activeSnapshot = snapshot;
  const profile: CanonicalLoadProfile | null =
    activeSnapshot?.canonicalProfile ?? null;

  const result = useMemo(() => {
    if (!profile) return null;
    try {
      const monthlyEnergyKwh = profile.intervals.reduce(
        (sum, interval) => sum + interval.energyKwh,
        0,
      );
      const billDate = profile.period.startInclusive.slice(0, 10);
      const tariffs = getOfficialThaiTariffPair({
        authority,
        customerSegment,
        billDate,
        monthlyEnergyKwh,
        voltageLevel: "low_voltage",
      });
      return runScenarioComparison(
        createScenarioInputFromCanonicalLoadProfile({
          profile,
          normalTariff: tariffs.normalTariff,
          touTariff: tariffs.touTariff,
          billDate,
          meterSwitchingCostThb: 2500,
        }),
      );
    } catch (caught) {
      return {
        error:
          caught instanceof Error
            ? caught.message
            : "ไม่สามารถคำนวณผลเปรียบเทียบได้",
      };
    }
  }, [authority, customerSegment, profile]);
  const comparison = result && !("error" in result) ? result : null;
  const reportDraft =
    comparison && profile
      ? buildScenarioReportDraft(comparison, profile)
      : undefined;

  if (!profile || !activeSnapshot) {
    return (
      <Card className="mt-6 border-dashed">
        <CardHeader>
          <CardTitle>ยังไม่มี Load Profile สำหรับเปรียบเทียบ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            นำเข้าไฟล์ CSV หรือสร้างโปรไฟล์จากเครื่องใช้ไฟฟ้าก่อน
            แล้วกลับมาคำนวณ Scenario ได้ทันที
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              href="/analysis/load-data/import"
            >
              นำเข้าไฟล์โหลด
            </a>
            <a
              className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium"
              href="/analysis/load-data/appliances"
            >
              สร้างจากเครื่องใช้ไฟฟ้า
            </a>
          </div>
          {accountProfiles.length > 0 ? (
            <label className="mt-4 grid max-w-xl gap-1 text-sm font-medium">
              หรือเลือก Load Profile ที่บันทึกในบัญชี
              <select
                className="h-10 rounded-md border border-input bg-background px-3"
                defaultValue=""
                onChange={(event) => {
                  const id = event.target.value;
                  if (!id) return;
                  void authenticatedFetch(`/api/load-profiles/${id}`)
                    .then(async (response) => {
                      if (!response.ok) return null;
                      return response.json() as Promise<{
                        profile?: {
                          id: string;
                          canonicalProfile?: CanonicalLoadProfile;
                        };
                      }>;
                    })
                    .then((payload) => {
                      const remote = payload?.profile;
                      if (!remote?.canonicalProfile) return;
                      const hydrated = hydrateLocalLoadProfileSnapshot(
                        remote.canonicalProfile,
                        remote.id,
                      );
                      setSnapshot(hydrated);
                      setProfiles(listDistinctLocalLoadProfileSnapshots());
                    })
                    .catch(() => undefined);
                }}
              >
                <option value="">เลือกโปรไฟล์ในบัญชี</option>
                {accountProfiles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.intervalCount.toLocaleString("th-TH")}{" "}
                    ช่วงข้อมูล
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="mt-6 grid min-w-0 max-w-full gap-6 overflow-hidden">
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>เปรียบเทียบจาก Load Profile ที่บันทึกไว้</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                ใช้ “{profile.name}” จาก{" "}
                {profileSourceLabel(profile.source.kind)}{" "}
                {isSampleLocalLoadProfile(activeSnapshot)
                  ? "ชุดนี้เป็นข้อมูลตัวอย่างสำหรับทดลองขั้นตอน"
                  : "โดยไม่มีข้อมูลตัวอย่างปะปน"}
              </p>
            </div>
            <Badge
              variant={
                isSampleLocalLoadProfile(activeSnapshot) ? "warning" : "success"
              }
            >
              {isSampleLocalLoadProfile(activeSnapshot)
                ? "Sample data"
                : "ข้อมูลพร้อมคำนวณ"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          <section className="rounded-md border border-border bg-background p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Load Profile ที่กำลังใช้
                </p>
                <p className="mt-1 font-semibold">
                  {formatLocalLoadProfileLabel(activeSnapshot)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  อัปเดต{" "}
                  {new Date(activeSnapshot.updatedAt).toLocaleString(
                    "th-TH-u-ca-gregory",
                    { dateStyle: "medium", timeStyle: "short" },
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted"
                  type="button"
                  onClick={refreshProfiles}
                >
                  <RefreshCw className="h-4 w-4" />
                  รีเฟรชข้อมูลล่าสุด
                </button>
                {profiles.length > 1 ? (
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted"
                    type="button"
                    onClick={() => setShowHistory((visible) => !visible)}
                  >
                    <History className="h-4 w-4" />
                    {showHistory ? "ซ่อนประวัติ" : "ดูประวัติ"}
                  </button>
                ) : null}
              </div>
            </div>
            {showHistory ? (
              <div className="mt-4 grid gap-2 border-t border-border pt-4">
                {profiles.map((item) => (
                  <button
                    key={item.id}
                    className={`flex items-center justify-between gap-3 rounded-md border p-3 text-left text-sm hover:bg-muted ${item.id === activeSnapshot.id ? "border-primary bg-primary/5" : "border-border"}`}
                    type="button"
                    onClick={() => {
                      const selected = selectLocalLoadProfileSnapshot(item.id);
                      setSnapshot(selected);
                      setShowHistory(false);
                      refreshProfiles();
                    }}
                  >
                    <span>
                      <span className="block font-medium">
                        {formatLocalLoadProfileLabel(item)}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        อัปเดต{" "}
                        {new Date(item.updatedAt).toLocaleString(
                          "th-TH-u-ca-gregory",
                          { dateStyle: "medium", timeStyle: "short" },
                        )}
                      </span>
                    </span>
                    {item.id === activeSnapshot.id ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </section>
          <div className="flex flex-wrap gap-3">
            <label className="grid gap-1 text-sm font-medium">
              การไฟฟ้า
              <select
                className="h-10 rounded-md border border-input bg-background px-3"
                value={authority}
                onChange={(event) =>
                  setAuthority(event.target.value as Authority)
                }
              >
                <option value="PEA">PEA</option>
                <option value="MEA">MEA</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              ประเภทผู้ใช้
              <select
                className="h-10 rounded-md border border-input bg-background px-3"
                value={customerSegment}
                onChange={(event) =>
                  setCustomerSegment(
                    event.target.value as "residential" | "small_business",
                  )
                }
              >
                <option value="residential">บ้านพักอาศัย</option>
                <option value="small_business">ธุรกิจขนาดเล็ก</option>
              </select>
            </label>
          </div>
        </CardContent>
      </Card>
      {result && "error" in result ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : null}
      {result && !("error" in result) ? (
        <ScenarioView comparison={result} />
      ) : null}
      <LocalBillResultContext
        enabled={Boolean(reportDraft && hasBillContext)}
        moduleName="Normal / TOU"
        reportDraft={reportDraft}
      />
    </section>
  );
}

function buildScenarioReportDraft(
  result: ScenarioComparisonResult,
  profile: CanonicalLoadProfile,
): LocalAnalysisReportDraft {
  const best = result.bestScenario;
  return {
    module: "scenario",
    moduleLabel: "Normal / TOU",
    title: "รายงานเปรียบเทียบค่าไฟ Normal / TOU",
    summary: `ผลเปรียบเทียบจาก ${profile.name} พบว่าแผนที่เหมาะสมที่สุดในข้อมูลชุดนี้คือ ${best.name}`,
    metrics: [
      {
        label: "ค่าไฟฐานต่อเดือน",
        value: `${formatNumber(result.baseline.monthlyEstimatedBill)} บาท/เดือน`,
      },
      {
        label: "ค่าไฟแผนที่เหมาะสม",
        value: `${formatNumber(best.monthlyEstimatedBill)} บาท/เดือน`,
      },
      {
        label: "ประหยัดโดยประมาณ",
        value: `${formatNumber(best.savingsAnnual)} บาท/ปี`,
      },
    ],
    assumptions: [
      { label: "Load Profile", value: profile.name },
      {
        label: "จำนวนช่วงข้อมูล",
        value: profile.intervals.length.toLocaleString("th-TH"),
      },
      { label: "อัตราค่าไฟ", value: best.calculationTrace.tariffVersionLabel },
    ],
    resultRows: [result.baseline, ...result.scenarios].map((row) => ({
      plan: row.name,
      monthlyBillThb: roundReportNumber(row.monthlyEstimatedBill),
      annualBillThb: roundReportNumber(row.annualEstimatedBill),
      annualSavingsThb: roundReportNumber(row.savingsAnnual),
      peakKwh: roundReportNumber(row.peakKwh),
      offPeakKwh: roundReportNumber(row.offPeakKwh),
    })),
    recommendations: result.recommendations.map((item) => ({
      title: item.title,
      description: item.explanation,
      nextAction: item.nextAction,
    })),
    references: [
      {
        label: "รุ่นอัตราค่าไฟที่ใช้",
        value: best.calculationTrace.tariffVersionLabel,
      },
    ],
  };
}

function profileSourceLabel(kind: string) {
  if (kind === "meter") return "ข้อมูลมิเตอร์";
  if (kind === "appliance") return "รายการเครื่องใช้ไฟฟ้า";
  if (kind === "csv") return "ไฟล์ที่นำเข้า";
  return "ข้อมูลที่ผู้ใช้บันทึก";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function roundReportNumber(value: number) {
  return Number(value.toFixed(2));
}
