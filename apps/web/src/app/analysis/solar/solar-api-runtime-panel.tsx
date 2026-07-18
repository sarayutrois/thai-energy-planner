"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileUp, RefreshCw, ServerCog } from "lucide-react";
import {
  canonicalLoadProfileToLoadIntervals,
  type SolarAnalysisResult,
} from "@thai-energy-planner/calculation-engine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisDataTrustCard } from "@/components/analysis-data-trust-card";
import { assessAnalysisDataTrust } from "@/lib/analysis-data-trust";
import {
  localLoadProfileMatchesProject,
  readLocalLoadProfileSnapshot,
  type LocalLoadProfileSnapshot,
} from "@/lib/local-load-profile";
import {
  readStoredBillWorkspace,
  storedBillWorkspaceMatchesProject,
} from "@/lib/local-bill-workspace";
import type { SolarAssumptionSettings } from "@/lib/solar-assumptions";
import {
  compactSolarCalculationSuccess,
  deriveSolarStatus,
  getSolarBenefitBreakdown,
  persistSolarAnalysis,
  persistSolarAssumptions,
  readStoredSolarAnalysis,
  readStoredSolarAssumptions,
  solarSettingsFingerprint,
  storedSolarAnalysisMatches,
  type SolarCalculationSuccess,
  type SolarStatus,
} from "@/lib/local-solar-analysis";
import { LocalBillResultContext } from "@/components/local-bill-result-context";
import type { LocalAnalysisReportDraft } from "@/lib/local-analysis-snapshot";
import {
  buildSolarSystemRecommendation,
  type SolarSystemRecommendation,
} from "@/lib/solar-system-recommendation";
import {
  activeProjectChangedEvent,
  readActiveProject,
  type ActiveProject,
} from "@/lib/active-project";

type SolarAnalyzeResponse =
  | SolarCalculationSuccess
  | {
      ok: false;
      error: string;
      issues?: Array<{ path: string; message: string }>;
    };

const solarApiTimeoutMs = 30_000;

