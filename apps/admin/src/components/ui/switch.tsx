"use client";

import { cn } from "@/lib/utils";

/**
 * Switch acessível (sem dependência nova): um `button role="switch"`. Ligado =
 * trilho lima (o acento do admin); desligado = surface. O polegar desliza.
 */
export function Switch({
  checked,
  onCheckedChange,
  className,
  disabled,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
        checked ? "border-primary bg-primary" : "border-border bg-surface-2",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none block size-3.5 rounded-full shadow-sm transition-transform",
          checked
            ? "translate-x-[18px] bg-primary-foreground"
            : "translate-x-0.5 bg-muted-foreground",
        )}
      />
    </button>
  );
}
