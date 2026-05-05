import * as React from "react";
import { BadgeCheck } from "lucide-react";
import { cn } from "../../lib/utils";

export type ResidencyTier = "S" | "A" | "B";

export interface ResidencyBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  tier: ResidencyTier;
  /** 居住年数。指定すると `居住{years}年` をラベルに含める。 */
  years?: number;
  /** Hide the textual label and keep only the icon (for tight spaces). */
  iconOnly?: boolean;
}

interface TierStyle {
  container: string;
  iconColor: string;
  /** Solid-filled BadgeCheck or outline-only? */
  variant: "solid" | "outline";
  label: string;
}

const TIER_STYLES: Record<ResidencyTier, TierStyle> = {
  S: {
    // Tier S: most prominent, accent-500 ring, accent-50 background
    container:
      "bg-accent-50 text-accent-700 border border-accent-500 px-2 py-0.5 font-semibold",
    iconColor: "text-accent-500",
    variant: "solid",
    label: "Tier S",
  },
  A: {
    // Tier A: confirmed, primary tone but quieter
    container:
      "bg-primary-50 text-primary-700 border border-primary-300 px-2 py-0.5 font-medium",
    iconColor: "text-primary-500",
    variant: "outline",
    label: "Tier A",
  },
  B: {
    // Tier B: subdued, neutral surface, no border emphasis
    container: "bg-neutral-100 text-neutral-700 px-2 py-0.5 font-medium",
    iconColor: "text-neutral-500",
    variant: "outline",
    label: "Tier B",
  },
};

/**
 * ResidencyBadge — displays a writer's verified-residency tier
 * with optional `居住{years}年` text. DESIGN.md §7.5.
 */
export const ResidencyBadge = React.forwardRef<HTMLSpanElement, ResidencyBadgeProps>(
  ({ tier, years, iconOnly = false, className, ...rest }, ref) => {
    const style = TIER_STYLES[tier];
    const yearsLabel = typeof years === "number" ? `居住${years}年` : null;
    const tooltip = `${style.label}${yearsLabel ? ` / ${yearsLabel}` : ""}`;

    return (
      <span
        ref={ref}
        data-locore-component="ResidencyBadge"
        data-locore-tier={tier}
        title={tooltip}
        aria-label={tooltip}
        className={cn(
          "inline-flex items-center gap-1 rounded-full text-caption leading-none",
          style.container,
          className,
        )}
        {...rest}
      >
        <BadgeCheck
          className={cn("size-3.5", style.iconColor)}
          fill={style.variant === "solid" ? "currentColor" : "none"}
          aria-hidden="true"
        />
        {!iconOnly && (
          <span>
            {style.label}
            {yearsLabel ? <span className="ml-1">· {yearsLabel}</span> : null}
          </span>
        )}
      </span>
    );
  },
);
ResidencyBadge.displayName = "ResidencyBadge";
