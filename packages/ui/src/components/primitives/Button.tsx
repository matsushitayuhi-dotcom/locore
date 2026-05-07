"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  // base — ポップに丸める + 軽い「飛び出し」シャドウ + hover でふわっと持ち上がる
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-sans font-semibold",
    "rounded-full",
    "transition-all duration-base ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "focus-visible:ring-offset-[color:var(--color-bg)]",
    "disabled:opacity-40 disabled:cursor-not-allowed",
    "[&_svg]:shrink-0",
    "active:scale-[0.97]",
  ].join(" "),
  {
    variants: {
      variant: {
        // primary: emerald グラデ + emerald 影 + hover で持ち上がる
        primary: [
          "text-white shadow-sm",
          "bg-gradient-to-br from-primary-500 to-primary-700",
          "hover:from-primary-300 hover:to-primary-500 hover:-translate-y-0.5 hover:shadow-md",
          "active:translate-y-0",
        ].join(" "),
        // secondary: coral 系（CTA に程よくアクセント）
        secondary: [
          "text-white shadow-sm",
          "bg-gradient-to-br from-secondary-500 to-secondary-700",
          "hover:from-secondary-300 hover:to-secondary-500 hover:-translate-y-0.5 hover:shadow-md",
        ].join(" "),
        // accent: sun 黄（注目度のあるサブ CTA）
        accent: [
          "text-neutral-900 shadow-sm",
          "bg-gradient-to-br from-accent-300 to-accent-500",
          "hover:-translate-y-0.5 hover:shadow-md",
        ].join(" "),
        // ghost: 透明 → emerald 50 の優しい hover
        ghost:
          "bg-transparent text-neutral-700 hover:bg-primary-50 hover:text-primary-700",
        // outline: emerald 枠 + 中身白、hover で薄 emerald 塗り
        outline: [
          "bg-white text-primary-700 border border-primary-300",
          "hover:bg-primary-50 hover:border-primary-500 hover:-translate-y-0.5 hover:shadow-sm",
        ].join(" "),
        destructive: [
          "text-white shadow-sm",
          "bg-gradient-to-br from-danger-500 to-[#c2403a]",
          "hover:-translate-y-0.5 hover:shadow-md",
        ].join(" "),
        link:
          "bg-transparent text-primary-700 underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        sm: "h-8 px-4 text-body-sm [&_svg]:size-4",
        md: "h-11 px-5 text-body-md [&_svg]:size-4",
        lg: "h-[54px] px-7 text-heading-sm [&_svg]:size-5",
        icon: "h-10 w-10 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type ?? "button"}
        data-locore-component="Button"
        data-locore-variant={variant ?? "primary"}
        data-locore-size={size ?? "md"}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
