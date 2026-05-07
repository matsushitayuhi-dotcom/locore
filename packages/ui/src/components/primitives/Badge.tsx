import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1",
    "h-6 px-2.5 rounded-full",
    "font-sans text-caption font-semibold leading-none",
    "transition-colors duration-base ease-out",
    "[&_svg]:size-3",
  ].join(" "),
  {
    variants: {
      variant: {
        // default: 薄い emerald
        default: "bg-primary-50 text-primary-700",
        // secondary: 1段濃い emerald（同色相のまま明度で差別化）
        secondary: "bg-primary-100 text-primary-900",
        // accent: ニュートラル背景に primary 文字。インラインのキャプション向け。
        accent: "bg-neutral-50 text-primary-700",
        warning: "bg-warning-50 text-warning-700",
        outline: "bg-white text-primary-700 border border-primary-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span
      ref={ref}
      data-locore-component="Badge"
      data-locore-variant={variant ?? "default"}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  ),
);
Badge.displayName = "Badge";

export { badgeVariants };
