import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "ghost" | "outline" | "destructive";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-[var(--accent)] text-white hover:brightness-95",
  secondary:
    "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[color-mix(in_oklab,var(--muted),black_6%)]",
  ghost: "bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]",
  outline:
    "border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]",
  destructive: "bg-rose-500 text-white hover:bg-rose-600",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-8 px-3 text-xs",
  lg: "h-11 px-6",
  icon: "size-10 p-0",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
