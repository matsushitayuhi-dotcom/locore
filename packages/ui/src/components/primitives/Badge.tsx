import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1",
    // h-5 固定なので折り返すとピルからはみ出す。日本語は 1 文字ずつ改行できるため
    // 狭い横並びで縦一列に潰れるのも防ぐ
    "h-5 px-2 rounded-full whitespace-nowrap",
    // 10px は実機（iPhone 402px / 320px）で読めないのでスマホだけ 11px に上げ、
    // PC は sm: で従来どおり 10px に戻す
    "font-sans text-[11px] sm:text-[10px] font-semibold leading-none",
    "transition-colors duration-base ease-out",
    "[&_svg]:size-2.5 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // default: 薄い amber
        default: "bg-primary-500/15 text-primary-300",
        // secondary: ややニュートラルなチップ
        secondary: "bg-muted text-foreground/80",
        // accent: アクセント色（重要バッジ向け）
        accent: "bg-primary-500 text-neutral-950",
        warning: "bg-warning-500/15 text-warning-500",
        outline: "bg-transparent text-foreground/80 border border-border",
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
