import * as React from "react";
import { Star, StarHalf } from "lucide-react";
import { cn } from "../../lib/utils";
import { clamp } from "../../lib/utils";

export interface SatisfactionStarsProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** 0-5 rating. */
  rating: number;
  /** Optional review count, rendered as `(41)` after the numeric rating. */
  count?: number;
  /** Visual size. */
  size?: "sm" | "md";
  /** Show the 5 graphical stars before the numeric label. Default true. */
  showStars?: boolean;
}

const ICON_SIZE: Record<NonNullable<SatisfactionStarsProps["size"]>, string> = {
  sm: "size-3.5",
  md: "size-4",
};

const TEXT_SIZE: Record<NonNullable<SatisfactionStarsProps["size"]>, string> = {
  sm: "text-caption",
  md: "text-body-sm",
};

/**
 * SatisfactionStars — `★ 4.7 (41)` style rating, with five graphical stars.
 * Filled tone uses warning-500 (DESIGN.md §7.7).
 */
export const SatisfactionStars = React.forwardRef<
  HTMLSpanElement,
  SatisfactionStarsProps
>(
  (
    { rating, count, size = "md", showStars = true, className, ...rest },
    ref,
  ) => {
    const clamped = clamp(rating, 0, 5);
    const full = Math.floor(clamped);
    const hasHalf = clamped - full >= 0.25 && clamped - full < 0.75;
    const empty = 5 - full - (hasHalf ? 1 : 0);

    const ariaLabel = `満足度 ${clamped.toFixed(1)} / 5${
      typeof count === "number" ? `、${count}件のレビュー` : ""
    }`;

    return (
      <span
        ref={ref}
        data-locore-component="SatisfactionStars"
        data-locore-size={size}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center gap-1.5 text-neutral-500",
          TEXT_SIZE[size],
          className,
        )}
        {...rest}
      >
        {showStars ? (
          <span className="inline-flex items-center gap-[2px]" aria-hidden>
            {Array.from({ length: full }).map((_, i) => (
              <Star
                key={`f-${i}`}
                className={cn(ICON_SIZE[size], "text-warning-500")}
                fill="currentColor"
              />
            ))}
            {hasHalf ? (
              <StarHalf
                key="half"
                className={cn(ICON_SIZE[size], "text-warning-500")}
                fill="currentColor"
              />
            ) : null}
            {Array.from({ length: empty }).map((_, i) => (
              <Star
                key={`e-${i}`}
                className={cn(ICON_SIZE[size], "text-neutral-200")}
                fill="currentColor"
              />
            ))}
          </span>
        ) : (
          <Star
            className={cn(ICON_SIZE[size], "text-warning-500")}
            fill="currentColor"
            aria-hidden
          />
        )}
        <span className="font-mono tabular text-neutral-700">
          {clamped.toFixed(1)}
        </span>
        {typeof count === "number" ? (
          <span className="font-mono tabular text-neutral-500">({count})</span>
        ) : null}
      </span>
    );
  },
);
SatisfactionStars.displayName = "SatisfactionStars";
