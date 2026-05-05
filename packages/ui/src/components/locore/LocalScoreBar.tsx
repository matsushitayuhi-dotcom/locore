import * as React from "react";
import { cn } from "../../lib/utils";
import { clamp } from "../../lib/utils";
import { localScoreColor } from "../../tokens/colors";

export interface LocalScoreBarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** 0-100 score. Out-of-range values are clamped. */
  value: number;
  /** Show "ローカル度 {value}" caption beneath the bar. Default true. */
  showLabel?: boolean;
  /** Visual size; affects bar height + label gap. */
  size?: "sm" | "md" | "lg";
  /** Override the default Japanese label. */
  label?: string;
}

const HEIGHTS: Record<NonNullable<LocalScoreBarProps["size"]>, string> = {
  sm: "h-1",
  md: "h-1.5",
  lg: "h-2",
};

/**
 * LocalScoreBar — visualises a 0-100 "ローカル度" score as a horizontal slider-style bar.
 * Color shifts from terracotta (定番側) → dusty purple → moss (ローカル側).
 *
 * DESIGN.md §3.2.2 / §7.6.
 */
export const LocalScoreBar = React.forwardRef<HTMLDivElement, LocalScoreBarProps>(
  (
    {
      value,
      showLabel = true,
      size = "md",
      label,
      className,
      ...rest
    },
    ref,
  ) => {
    const clamped = clamp(Math.round(value), 0, 100);
    const fillColor = localScoreColor(clamped);
    const text = label ?? `ローカル度 ${clamped}`;

    return (
      <div
        ref={ref}
        data-locore-component="LocalScoreBar"
        data-locore-size={size}
        className={cn("flex flex-col gap-2", className)}
        {...rest}
      >
        <div
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={text}
          className={cn(
            "relative w-full overflow-hidden rounded-full bg-neutral-100",
            HEIGHTS[size],
          )}
        >
          <div
            className="h-full rounded-full transition-[width] duration-slow ease-out"
            style={{ width: `${clamped}%`, backgroundColor: fillColor }}
          />
        </div>
        {showLabel ? (
          <span className="text-caption text-neutral-500 tabular self-end">
            {text}
          </span>
        ) : null}
      </div>
    );
  },
);
LocalScoreBar.displayName = "LocalScoreBar";
