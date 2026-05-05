"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  // base
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-sans font-medium",
    "rounded-sm",
    "transition-colors duration-base ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "focus-visible:ring-offset-[color:var(--color-bg)]",
    "disabled:opacity-40 disabled:cursor-not-allowed",
    "[&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-primary-700 text-neutral-0 hover:bg-primary-900 active:bg-primary-900",
        secondary:
          "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 active:bg-neutral-200",
        ghost:
          "bg-transparent text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100",
        destructive:
          "bg-danger-500 text-neutral-0 hover:bg-[#9a3a34] active:bg-[#8a342f]",
        outline:
          "bg-transparent text-neutral-900 border border-neutral-300 hover:bg-neutral-50",
        link:
          "bg-transparent text-primary-700 underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-body-sm [&_svg]:size-4",
        md: "h-10 px-4 text-body-sm [&_svg]:size-4",
        lg: "h-[52px] px-6 text-heading-sm [&_svg]:size-5",
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
