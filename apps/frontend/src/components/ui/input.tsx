import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-xl border border-ink-600 bg-ink-900/60 px-3.5 text-sm text-mist-50 placeholder:text-mist-400 outline-none transition-colors focus:border-signal-400 disabled:opacity-40 font-mono-nums",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
