import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-gradient-to-r from-cyan-300 via-cyan-400 to-sky-400 text-primary-foreground shadow-[0_0_22px_rgba(34,211,238,0.28)] hover:brightness-110",
  outline: "border border-primary/30 bg-card/80 text-foreground hover:border-primary/70 hover:bg-primary/10",
  ghost: "text-foreground hover:bg-muted"
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  default: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base"
};

export function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      type={type}
      {...props}
    />
  );
}
