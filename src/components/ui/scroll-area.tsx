import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const ScrollArea = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("overflow-y-auto", className)} {...props} />;
  }
);

ScrollArea.displayName = "ScrollArea";
