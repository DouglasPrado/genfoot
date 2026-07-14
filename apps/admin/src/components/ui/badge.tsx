import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface-2 text-muted-foreground",
        live: "border-primary/40 bg-primary/10 text-primary",
        ok: "border-transparent bg-[color:var(--ok)]/15 text-[color:var(--ok)]",
        warn: "border-transparent bg-[color:var(--warn)]/15 text-[color:var(--warn)]",
        danger:
          "border-transparent bg-[color:var(--danger)]/15 text-[color:var(--danger)]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
