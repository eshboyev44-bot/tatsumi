import { HTMLAttributes, ImgHTMLAttributes, useState } from "react";
import { cn } from "@/lib/utils";

type AvatarProps = HTMLAttributes<HTMLDivElement>;

export function Avatar({ className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--muted)]",
        className
      )}
      {...props}
    />
  );
}

type AvatarImageProps = ImgHTMLAttributes<HTMLImageElement>;

export function AvatarImage({ className, alt, ...props }: AvatarImageProps) {
  const [failed, setFailed] = useState(false);
  const src = typeof props.src === "string" ? props.src : null;

  if (failed || !src) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? ""}
      className={cn("absolute inset-0 size-full object-cover", className)}
      onError={() => setFailed(true)}
      loading={props.loading ?? "lazy"}
      decoding="async"
    />
  );
}

export function AvatarFallback({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "absolute inset-0 flex items-center justify-center text-xs font-semibold text-[var(--foreground)]",
        className
      )}
      {...props}
    />
  );
}
