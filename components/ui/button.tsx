/* Hallmark · component: button · genre: modern-minimal · theme: custom brand-blue
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (46–50)
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold leading-none transition-colors duration-120 disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "rounded-pill bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-110 active:brightness-95 aria-busy:opacity-70",
        secondary:
          "rounded-pill bg-[var(--color-paper-3)] text-[var(--color-ink)] border border-[var(--color-rule)] hover:border-[var(--color-ink-3)] active:bg-[var(--color-paper-2)]",
        success:
          "rounded-pill bg-[var(--color-success)] text-[var(--color-success-ink)] hover:brightness-105 active:brightness-95",
        destructive:
          "rounded-pill bg-[var(--color-danger)] text-[var(--color-danger-ink)] hover:brightness-105 active:brightness-95",
        outline:
          "rounded-pill border border-[var(--color-rule)] text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] active:bg-[var(--color-paper-2)]",
        ghost: "rounded-pill text-[var(--color-ink-2)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-2)]",
      },
      size: { default: "h-11 px-6", sm: "h-8 px-3.5 text-xs", lg: "h-12 px-8", icon: "h-10 w-10" },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}
export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
export { buttonVariants };
