import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-[-0.01em]",
  {
    variants: {
      variant: {
        default: "bg-ink-800 text-mist-300 border border-ink-700",
        yes: "bg-yes-500/12 text-yes-400 border border-yes-500/25",
        no: "bg-no-500/12 text-no-400 border border-no-500/25",
        signal: "bg-signal-500/12 text-signal-300 border border-signal-500/25",
        outline: "border border-ink-600 text-mist-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}