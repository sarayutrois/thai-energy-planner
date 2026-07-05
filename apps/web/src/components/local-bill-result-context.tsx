"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { persistLocalAnalysisReport, saveLocalAnalysisReport } from "@/lib/local-analysis-report";
import { readLocalBillReportSnapshot } from "@/lib/local-bill-report";
import { localBillReportId, type LocalAnalysisReportDraft, type LocalBillReportSnapshot } from "@/lib/local-analysis-snapshot";

const audienceLabel: Record<LocalBillReportSnapshot["audience"], string> = {
  home: "บ้านพักอาศัย",
  shop: "ร้านค้า",
  business: "ธุรกิจขนาดเล็ก"
};

export function LocalBillResultContext({
  enabled,
  moduleName,
  reportDraft
}: {
  enabled: boolean;
  moduleName: string;
  reportDraft?: LocalAnalysisReportDraft | undefined;
}) {
  const [snapshot, setSnapshot] = useState<LocalBillReportSnapshot | null>(null);
  const [readError, setReadError] = useState(false);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    try {
      setSnapshot(readLocalBillReportSnapshot());
      setReadError(false);
    } catch {
      setSnapshot(null);
      setReadError(true);
    }
  }, [enabled]);

  if (!enabled) return null;

  if (readError) {
    return (
      <Card className="mt-6 border-warning/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText aria-hidden="true" className="h-5 w-5 text-warning" />
            อ่านข้อมูลบิลในเครื่องนี้ไม่ได้
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm leading-6 text-muted-foreground">
            ผลลัพธ์นี้ถูกเปิดจาก saved bills แต่ข้อมูลใน browser อาจถูกลบหรือเสียรูปแบบแล้ว
          </p>
          <ActionLink href="/analysis/load-data/bills" label="กลับไปเพิ่มบิล" />
        </CardContent>
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card className="mt-6 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText aria-hidden="true" className="h-5 w-5 text-primary" />
            ยังไม่พบ saved bills ใน browser นี้
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm leading-6 text-muted-foreground">
            ลิงก์นี้ถูกตั้งให้เริ่มจากบิล แต่ยังไม่มี snapshot ที่ใช้แสดงบริบทของผล {moduleName}
          </p>
          <ActionLink href="/analysis/load-data/bills" label="เพิ่มบิลก่อน" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 border-primary/40 bg-primary/5">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText aria-hidden="true" className="h-5 w-5 text-primary" />
              ผล {moduleName} นี้เริ่มจาก saved bills
            </CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              ใช้บิล {snapshot.monthCount} เดือนใน browser นี้เป็นจุดตั้งต้น แต่ผลคำนวณยังอิง demo profile/draft tariff ของโมดูลวิเคราะห์
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">{snapshot.dataQualityLabel}</Badge>
            <Badge variant="outline">{audienceLabel[snapshot.audience]}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="จำนวนเดือน" value={`${snapshot.monthCount}`} />
          <Metric label="ใช้ไฟรวม" value={`${formatNumber(snapshot.totalKwh)} kWh`} />
          <Metric label="ค่าไฟเฉลี่ย" value={`${formatNumber(snapshot.averageMonthlyCostThb)} บาท/เดือน`} />
          <Metric
            label="ค่าเฉลี่ยต่อหน่วย"
            value={snapshot.averageCostPerKwh ? `${formatNumber(snapshot.averageCostPerKwh)} บาท/kWh` : "-"}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {reportDraft ? (
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring"
              onClick={() => {
                const report = saveLocalAnalysisReport({
                  billSnapshot: snapshot,
                  draft: reportDraft,
                  sourcePath: `${window.location.pathname}${window.location.search}`
                });
                setSavedReportId(report.id);
                setSyncStatus("บันทึก local แล้ว กำลัง sync database...");
                void persistLocalAnalysisReport(report)
                  .then((persistedReport) => {
                    setSyncStatus(
                      persistedReport.serverGeneratedReportId
                        ? "บันทึกลง database แล้ว"
                        : "บันทึก local แล้ว แต่ database ยังไม่พร้อม"
                    );
                  })
                  .catch(() => {
                    setSyncStatus("บันทึก local แล้ว แต่ database ยังไม่พร้อม");
                  });
              }}
              type="button"
            >
              บันทึกเป็นรายงาน
              <ReceiptText aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : null}
          {savedReportId ? <ActionLink href={`/analysis/reports/${savedReportId}`} label="เปิดรายงานที่บันทึก" /> : null}
          <ActionLink href={`/analysis/reports/${localBillReportId}`} label="เปิดรายงานบิล" />
          <ActionLink href={`/analysis/load-data/bills?audience=${snapshot.audience}&source=bills`} label="แก้ไขบิล" variant="outline" />
          <ActionLink href="/analysis/load-data/dashboard" label="กลับ Dashboard" variant="outline" />
        </div>
        {syncStatus ? <p className="text-sm text-muted-foreground">{syncStatus}</p> : null}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ActionLink({
  href,
  label,
  variant = "default"
}: {
  href: string;
  label: string;
  variant?: "default" | "outline";
}) {
  const className =
    variant === "outline"
      ? "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
      : "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <Link className={className} href={href}>
      {label}
      <ArrowRight aria-hidden="true" className="h-4 w-4" />
    </Link>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}
