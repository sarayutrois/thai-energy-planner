"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Cloud,
  FileText,
  LoaderCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteLocalAnalysisReport,
  getCurrentAnalysisDataset,
  isLocalAnalysisReportCurrent,
  localAnalysisReportMatchesProject,
  readLocalAnalysisReports,
  restoreProjectAnalysisReports,
} from "@/lib/local-analysis-report";
import type { LocalAnalysisReportSnapshot } from "@/lib/local-analysis-snapshot";
import { authenticatedFetch } from "@/lib/auth-fetch";
import {
  activeProjectChangedEvent,
  readActiveProject,
  type ActiveProject,
} from "@/lib/active-project";

export function LocalAnalysisReportCards() {
  const [reports, setReports] = useState<LocalAnalysisReportSnapshot[]>([]);
  const [currentReportIds, setCurrentReportIds] = useState<Set<string>>(
    new Set(),
  );
  const [activeProject, setActiveProjectState] = useState<ActiveProject | null>(
    null,
  );
  const [cloudStatus, setCloudStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);

  const refreshReports = useCallback((projectId?: string) => {
    try {
      const nextReports = readLocalAnalysisReports().filter((report) =>
        localAnalysisReportMatchesProject(report, projectId),
      );
      const currentDataset = getCurrentAnalysisDataset(projectId);
      setReports(nextReports);
      setCurrentReportIds(
        new Set(
          nextReports
            .filter((report) =>
              isLocalAnalysisReportCurrent(report, currentDataset),
            )
            .map((report) => report.id),
        ),
      );
    } catch {
      setReports([]);
      setCurrentReportIds(new Set());
    }
  }, []);

  useEffect(() => {
    const refreshProject = () => {
      const project = readActiveProject(window.localStorage);
      setActiveProjectState(project);
      refreshReports(project?.id);
    };
    refreshProject();
    window.addEventListener(activeProjectChangedEvent, refreshProject);
    return () =>
      window.removeEventListener(activeProjectChangedEvent, refreshProject);
  }, [refreshReports]);

  async function restoreFromProject() {
    if (!activeProject) return;
    setCloudStatus("loading");
    setCloudMessage(null);
    const response = await authenticatedFetch(
      `/api/projects/${activeProject.id}/reports`,
    ).catch(() => null);
    if (!response?.ok) {
      setCloudStatus("error");
      setCloudMessage(
        response?.status === 401
          ? "เข้าสู่ระบบอีกครั้งเพื่อดูรายงานของโปรเจกต์"
          : "โหลดประวัติรายงานไม่สำเร็จ กรุณาลองใหม่",
      );
      return;
    }
    const payload = (await response.json()) as unknown;
    const result = restoreProjectAnalysisReports(payload, activeProject.id);
    refreshReports(activeProject.id);
    setCloudStatus("success");
    setCloudMessage(
      result.restoredCount > 0
        ? `นำรายงาน ${result.restoredCount} รายการจาก “${activeProject.name}” มาไว้ในเครื่องแล้ว`
        : `โปรเจกต์ “${activeProject.name}” ยังไม่มีรายงานที่บันทึกในบัญชี`,
    );
  }

  return (
    <div className="grid gap-4">
      {activeProject ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 font-semibold">
                <Cloud aria-hidden="true" className="h-4 w-4 text-primary" />
                ประวัติของโปรเจกต์: {activeProject.name}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                ดึงรายงานที่เคยบันทึกในบัญชีมาเปิดทบทวนจากอุปกรณ์นี้
                หากต้องการส่งออกให้ใช้บิลและ Load Profile
                ชุดเดียวกับตอนสร้างรายงาน
              </p>
              {cloudMessage ? (
                <p className="mt-1 text-sm font-medium" aria-live="polite">
                  {cloudMessage}
                </p>
              ) : null}
            </div>
            <button
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              disabled={cloudStatus === "loading"}
              onClick={() => void restoreFromProject()}
              type="button"
            >
              {cloudStatus === "loading" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              โหลดประวัติรายงาน
            </button>
          </CardContent>
        </Card>
      ) : null}

      {reports.length === 0 ? null : (
        <div className="grid gap-4 xl:grid-cols-2">
          {reports.map((report) => (
            <Card
              key={report.id}
              className={`flex h-full flex-col ${currentReportIds.has(report.id) ? "border-success/35" : "border-warning/40"}`}
            >
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText
                        aria-hidden="true"
                        className="h-5 w-5 text-primary"
                      />
                      {report.title}
                    </CardTitle>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {report.summary}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={
                        currentReportIds.has(report.id) ? "success" : "warning"
                      }
                    >
                      {currentReportIds.has(report.id)
                        ? "ข้อมูลปัจจุบัน"
                        : "ผลลัพธ์ล้าสมัย"}
                    </Badge>
                    <Badge variant="outline">{report.moduleLabel}</Badge>
                    {report.sourceProfile?.isSample ? (
                      <Badge variant="warning">ข้อมูลตัวอย่าง</Badge>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid flex-1 gap-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <Metric
                    label="สร้างเมื่อ"
                    value={new Date(report.createdAt).toLocaleDateString(
                      "th-TH",
                    )}
                  />
                  <Metric
                    label="บิลต้นทาง"
                    value={`${report.sourceBill.monthCount} เดือน`}
                  />
                  <Metric
                    label="คุณภาพข้อมูล"
                    value={report.sourceBill.dataQualityLabel}
                  />
                </div>
                {report.sourceProfile ? (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
                    <p className="font-semibold">
                      ข้อมูลการใช้ไฟ: {report.sourceProfile.name}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {formatProfileSource(report.sourceProfile.sourceKind)} ·{" "}
                      {report.sourceProfile.intervalCount.toLocaleString(
                        "th-TH",
                      )}{" "}
                      ช่วงข้อมูล ·{" "}
                      {formatQuality(report.sourceProfile.qualityLevel)}
                    </p>
                    {report.billCalibration ? (
                      <p className="mt-2 text-muted-foreground">
                        เปรียบเทียบกับบิล{" "}
                        {report.billCalibration.comparedMonthCount} เดือน,
                        ส่วนต่าง{" "}
                        {report.billCalibration.varianceKwh.toLocaleString(
                          "th-TH",
                        )}{" "}
                        kWh
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <a
                    className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring"
                    href={`/analysis/reports/${report.id}`}
                  >
                    เปิดรายงานนี้
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </a>
                  <button
                    className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                    onClick={() => {
                      deleteLocalAnalysisReport(report.id);
                      setReports((current) =>
                        current.filter((item) => item.id !== report.id),
                      );
                    }}
                    type="button"
                  >
                    ลบรายงาน
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/35 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function formatProfileSource(value: string) {
  if (value === "meter") return "ข้อมูลจากมิเตอร์";
  if (value === "appliance") return "รายการเครื่องใช้ไฟฟ้า";
  if (value === "csv") return "ไฟล์ที่นำเข้า";
  if (value === "demo") return "ข้อมูลตัวอย่าง";
  return value;
}

function formatQuality(value: string) {
  if (value === "measured" || value === "high") return "คุณภาพสูง";
  if (value === "modeled" || value === "medium") return "คุณภาพปานกลาง";
  if (value === "estimated" || value === "low") return "คุณภาพต่ำ";
  return value;
}
