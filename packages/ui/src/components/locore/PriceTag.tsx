import * as React from "react";
import { cn } from "../../lib/utils";
import { formatJpy } from "../../lib/utils";

export interface PriceTagProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** JPY amount. Decimals are truncated (Locore prices are integer yen). */
  amount: number;
  /** Visual size. */
  size?: "sm" | "md" | "lg";
  /** Suffix appended after the amount, e.g. "/ 1記事". */
  suffix?: string;
}

const SIZE_CLASS: Record<NonNullable<PriceTagProps["size"]>, string> = {
  sm: "text-body-sm",
  md: "text-mono-md",
  lg: "text-heading-md",
};

/**
 * PriceTag — renders a JPY price in tabular numerals with thousands separators.
 * DESIGN.md §3.2.2 / §2.2.3.
 */
export const PriceTag = React.forwardRef<HTMLSpanElement, PriceTagProps>(
  ({ amount, size = "md", suffix, className, ...rest }, ref) => {
    return (
      <span
        ref={ref}
        data-locore-component="PriceTag"
        data-locore-size={size}
        className={cn(
          "inline-flex items-baseline gap-1 font-mono tabular text-neutral-900",
          SIZE_CLASS[size],
          className,
        )}
        {...rest}
      >
        <span aria-hidden>{formatJpy(amount)}</span>
        <span className="sr-only">{`${amount.toLocaleString("ja-JP")}円`}</span>
        {suffix ? (
          <span className="text-caption text-neutral-500 font-sans">
            {suffix}
          </span>
        ) : null}
      </span>
    );
  },
);
PriceTag.displayName = "PriceTag";
