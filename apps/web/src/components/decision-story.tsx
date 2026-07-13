import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DecisionEvidence = {
  label: string;
  value: string;
};

export function DecisionStory({
  eyebrow = "คำตอบหลักของคุณ",
  title,
  reason,
  evidence,
  limitations = [],
  nextAction,
  confidence,
  tone = "positive",
}: {
  eyebrow?: string;
  title: string;
  reason: string;
  evidence: DecisionEvidence[];
  limitations?: string[];
  nextAction: string;
  confidence?: string;
  tone?: "positive" | "caution" | "neutral";
}) {
  return (
    <section
      aria-label="คำตอบหลักจากผลการวิเคราะห์"
      data-testid="decision-answer"
      className={cn(
        "relative isolate scroll-mt-24 overflow-hidden rounded-[2rem] border-2 bg-card shadow-float",
        tone === "positive" && "border-success/45",
        tone === "caution" && "border-warning/60",
        tone === "neutral" && "border-primary/35",
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-warning to-primary"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="grid gap-7 p-6 pt-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-8 lg:pt-10">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="inline-flex items-center gap-2 rounded-full bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              {eyebrow}
            </p>
            {confidence ? (
              <Badge className="bg-card/90" variant="outline">
                {confidence}
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.025em] text-foreground md:text-4xl">
            {title}
          </h2>
          <div className="mt-6 flex gap-3 rounded-2xl border border-border/70 bg-muted/45 p-4">
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-success"
            />
            <div>
              <p className="text-sm font-semibold">เหตุผลที่ระบบเลือกคำตอบนี้</p>
              <p className="mt-1 text-base leading-7 text-foreground/80">
                {reason}
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">ตัวเลขที่ยืนยันคำตอบ</p>
          <dl className="mt-3 grid gap-2">
            {evidence.map((item, index) => (
              <div
                key={item.label}
                className={cn(
                  "flex items-start justify-between gap-4 rounded-xl border px-4 py-3",
                  index === 0
                    ? "border-primary/25 bg-primary/[0.07]"
                    : "border-border/60 bg-muted/40",
                )}
              >
                <dt className="text-xs leading-5 text-muted-foreground">
                  {item.label}
                </dt>
                <dd
                  className={cn(
                    "text-right font-semibold tabular-nums",
                    index === 0 ? "text-lg text-primary" : "text-sm",
                  )}
                >
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {limitations.length > 0 ? (
        <div className="flex gap-3 border-t border-warning/20 bg-warning/[0.07] px-6 py-4 lg:px-8">
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-warning"
          />
          <div>
            <p className="text-xs font-semibold">ข้อจำกัดที่ควรรู้</p>
            <ul className="mt-1 grid gap-1 text-sm leading-6 text-foreground/70">
              {limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="flex gap-3 bg-primary px-6 py-5 text-primary-foreground lg:px-8">
        <ArrowRight
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0"
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground/75">
            ขั้นตอนถัดไป
          </p>
          <p className="mt-1 text-base font-semibold leading-6">{nextAction}</p>
        </div>
      </div>
    </section>
  );
}
