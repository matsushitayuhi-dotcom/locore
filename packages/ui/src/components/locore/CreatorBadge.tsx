import * as React from "react";
import { BadgeCheck, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export type CreatorBadgeType = "verified" | "founding";

export interface CreatorBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  type: CreatorBadgeType;
  /** Hide the textual label and keep only the icon. */
  iconOnly?: boolean;
}

interface CreatorStyle {
  container: string;
  iconColor: string;
  Icon: LucideIcon;
  label: string;
  tooltip: string;
}

const STYLES: Record<CreatorBadgeType, CreatorStyle> = {
  verified: {
    container:
      "bg-primary-50 text-primary-700 border border-primary-300 px-2 py-0.5",
    iconColor: "text-primary-500",
    Icon: BadgeCheck,
    label: "認証",
    tooltip: "認証クリエイター",
  },
  founding: {
    container:
      "bg-secondary-50 text-secondary-700 border border-secondary-300 px-2 py-0.5",
    iconColor: "text-secondary-500",
    Icon: Sparkles,
    label: "Founding",
    tooltip: "Founding Creator / 創業期メンバー",
  },
};

/**
 * CreatorBadge — labels a writer as either a verified creator or a
 * founding-era contributor. DESIGN.md §7.5.
 */
export const CreatorBadge = React.forwardRef<HTMLSpanElement, CreatorBadgeProps>(
  ({ type, iconOnly = false, className, ...rest }, ref) => {
    const style = STYLES[type];
    const Icon = style.Icon;

    return (
      <span
        ref={ref}
        data-locore-component="CreatorBadge"
        data-locore-type={type}
        title={style.tooltip}
        aria-label={style.tooltip}
        className={cn(
          "inline-flex items-center gap-1 rounded-full text-caption font-medium leading-none",
          style.container,
          className,
        )}
        {...rest}
      >
        <Icon className={cn("size-3.5", style.iconColor)} aria-hidden />
        {!iconOnly && <span>{style.label}</span>}
      </span>
    );
  },
);
CreatorBadge.displayName = "CreatorBadge";
