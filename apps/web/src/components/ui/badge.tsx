import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "border-transparent bg-primary text-primary-foreground",
  outline: "border-border bg-card text-foreground",
  success: "border-transparent bg-success text-success-foreground",
  warning: "border-transparent bg-warning text-warning-foreground",
  information: "border-transparent bg-information text-information-foreground",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof variants;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
