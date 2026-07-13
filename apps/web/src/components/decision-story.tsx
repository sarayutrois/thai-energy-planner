import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DecisionEvidence = {
  label: string;
  value: string;
};

export function DecisionStory({
  eyebrow = "คำตอบจากข้อมูลชุดนี้",
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
      className={cn(
        "overflow-hidden rounded-xl border bg-card",
        tone === "positive" && "border-success/40",
        tone === "caution" && "border-warning/50",
        tone === "neutral" && "border-border",
      )}
    >
      <div className="grid gap-6 p-5 lg:grid-cols-[1.15fr_0.85fr] lg:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-primary">{eyebrow}</p>
            {confidence ? <Badge variant="outline">{confidence}</Badge> : null}
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            {title}
          </h2>
          <div className="mt-4 flex gap-3">
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-success"
            />
            <div>
              <p className="text-sm font-semibold">เหตุผล</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {reason}
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold">หลักฐานสำคัญ</p>
          <dl className="mt-3 grid gap-2">
            {evidence.map((item) => (
              <div
                key={item.label}
                className="flex items-start justify-between gap-4 rounded-md bg-muted/45 px-3 py-2.5"
              >
                <dt className="text-xs leading-5 text-muted-foreground">
                  {item.label}
                </dt>
                <dd className="text-right text-sm font-semibold">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {limitations.length > 0 ? (
        <div className="flex gap-3 border-t border-border bg-warning/5 px-5 py-4 lg:px-6">
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-warning"
          />
          <div>
            <p className="text-xs font-semibold">ข้อจำกัดที่ควรรู้</p>
            <ul className="mt-1 grid gap-1 text-xs leading-5 text-muted-foreground">
              {limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="flex gap-3 border-t border-border bg-primary/5 px-5 py-4 lg:px-6">
        <ArrowRight
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
        />
        <div>
          <p className="text-xs font-semibold text-primary">สิ่งที่ควรทำต่อ</p>
          <p className="mt-1 text-sm font-medium">{nextAction}</p>
        </div>
      </div>
    </section>
  );
}
