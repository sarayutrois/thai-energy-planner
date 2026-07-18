import type { HTMLAttributes, ReactNode } from "react";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type EnergyTone = "neutral" | "load" | "tou" | "solar" | "success";

const panelTones: Record<EnergyTone, string> = {
  neutral: "energy-panel-neutral",
  load: "energy-panel-load",
  tou: "energy-panel-tou",
  solar: "energy-panel-solar",
  success: "energy-panel-success",
};

export function EnergyPanel({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { tone?: EnergyTone }) {
  return (
    <section
      className={cn(
        "energy-panel relative min-w-0 overflow-hidden rounded-[1.35rem] border p-5 md:p-6",
        panelTones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function EnergyMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: EnergyTone;
}) {
  return (
    <article
      className={cn(
        "energy-metric group relative min-w-0 overflow-hidden rounded-2xl border p-4 transition duration-200 hover:-translate-y-0.5",
        panelTones[tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background/80 text-primary shadow-sm ring-1 ring-border/70">
          <Icon aria-hidden="true" className="h-[1.125rem] w-[1.125rem]" />
        </span>
      </div>
      <p className="mt-4 break-words text-[1.35rem] font-semibold tracking-[-0.025em] text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </article>
  );
}

export function EnergyAction({
  href,
  label,
  description,
  icon: Icon,
  tone = "neutral",
}: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tone?: EnergyTone;
}) {
  return (
    <Link
      className={cn(
        "group flex min-w-0 items-start gap-3 rounded-2xl border p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-panel focus:outline-none focus:ring-2 focus:ring-ring",
        panelTones[tone],
      )}
      href={href}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/85 text-primary shadow-sm ring-1 ring-border/60">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2 font-semibold">
          {label}
          <ArrowUpRight
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
          />
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </Link>
  );
}

export function EnergySectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] md:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