export function SolarApiRuntimePanel({
  settings,
  preferInitialSettings = false,
}: {
  settings: SolarAssumptionSettings;
  preferInitialSettings?: boolean;
}) {
  const [activeSettings, setActiveSettings] = useState(settings);
  const [snapshot, setSnapshot] = useState<LocalLoadProfileSnapshot | null>(
    null,
  );
  const [calculatedResult, setCalculatedResult] =
    useState<SolarCalculationSuccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeProject, setActiveProject] = useState<ActiveProject | null>(
    null,
  );

  const runAnalysis = useCallback(
    async (profileSnapshot: LocalLoadProfileSnapshot) => {
      setIsLoading(true);
      setError(null);
      const controller = new AbortController();
      const timeoutId = window.setTimeout(
        () => controller.abort(),
        solarApiTimeoutMs,
      );
      try {
        const monthlyBills = readSavedBills(activeProject?.id);
        const billAuthority = readSavedBillAuthority(activeProject?.id);
        const response = await fetch("/api/solar/analyze", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            province: activeSettings.province,
            profile: activeSettings.profile,
            modelMode: activeSettings.modelMode,
            ...(activeSettings.latitude === undefined
              ? {}
              : { latitude: activeSettings.latitude }),
            ...(activeSettings.longitude === undefined
              ? {}
              : { longitude: activeSettings.longitude }),
            billDate:
              profileSnapshot.canonicalProfile?.period.startInclusive.slice(
                0,
                10,
              ) ?? "2026-07-01",
            voltageLevel: "low_voltage",
            customerSegment:
              activeSettings.profile === "daytime_shop"
                ? "small_business"
                : "residential",
            systemSizeKwp: activeSettings.systemSizeKwp,
            roofAreaSqm: activeSettings.roofAreaSqm,
            roofAzimuth: activeSettings.roofAzimuth,
            roofTilt: activeSettings.roofTilt,
            systemLossPercent: activeSettings.systemLossPercent,
            shadingLossPercent: activeSettings.shadingLossPercent,
            degradationPercentPerYear: activeSettings.degradationPercentPerYear,
            capexThb: activeSettings.capexThb,
            oAndMCostPerYear: activeSettings.oAndMCostPerYear,
            projectLifeYears: activeSettings.projectLifeYears,
            discountRatePercent: activeSettings.discountRatePercent,
            electricityEscalationRatePercent:
              activeSettings.electricityEscalationRatePercent,
            inverterReplacementCostThb:
              activeSettings.inverterReplacementCostThb,
            inverterReplacementYear: activeSettings.inverterReplacementYear,
            exportEnabled: activeSettings.exportEnabled,
            exportRateThbPerKwh: activeSettings.exportRateThbPerKwh,
            exportLimitKw: activeSettings.exportLimitKw,
            loadIntervals: profileSnapshot.canonicalProfile
              ? canonicalLoadProfileToLoadIntervals(
                  profileSnapshot.canonicalProfile,
                )
              : profileSnapshot.rows,
            ...(monthlyBills.length ? { monthlyBills } : {}),
            ...(billAuthority ? { authority: billAuthority } : {}),
          }),
        });
        const result = (await response.json()) as SolarAnalyzeResponse;
        if (!response.ok || !result.ok)
          throw new Error(result.ok ? "" : result.error);
        setCalculatedResult(result);
        const persisted = persistSolarAnalysis(
          window.localStorage,
          {
            profileSnapshotId: profileSnapshot.id,
            settingsFingerprint: solarSettingsFingerprint(activeSettings),
            result: compactSolarCalculationSuccess(result),
          },
          activeProject?.id,
        );
        setStorageError(
          persisted
            ? null
            : "คำนวณสำเร็จ แต่บันทึกผลในอุปกรณ์นี้ไม่ได้ กรุณาส่งออกข้อมูลสำรองก่อนปิดหน้า",
        );
      } catch (caught) {
        setCalculatedResult(null);
        setError(
          caught instanceof DOMException && caught.name === "AbortError"
            ? "การคำนวณใช้เวลานานเกินไป กรุณาลองอีกครั้ง"
            : caught instanceof Error && caught.message
              ? caught.message
              : "ไม่สามารถคำนวณ Solar ได้ในขณะนี้",
        );
      } finally {
        window.clearTimeout(timeoutId);
        setIsLoading(false);
      }
    },
    [activeProject?.id, activeSettings],
  );

  useEffect(() => {
    const restoreProjectState = () => {
      const project = readActiveProject(window.localStorage);
      const restoredSettings = preferInitialSettings
        ? settings
        : (readStoredSolarAssumptions(window.localStorage, project?.id) ??
          settings);
      const localSnapshot = readLocalLoadProfileSnapshot();
      const restoredSnapshot = localLoadProfileMatchesProject(
        localSnapshot,
        project?.id,
      )
        ? localSnapshot
        : null;
      const storedResult = readStoredSolarAnalysis(
        window.localStorage,
        project?.id,
      );
      setActiveProject(project);
      setActiveSettings(restoredSettings);
      setSnapshot(restoredSnapshot);
      setCalculatedResult(
        restoredSnapshot &&
          storedResult &&
          storedSolarAnalysisMatches(
            storedResult,
            restoredSnapshot.id,
            restoredSettings,
          )
          ? storedResult.result
          : null,
      );
      setError(null);
      setStorageError(null);
      setIsHydrated(true);
    };
    restoreProjectState();
    window.addEventListener(activeProjectChangedEvent, restoreProjectState);
    return () =>
      window.removeEventListener(
        activeProjectChangedEvent,
        restoreProjectState,
      );
  }, [preferInitialSettings, settings]);

  if (!isHydrated)
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-sm text-muted-foreground">
          กำลังตรวจข้อมูลการใช้ไฟที่บันทึกไว้…
        </CardContent>
      </Card>
    );

  const status = deriveSolarStatus({
    hasLoadProfile: Boolean(snapshot),
    isCalculating: isLoading,
    hasCalculatedResult: Boolean(calculatedResult),
    hasError: Boolean(error),
  });

  function updateBackupSettings(
    values: Partial<
      Pick<
        SolarAssumptionSettings,
        "backupRequirement" | "essentialLoadKw" | "backupHours"
      >
    >,
    confirmedFields: string[],
  ) {
    const nextSettings = {
      ...activeSettings,
      ...values,
      defaultedFields: activeSettings.defaultedFields.filter(
        (field) => !confirmedFields.includes(field),
      ),
    };
    setActiveSettings(nextSettings);
    if (
      !persistSolarAssumptions(
        window.localStorage,
        nextSettings,
        activeProject?.id,
      )
    )
      setStorageError(
        "บันทึกคำตอบเรื่องไฟสำรองในอุปกรณ์นี้ไม่ได้ กรุณาลองอีกครั้ง",
      );
    else setStorageError(null);
  }

  if (!snapshot)
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-primary" />
            {activeProject
              ? `เลือก Load Profile ของโปรเจกต์ “${activeProject.name}”`
              : "เพิ่มข้อมูลก่อนเริ่มประเมิน Solar"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm leading-6 text-muted-foreground">
          <p>
            {activeProject
              ? "Load Profile ที่อยู่ในอุปกรณ์นี้ไม่ได้ผูกกับโปรเจกต์ที่กำลังใช้ กรุณาดึงข้อมูลของโปรเจกต์มาก่อนเพื่อป้องกันการคำนวณข้ามโปรเจกต์"
              : "ระบบจะไม่สร้างผลลัพธ์จากค่าตัวอย่างให้โดยอัตโนมัติ กรุณาสร้างหรือนำเข้า Load Profile ก่อน แล้วกลับมาตรวจข้อมูลและกดเริ่มประเมินด้วยตัวเอง"}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              className="inline-flex h-10 items-center rounded-md bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/90"
              href={
                activeProject
                  ? "/analysis/load-data/dashboard"
                  : "/analysis/load-data/appliances"
              }
            >
              {activeProject ? "เลือกข้อมูลของโปรเจกต์" : "สร้าง Load Profile"}
            </a>
            <a
              className="inline-flex h-10 items-center rounded-md border border-border bg-card px-4 font-medium text-foreground hover:bg-muted"
              href="/analysis/load-data/import"
            >
              นำเข้าข้อมูลการใช้ไฟ
            </a>
          </div>
        </CardContent>
      </Card>
    );

  const savedBills = readSavedBills(activeProject?.id);
  const savedBillInputs = readSavedBillInputs(activeProject?.id);
  const hasBills = savedBills.length > 0;
  const dataTrust = assessAnalysisDataTrust({
    profileSnapshot: snapshot,
    bills: savedBillInputs,
  });
  const dataStatus = getSolarDataStatus(snapshot, hasBills);
  const systemRecommendation = calculatedResult
    ? buildSolarSystemRecommendation({
        analysis: calculatedResult.analysis,
        settings: activeSettings,
        hasCalibratedBills: Boolean(snapshot.calibration && hasBills),
        dataTrustLevel: dataTrust.level,
      })
    : undefined;
  const reportDraft = calculatedResult
    ? buildSolarRuntimeReportDraft(
        calculatedResult.analysis,
        calculatedResult.trace,
        snapshot,
        systemRecommendation!,
      )
    : undefined;

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ServerCog className="h-5 w-5 text-primary" />
              {calculatedResult
                ? "ผลการประเมิน Solar จากข้อมูลที่เลือก"
                : "ตรวจข้อมูลก่อนเริ่มประเมิน Solar"}
            </CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {calculatedResult
                ? "ผลลัพธ์นี้ใช้"
                : "ระบบพบข้อมูลที่เคยบันทึกไว้ แต่ยังไม่ได้เริ่มคำนวณ ใช้"}{" "}
              “{snapshot.sourceName}” จำนวน{" "}
              {snapshot.rowCount.toLocaleString("th-TH")} ช่วงข้อมูล · อัปเดต{" "}
              {formatDate(snapshot.updatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeProject ? (
              <Badge variant="information">โปรเจกต์ {activeProject.name}</Badge>
            ) : (
              <Badge variant="outline">วิเคราะห์ส่วนตัว</Badge>
            )}
            <Badge variant={status === "calculated" ? "success" : "outline"}>
              {solarStatusLabel(status)}
            </Badge>
            <Badge>{dataStatus.label}</Badge>
            <Badge variant="outline">
              {formatNumber(snapshot.totalKwh)} kWh
            </Badge>
            {calculatedResult ? (
              <Badge variant="success">
                อัตราค่าไฟ {calculatedResult.trace.authority}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <AnalysisDataTrustCard compact trust={dataTrust} />
        {!calculatedResult ? (
          <div className="rounded-xl border border-primary/25 bg-background p-4">
            <p className="font-semibold">ข้อมูลที่จะใช้ในการประเมินครั้งนี้</p>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric label="แหล่งข้อมูล" value={snapshot.sourceName} />
              <Metric
                label="ปริมาณการใช้ไฟในชุดข้อมูล"
                value={`${formatNumber(snapshot.totalKwh)} kWh`}
              />
              <Metric
                label="ขนาด Solar เริ่มต้น"
                value={`${formatNumber(activeSettings.systemSizeKwp)} kWp`}
              />
              <Metric
                label="เงินลงทุนตั้งต้น"
                value={`${formatNumber(activeSettings.capexThb)} บาท`}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              ตัวเลขขนาดระบบและเงินลงทุนเป็นสมมติฐานตั้งต้น
              ยังไม่ใช่คำแนะนำหรือผลการประเมิน คุณสามารถแก้ไขได้ก่อนเริ่มคำนวณ
            </p>
            <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-4">
              <p className="text-sm font-semibold">คำถามสำคัญก่อนเลือกระบบ</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                ต้องการไฟสำรองเวลาไฟดับหรือไม่ คำตอบนี้ใช้เลือกระหว่าง On-grid
                กับ Hybrid
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <label className="grid gap-1.5 text-sm font-medium">
                  <span>เป้าหมายไฟสำรอง</span>
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={activeSettings.backupRequirement}
                    onChange={(event) =>
                      updateBackupSettings(
                        {
                          backupRequirement: event.target.value as
                            "unknown" | "none" | "essential",
                        },
                        ["backupRequirement"],
                      )
                    }
                  >
                    <option value="unknown">กรุณาเลือกก่อนคำนวณ</option>
                    <option value="none">ไม่ต้องการ — เน้นลดค่าไฟ</option>
                    <option value="essential">
                      ต้องการ — สำรองอุปกรณ์จำเป็น
                    </option>
                  </select>
                </label>
                {activeSettings.backupRequirement === "essential" ? (
                  <>
                    <label className="grid gap-1.5 text-sm font-medium">
                      <span>โหลดจำเป็น (kW)</span>
                      <input
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        defaultValue={activeSettings.essentialLoadKw}
                        min="0.1"
                        step="0.1"
                        type="number"
                        onBlur={(event) => {
                          const value = Number(event.target.value);
                          if (Number.isFinite(value) && value >= 0.1)
                            updateBackupSettings({ essentialLoadKw: value }, [
                              "essentialLoadKw",
                            ]);
                        }}
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">
                      <span>สำรองนาน (ชั่วโมง)</span>
                      <input
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        defaultValue={activeSettings.backupHours}
                        min="0.5"
                        step="0.5"
                        type="number"
                        onBlur={(event) => {
                          const value = Number(event.target.value);
                          if (Number.isFinite(value) && value >= 0.5)
                            updateBackupSettings({ backupHours: value }, [
                              "backupHours",
                            ]);
                        }}
                      />
                    </label>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        {dataStatus.warning ? (
          <div className="rounded-md border border-warning bg-warning/10 p-3 text-sm leading-6 text-warning-foreground">
            ผลลัพธ์นี้เป็นการประเมินเบื้องต้น ความแม่นยำจะเพิ่มขึ้นเมื่อใช้ Load
            Profile จากมิเตอร์หรือข้อมูลรายช่วงเวลา
          </div>
        ) : null}
        {isLoading ? (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            กำลังคำนวณจากข้อมูลการใช้ไฟที่เลือก…
          </div>
        ) : null}
        {error ? (
          <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {storageError ? (
          <div className="rounded-md border border-warning bg-warning/10 p-3 text-sm leading-6 text-warning-foreground">
            {storageError}
          </div>
        ) : null}
        {calculatedResult ? (
          <>
            <RuntimeMetrics
              analysis={calculatedResult.analysis}
              trace={calculatedResult.trace}
              snapshot={snapshot}
              hasBills={hasBills}
              systemRecommendation={systemRecommendation!}
            />
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
              คำนวณเมื่อ {formatDate(calculatedResult.trace.calculatedAt)} ·
              เขตเวลา {calculatedResult.trace.timezone} · Engine{" "}
              {calculatedResult.trace.calculationEngineVersion} · Tariff{" "}
              {calculatedResult.trace.tariffVersionIds.join(", ")} · Ft{" "}
              {calculatedResult.trace.ftVersionIds.join(", ")}
            </div>
          </>
        ) : null}
        {calculatedResult?.warnings.length ? (
          <div className="rounded-md border border-warning bg-warning/10 p-3 text-sm leading-6 text-warning-foreground">
            {calculatedResult.warnings.map((warning) => (
              <p key={warning}>{solarWarningCopy(warning)}</p>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={
              isLoading || activeSettings.backupRequirement === "unknown"
            }
            onClick={() => void runAnalysis(snapshot)}
            variant={calculatedResult ? "outline" : "default"}
          >
            <RefreshCw className="h-4 w-4" />
            {isLoading
              ? "กำลังประเมิน..."
              : activeSettings.backupRequirement === "unknown"
                ? "ตอบเรื่องไฟสำรองก่อน"
                : error
                  ? "ลองคำนวณใหม่"
                  : calculatedResult
                    ? "คำนวณใหม่"
                    : "เริ่มประเมิน Solar"}
          </Button>
          <Link
            className="inline-flex h-10 items-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
            href="/analysis/load-data"
          >
            แก้ไขข้อมูลการใช้ไฟ
          </Link>
          <Link
            className="inline-flex h-10 items-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
            href="/analysis/solar/config"
          >
            ตรวจและแก้สมมติฐาน Solar
          </Link>
        </div>
        <LocalBillResultContext
          enabled={Boolean(reportDraft && hasBills)}
          moduleName="Solar"
          reportDraft={reportDraft}
        />
      </CardContent>
    </Card>
  );
}

function solarStatusLabel(status: SolarStatus) {
  const labels: Record<SolarStatus, string> = {
    missing_load_profile: "ยังไม่มี Load Profile",
    ready_to_calculate: "พร้อมเริ่มประเมิน",
    calculating: "กำลังคำนวณจริง",
    calculated: "คำนวณเสร็จแล้ว",
    error: "คำนวณไม่สำเร็จ",
  };
  return labels[status];
}

function RuntimeMetrics({
  analysis,
  trace,
  snapshot,
  hasBills,
  systemRecommendation,
}: {
  analysis: SolarAnalysisResult;
  trace: Extract<SolarAnalyzeResponse, { ok: true }>["trace"];
  snapshot: LocalLoadProfileSnapshot;
  hasBills: boolean;
  systemRecommendation: SolarSystemRecommendation;
}) {
  const comparison = analysis.billComparison;
  const benefitBreakdown = getSolarBenefitBreakdown(comparison);
  const recommendationTone =
    systemRecommendation.verdict === "recommend"
      ? "border-success bg-success/10"
      : systemRecommendation.verdict === "not_recommended"
        ? "border-warning bg-warning/10"
        : "border-primary/40 bg-primary/5";
  return (
    <>
      <section className={`rounded-xl border p-5 ${recommendationTone}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              คำตอบ Solar สำหรับคุณ
            </p>
            <h3 className="mt-1 text-xl font-semibold">
              {systemRecommendation.headline}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={
                systemRecommendation.verdict === "recommend"
                  ? "success"
                  : systemRecommendation.verdict === "not_recommended"
                    ? "warning"
                    : "outline"
              }
            >
              {systemRecommendation.verdictLabel}
            </Badge>
            <Badge variant="outline">
              {systemRecommendation.confidenceLabel}
            </Badge>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-4">
          <Info
            label="ระบบที่แนะนำ"
            value={systemRecommendation.systemTypeLabel}
          />
          <Info
            label="ขนาด Solar"
            value={
              systemRecommendation.systemSizeKwp === null
                ? "ยังไม่แนะนำขนาด"
                : `${formatNumber(systemRecommendation.systemSizeKwp)} kWp`
            }
          />
          <Info
            label="จำนวนแผงโดยประมาณ"
            value={
              systemRecommendation.panelCount === null
                ? "—"
                : `${systemRecommendation.panelCount.toLocaleString("th-TH")} แผง × ${formatNumber(systemRecommendation.panelWatt ?? 0)} W`
            }
          />
          <Info
            label="Inverter โดยประมาณ"
            value={
              systemRecommendation.inverterSizeKw === null
                ? "—"
                : `${formatNumber(systemRecommendation.inverterSizeKw)} kW`
            }
          />
          <Info label="แบตเตอรี่" value={systemRecommendation.batteryLabel} />
          <Info
            label="งบติดตั้งเบื้องต้น"
            value={formatRecommendationBudget(systemRecommendation)}
          />
          <Info
            label="ระยะคืนทุน"
            value={systemRecommendation.combinedPaybackLabel}
          />
          <Info
            label="ข้อมูลที่ใช้ตัดสินใจ"
            value={
              snapshot.calibration
                ? "Load ที่ปรับเทียบกับบิลแล้ว"
                : hasBills
                  ? "มีบิล แต่ยังไม่ยืนยันปรับเทียบ"
                  : "Load Profile ยังไม่มีบิลยืนยัน"
            }
          />
        </div>
        {systemRecommendation.systemType !== "not_recommended" ? (
          <SolarSystemFlow recommendation={systemRecommendation} />
        ) : null}
        <div className="mt-5 grid gap-4 border-t border-border/70 pt-4 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold">เหตุผลที่แนะนำ</p>
            <ul className="mt-2 grid gap-1 text-sm leading-6 text-muted-foreground">
              {systemRecommendation.reasons.map((reason) => (
                <li key={reason}>• {reason}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">ข้อจำกัดของข้อมูล</p>
            <ul className="mt-2 grid gap-1 text-sm leading-6 text-muted-foreground">
              {systemRecommendation.limitations.map((limitation) => (
                <li key={limitation}>• {limitation}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 rounded-md bg-background/70 p-3 text-sm font-medium leading-6">
          ขั้นต่อไป: {systemRecommendation.nextAction}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-primary/92"
            href="/analysis/ecosystem"
          >
            รวมเป็นแผนพลังงาน
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background/80 px-4 text-sm font-semibold transition hover:bg-muted"
            href="/analysis/battery"
          >
            ประเมิน Battery (ทางเลือก)
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background/80 px-4 text-sm font-semibold transition hover:bg-muted"
            href="/analysis/ev"
          >
            วางแผน EV (ทางเลือก)
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background/80 px-4 text-sm font-semibold transition hover:bg-muted"
            href={
              hasBills ? "#save-analysis-report" : "/analysis/load-data/bills"
            }
          >
            {hasBills ? "บันทึกผล Solar" : "เพิ่มบิลเพื่อทำรายงาน"}
          </Link>
        </div>
      </section>
      <section className="rounded-md border border-border bg-background p-4 text-sm">
        <h3 className="font-semibold">เปรียบเทียบก่อนและหลังติดตั้ง Solar</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Info
            label="ค่าไฟก่อนติดตั้ง"
            value={`${formatNumber(comparison.bestWithoutSolar.monthlyBillThb)} บาท/เดือน`}
          />
          <Info
            label="ค่าไฟหลังติดตั้ง"
            value={`${formatNumber(comparison.bestWithSolar.monthlyBillThb)} บาท/เดือน`}
          />
          <Info
            label="ประหยัดค่าไฟรายปี"
            value={`${formatNumber(benefitBreakdown.billSavings)} บาท/ปี`}
          />
          <Info
            label="รายได้จากการส่งออกไฟรายปี"
            value={`${formatNumber(benefitBreakdown.exportRevenue)} บาท/ปี`}
          />
        </div>
      </section>
      <details className="group rounded-md border border-border bg-background text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold">
          <span>ดูตัวเลขและที่มาข้อมูลเพิ่มเติม</span>
          <span className="text-xs text-muted-foreground group-open:hidden">
            เปิดรายละเอียด
          </span>
          <span className="hidden text-xs text-muted-foreground group-open:inline">
            ซ่อนรายละเอียด
          </span>
        </summary>
        <div className="grid gap-4 border-t border-border p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <Metric
              label="ใช้ไฟโดยประมาณ"
              value={`${formatNumber(comparison.bestWithoutSolar.monthlyEnergyKwh)} kWh/เดือน`}
            />
            <Metric
              label="ค่าไฟหลัง Solar"
              value={`${formatNumber(comparison.bestWithSolar.monthlyBillThb)} บาท/เดือน`}
            />
            <Metric
              label="ขนาดที่กำลังประเมิน"
              value={`${formatNumber(analysis.solarProfile.assumptionsSnapshot.systemSizeKwp)} kWp`}
            />
            <Metric
              label="ผลประโยชน์รวมโดยประมาณ"
              value={`${formatNumber(comparison.netAnnualBenefit / 12)} บาท/เดือน`}
            />
            <Metric
              label="ลดไฟจากโครงข่าย"
              value={`${formatNumber(analysis.selfConsumption.selfSufficiencyRatio * 100)}%`}
            />
            <Metric
              label="เงินลงทุนโดยประมาณ"
              value={`${formatNumber(analysis.financial.initialInvestmentThb)} บาท`}
            />
            <Metric
              label="ระยะคืนทุน"
              value={
                analysis.financial.simplePaybackYears
                  ? `${formatNumber(analysis.financial.simplePaybackYears)} ปี`
                  : "ไม่สามารถคืนทุนจากสมมติฐานนี้"
              }
            />
            <Metric
              label="Solar ที่ใช้เอง"
              value={`${formatNumber(analysis.selfConsumption.selfConsumptionRatio * 100)}%`}
            />
            <Metric
              label="ช่วงข้อมูลที่ใช้"
              value={`${trace.inputIntervalCount.toLocaleString("th-TH")} ช่วง`}
            />
          </div>
          <div>
            <h3 className="font-semibold">ที่มาข้อมูลและสมมติฐานที่ใช้</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Info
                label="ข้อมูลการใช้ไฟ"
                value={`${snapshot.sourceName} (${snapshot.canonicalProfile?.quality.level === "measured" ? "ข้อมูลวัดจริง" : snapshot.canonicalProfile?.quality.level === "modeled" ? "รูปแบบจำลอง" : "ค่าประมาณ"})`}
              />
              <Info
                label="ข้อมูลจากบิล"
                value={
                  hasBills ? "ใช้เพื่อปรับสัดส่วนรายเดือน" : "ยังไม่มีข้อมูลบิล"
                }
              />
              <Info
                label="อัตราค่าไฟ"
                value={`${trace.authority} · วันที่อ้างอิง ${trace.billDate}`}
              />
              <Info
                label="ข้อมูลแสงอาทิตย์"
                value={`${solarSourceLabel(analysis.solarProfile.source.authority)} · ${sourceStatus(analysis.solarProfile.source.status)}${analysis.solarProfile.source.verifiedAt ? ` · ตรวจสอบ ${analysis.solarProfile.source.verifiedAt}` : ""}`}
              />
            </div>
          </div>
        </div>
      </details>
    </>
  );
}

function SolarSystemFlow({
  recommendation,
}: {
  recommendation: SolarSystemRecommendation;
}) {
  const nodes = [
    {
      label: "แผง Solar",
      value: `${recommendation.panelCount?.toLocaleString("th-TH") ?? "—"} แผง · ${formatNumber(recommendation.systemSizeKwp ?? 0)} kWp`,
    },
    {
      label: "Inverter",
      value: `${formatNumber(recommendation.inverterSizeKw ?? 0)} kW`,
    },
    { label: "โหลดภายใน", value: "ใช้ไฟ Solar ก่อน" },
    { label: "โครงข่ายไฟฟ้า", value: "รับหรือส่งไฟส่วนเกิน" },
  ];

  return (
    <div
      aria-label="ภาพการทำงานของระบบ Solar ที่แนะนำ"
      className="mt-5 rounded-xl border border-border/70 bg-background/75 p-4"
    >
      <p className="text-sm font-semibold">
        ภาพรวมระบบ {recommendation.systemTypeLabel.split(" — ")[0]}
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-stretch">
        {nodes.map((node, index) => (
          <div className="contents" key={node.label}>
            <div className="rounded-lg border border-primary/20 bg-primary/[0.06] p-3 text-center">
              <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {index + 1}
              </span>
              <p className="mt-2 text-sm font-semibold">{node.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {node.value}
              </p>
            </div>
            {index < nodes.length - 1 ? (
              <ArrowRight
                aria-hidden="true"
                className="mx-auto h-4 w-4 rotate-90 self-center text-primary md:rotate-0"
              />
            ) : null}
          </div>
        ))}
      </div>
      {recommendation.batteryRecommended ? (
        <div className="mt-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <span className="font-semibold">แบตเตอรี่สำรอง:</span>{" "}
          {formatNumber(recommendation.batteryUsableKwh ?? 0)} kWh เชื่อมกับ
          Hybrid Inverter เพื่อจ่ายไฟให้วงจรจำเป็นเมื่อไฟดับ
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          ระบบนี้ไม่ใส่แบตเตอรี่ เพราะเป้าหมายหลักคือประหยัดค่าไฟและคืนทุนเร็ว
          เมื่อไฟดับ On-grid จะหยุดจ่ายไฟเพื่อความปลอดภัย
        </p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "ไม่ทราบ"
    : date.toLocaleString("th-TH-u-ca-gregory", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}
function getSolarDataStatus(
  snapshot: LocalLoadProfileSnapshot,
  hasBills: boolean,
) {
  if (
    snapshot.isSample ||
    snapshot.canonicalProfile?.source.kind === "demo" ||
    snapshot.sourceName.includes("ตัวอย่าง")
  )
    return { label: "ข้อมูลตัวอย่าง", warning: true };
  if (snapshot.canonicalProfile?.quality.level === "measured")
    return { label: "ข้อมูลจริงจาก Load Profile", warning: false };
  if (hasBills) return { label: "ข้อมูลประมาณการจากบิล", warning: true };
  return { label: "ข้อมูลยังไม่เพียงพอ", warning: true };
}
function readSavedBills(projectId?: string) {
  const workspace = readStoredBillWorkspace();
  if (
    workspace?.mode !== "user" ||
    !storedBillWorkspaceMatchesProject(workspace, projectId)
  )
    return [];
  return workspace.rows
    .map((row) => ({ month: row.month, billThb: Number(row.totalCostThb) }))
    .filter(
      (row): row is { month: string; billThb: number } =>
        /^\d{4}-(0[1-9]|1[0-2])$/.test(row.month) &&
        Number.isFinite(row.billThb) &&
        row.billThb > 0,
    )
    .slice(0, 12);
}
function readSavedBillInputs(projectId?: string) {
  const workspace = readStoredBillWorkspace();
  if (
    workspace?.mode !== "user" ||
    !storedBillWorkspaceMatchesProject(workspace, projectId)
  )
    return [];
  return workspace.rows
    .map((row) => ({
      month: row.month,
      energyKwh: Number(row.energyKwh),
      totalCostThb: Number(row.totalCostThb),
      authority: row.authority,
      meterMode: row.meterMode,
    }))
    .filter(
      (row) =>
        /^\d{4}-(0[1-9]|1[0-2])$/.test(row.month) &&
        Number.isFinite(row.energyKwh) &&
        row.energyKwh >= 0 &&
        Number.isFinite(row.totalCostThb) &&
        row.totalCostThb >= 0,
    )
    .slice(0, 12);
}
function readSavedBillAuthority(projectId?: string): "PEA" | "MEA" | undefined {
  const workspace = readStoredBillWorkspace();
  if (
    workspace?.mode !== "user" ||
    !storedBillWorkspaceMatchesProject(workspace, projectId)
  )
    return undefined;
  const authorities = workspace.rows.map((row) => row.authority);
  return authorities.length > 0 &&
    authorities.every((authority) => authority === authorities[0])
    ? authorities[0]
    : undefined;
}

function sourceStatus(status: "demo" | "draft" | "verified" | "published") {
  return status === "published" || status === "verified"
    ? "ข้อมูลอ้างอิง"
    : status === "draft"
      ? "ข้อมูลรอตรวจสอบ"
      : "ค่ามาตรฐานสำหรับประมาณการ";
}

function solarSourceLabel(authority: string) {
  return authority.toLowerCase().includes("demo")
    ? "ข้อมูลแสงอาทิตย์มาตรฐานของระบบ"
    : authority;
}

function solarWarningCopy(warning: string) {
  if (warning.includes("PVGIS site data was unavailable"))
    return "ไม่สามารถใช้ข้อมูลแสงอาทิตย์ตามตำแหน่งที่ระบุได้ จึงใช้ค่าประมาณแสงอาทิตย์มาตรฐานแทน";
  if (warning.includes("Solar yield is using"))
    return "ขณะนี้ใช้ค่าประมาณแสงอาทิตย์มาตรฐาน ความแม่นยำจะเพิ่มขึ้นเมื่อระบุตำแหน่งติดตั้ง";
  if (warning.includes("Factory/large-building tariffs"))
    return "อัตราค่าไฟสำหรับโรงงานหรืออาคารขนาดใหญ่ยังไม่รองรับ ผลนี้จึงใช้อัตราธุรกิจขนาดเล็กเป็นค่าประมาณ";
  return warning;
}

function buildSolarRuntimeReportDraft(
  analysis: SolarAnalysisResult,
  trace: Extract<SolarAnalyzeResponse, { ok: true }>["trace"],
  snapshot: LocalLoadProfileSnapshot,
  systemRecommendation: SolarSystemRecommendation,
): LocalAnalysisReportDraft {
  const comparison = analysis.billComparison;
  return {
    module: "solar",
    moduleLabel: "Solar",
    title: "รายงานประเมิน Solar จาก Load Profile",
    summary: `${systemRecommendation.headline} ประเมินจาก ${snapshot.sourceName}`,
    metrics: [
      {
        label: "คำแนะนำ",
        value: systemRecommendation.verdictLabel,
      },
      {
        label: "ประเภทระบบ",
        value: systemRecommendation.systemTypeLabel,
      },
      {
        label: "ขนาดระบบที่แนะนำ",
        value:
          systemRecommendation.systemSizeKwp === null
            ? "ยังไม่แนะนำขนาด"
            : `${formatNumber(systemRecommendation.systemSizeKwp)} kWp · ${systemRecommendation.panelCount} แผง · Inverter ${formatNumber(systemRecommendation.inverterSizeKw ?? 0)} kW`,
      },
      {
        label: "แบตเตอรี่",
        value: systemRecommendation.batteryLabel,
      },
      {
        label: "งบติดตั้งเบื้องต้น",
        value: formatRecommendationBudget(systemRecommendation),
      },
      {
        label: "ค่าไฟก่อนติดตั้ง",
        value: `${formatNumber(comparison.bestWithoutSolar.monthlyBillThb)} บาท/เดือน`,
      },
      {
        label: "ค่าไฟหลังติดตั้ง",
        value: `${formatNumber(comparison.bestWithSolar.monthlyBillThb)} บาท/เดือน`,
      },
      {
        label: "ผลประโยชน์รวมโดยประมาณ",
        value: `${formatNumber(comparison.netAnnualBenefit)} บาท/ปี`,
      },
      {
        label: "ระยะเวลาคืนทุน",
        value: systemRecommendation.combinedPaybackLabel,
      },
    ],
    assumptions: [
      { label: "Load Profile", value: snapshot.sourceName },
      {
        label: "จำนวนช่วงข้อมูล",
        value: trace.inputIntervalCount.toLocaleString("th-TH"),
      },
      {
        label: "ขนาดระบบ",
        value: `${formatNumber(analysis.solarProfile.assumptionsSnapshot.systemSizeKwp)} kWp`,
      },
      { label: "การไฟฟ้า", value: trace.authority },
    ],
    resultRows: [
      {
        monthlyBillBeforeThb: roundReportNumber(
          comparison.bestWithoutSolar.monthlyBillThb,
        ),
        monthlyBillAfterThb: roundReportNumber(
          comparison.bestWithSolar.monthlyBillThb,
        ),
        annualBenefitThb: roundReportNumber(comparison.netAnnualBenefit),
        systemSizeKwp: roundReportNumber(
          analysis.solarProfile.assumptionsSnapshot.systemSizeKwp,
        ),
      },
    ],
    recommendations: [
      {
        title: systemRecommendation.headline,
        description: systemRecommendation.reasons.join(" "),
        nextAction: systemRecommendation.nextAction,
      },
      ...analysis.recommendations.map((item) => ({
        title: item.title,
        description: item.explanation,
        nextAction: item.nextAction,
      })),
    ],
    limitations: systemRecommendation.limitations.map((limitation) => ({
      title: "ข้อจำกัดของผลประเมิน",
      description: limitation,
    })),
    references: [
      {
        label: "อัตราค่าไฟอ้างอิง",
        value: `${trace.authority} · วันที่ ${trace.billDate}`,
      },
    ],
  };
}

function roundReportNumber(value: number) {
  return Number(value.toFixed(2));
}

function formatRecommendationBudget(recommendation: SolarSystemRecommendation) {
  if (
    recommendation.budgetLowThb === null ||
    recommendation.budgetHighThb === null
  )
    return "ยังไม่แนะนำให้ออกงบลงทุน";
  const batteryNote = recommendation.batteryRecommended
    ? ` รวมแบตประมาณ ${formatNumber(recommendation.batteryUsableKwh ?? 0)} kWh`
    : " ไม่รวมแบตเตอรี่";
  return `${formatNumber(recommendation.budgetLowThb)}–${formatNumber(recommendation.budgetHighThb)} บาท (${batteryNote.trim()})`;
}
