import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const badge = cva("badge", {
  variants: {
    variant: {
      neutral: "badge-neutral",
      primary: "badge-primary",
      critical: "badge-critical",
      warning: "badge-warning",
      optional: "badge-optional",
    },
  },
  defaultVariants: { variant: "neutral" },
});

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badge> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badge({ variant }), className)} {...props} />;
}
