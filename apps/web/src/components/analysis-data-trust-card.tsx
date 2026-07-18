import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AnalysisDataTrust } from "@/lib/analysis-data-trust";

export function AnalysisDataTrustCard({
  trust,
  compact = false,
}: {
  trust: AnalysisDataTrust;
  compact?: boolean;
}) {
  const visibleIssues = trust.issues
    .filter((issue) => issue.severity !== "info" || trust.level !== "high")
    .slice(0, compact ? 2 : 4);
  const tone =
    trust.level === "high"
      ? "energy-panel-success border-success/40"
      : trust.level === "medium"
        ? "energy-panel-load border-primary/30"
        : "energy-panel-solar border-warning/45";

  return (
    <section
      aria-label="ความน่าเชื่อถือของข้อมูล"
      id="data-trust"
      className={`min-w-0 scroll-mt-24 rounded-[1.35rem] border p-4 shadow-panel md:p-5 ${tone}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck aria-hidden="true" className="h-5 w-5 text-primary" />
            ความน่าเชื่อถือของข้อมูลที่ใช้ตัดสินใจ
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {trust.summary}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Badge variant={trustVariant(trust.level)}>{trust.label}</Badge>
          <Badge variant="outline">{trust.score}/100</Badge>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TrustMetric
          label="บิลที่ใช้"
          value={`${trust.billMonthCount} เดือน`}
          detail={
            trust.missingBillMonthCount
              ? `ขาด ${trust.missingBillMonthCount} เดือน`
              : `${trust.consecutiveBillMonthCount} เดือนต่อเนื่อง`
          }
        />
        <TrustMetric
          label="Load Profile"
          value={`${trust.profileDayCount} วัน`}
          detail={trust.profileSourceLabel}
        />
        <TrustMetric
          label="ส่วนต่างก่อนปรับ"
          value={formatVariance(
            trust.reconciliation.varianceBeforeKwh,
            trust.reconciliation.varianceBeforePercent,
          )}
          detail="เทียบค่าเฉลี่ยบิลจริง"
        />
        <TrustMetric
          label="สถานะการปรับเทียบ"
          value={
            trust.reconciliation.isCalibrated
              ? "ใช้บิลปรับแล้ว"
              : "ยังไม่ยืนยันปรับ"
          }
          detail={
            trust.reconciliation.isCalibrated
              ? `เหลือส่วนต่าง ${formatPercent(Math.abs(trust.reconciliation.residualPercent ?? 0))}`
              : "TOU/Solar ยังใช้ Load เดิม"
          }
        />
      </div>

      {visibleIssues.length ? (
        <div className="mt-4 grid gap-2">
          {visibleIssues.map((issue) => (
            <div
              className="flex items-start gap-2 rounded-md border border-border/70 bg-background/75 p-3"
              key={issue.code}
            >
              <AlertTriangle
                aria-hidden="true"
                className={`mt-0.5 h-4 w-4 shrink-0 ${issue.severity === "critical" ? "text-destructive" : "text-warning"}`}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{issue.title}</p>
                {!compact ? (
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {issue.detail}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-sm font-medium text-success">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
          ไม่พบความผิดปกติสำคัญในข้อมูลชุดนี้
        </p>
      )}

      <p className="mt-4 rounded-md bg-background/70 p-3 text-sm font-medium leading-6">
        ขั้นต่อไป: {trust.nextAction}
      </p>
    </section>
  );
}

function TrustMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border/70 bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-semibold">{value}</p>
      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

function formatVariance(value: number | null, percent: number | null) {
  if (value === null || percent === null) return "ยังเทียบไม่ได้";
  return `${formatNumber(Math.abs(value))} kWh · ${formatPercent(Math.abs(percent))}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 }).format(
    value,
  );
}

function formatPercent(value: number) {
  return `${formatNumber(value)}%`;
}

function trustVariant(level: AnalysisDataTrust["level"]) {
  if (level === "high") return "success" as const;
  if (level === "low") return "warning" as const;
  return "information" as const;
}
