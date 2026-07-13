import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 border-b border-border/80 pb-7 md:flex-row md:items-end md:justify-between md:pb-8",
        className,
      )}
    >
      <div className="max-w-3xl">
        <div className="mb-2 text-sm font-semibold text-primary">{eyebrow}</div>
        <h1 className="text-3xl font-semibold leading-tight tracking-[-0.03em] md:text-[2.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </section>
  );
}

export function ActionBar({
  back,
  primary,
  className,
}: {
  back?: ReactNode;
  primary: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div>{back}</div>
      <div className="flex flex-wrap gap-2">{primary}</div>
    </div>
  );
}
