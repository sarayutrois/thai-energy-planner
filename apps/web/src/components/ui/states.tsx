import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Alert({ tone = "information", title, children }: { tone?: "information" | "success" | "warning" | "danger"; title: string; children: ReactNode }) {
  const styles = { information: "border-information/30 bg-information/10", success: "border-success/30 bg-success/10", warning: "border-warning/35 bg-warning/10", danger: "border-destructive/30 bg-destructive/10" };
  const Icon = tone === "success" ? CheckCircle2 : tone === "danger" ? AlertCircle : Info;
  return <section role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg border p-4 text-sm leading-6", styles[tone])}><Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" /><div><h2 className="font-semibold">{title}</h2><div className="mt-1 text-muted-foreground">{children}</div></div></section>;
}

export function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail?: string; icon?: ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-muted-foreground">{label}</p>{icon ? <span className="text-primary">{icon}</span> : null}</div><p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>{detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p> : null}</section>;
}

export function DataConfidence({ label, detail, tone = "information" }: { label: string; detail: string; tone?: "information" | "success" | "warning" }) {
  const styles = { information: "border-information/30 bg-information/10", success: "border-success/30 bg-success/10", warning: "border-warning/35 bg-warning/10" };
  return <section className={cn("rounded-lg border p-4", styles[tone])}><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p></section>;
}

export function Skeleton({ className }: { className?: string }) { return <div aria-label="กำลังโหลด" className={cn("animate-pulse rounded-md bg-muted", className)}><span className="sr-only">กำลังโหลด</span></div>; }

export function LoadingState({ label = "กำลังคำนวณข้อมูล" }: { label?: string }) { return <div role="status" className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />{label}</div>; }
