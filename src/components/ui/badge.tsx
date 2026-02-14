import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "outline";

const variantClasses: Record<BadgeVariant, string> = {
  default:
    "bg-[color-mix(in_oklab,var(--accent),white_85%)] text-[color-mix(in_oklab,var(--accent),black_30%)]",
  secondary: "bg-[var(--muted)] text-[var(--foreground)]",
  outline: "border border-[var(--border)] bg-transparent text-[var(--foreground)]",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
