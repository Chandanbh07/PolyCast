import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-signal-500 text-white font-semibold hover:bg-signal-400 shadow-[0_1px_2px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_16px_rgba(79,140,255,0.28)]",
        yes: "bg-yes-500 text-white hover:bg-yes-400 font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.3)]",
        no: "bg-no-500 text-white hover:bg-no-400 font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.3)]",
        outline:
          "border border-ink-600 bg-transparent text-mist-100 hover:bg-ink-800 hover:border-ink-500",
        ghost: "bg-transparent text-mist-200 hover:bg-ink-800 hover:text-mist-50",
        subtle: "bg-ink-800 text-mist-100 hover:bg-ink-700 border border-ink-700",
        link: "text-signal-400 underline-offset-4 hover:underline",
        destructive: "bg-no-600 text-white hover:bg-no-500 shadow-[0_1px_2px_rgba(0,0,0,0.3)]",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 px-3.5 text-xs",
        lg: "h-12 px-7 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };