import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PhoneFrameProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function PhoneFrame({
  children,
  className,
  contentClassName,
}: PhoneFrameProps) {
  return (
    <div
      className={cn(
        "app-shell w-full max-w-[390px] overflow-hidden rounded-[2.25rem] border border-black/10 bg-[#f7f7f7]",
        className
      )}
    >
      <div className={cn("flex min-h-[844px] flex-col", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
