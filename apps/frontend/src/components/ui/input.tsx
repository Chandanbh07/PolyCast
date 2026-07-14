import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-xl border border-ink-700 bg-ink-900/60 px-3.5 text-sm text-mist-50 placeholder:text-mist-400 outline-none transition-all duration-200 focus:border-signal-500 focus:shadow-[0_0_0_3px_rgba(79,140,255,0.15)] disabled:opacity-40",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";