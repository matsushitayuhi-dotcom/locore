"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** When true, applies error styling. Pair with aria-invalid for a11y. */
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type ?? "text"}
        data-locore-component="Input"
        data-locore-error={error ? "true" : undefined}
        aria-invalid={error || props["aria-invalid"]}
        className={cn(
          "flex h-11 w-full rounded-sm border bg-neutral-0 px-3",
          "font-sans text-body-md text-neutral-900",
          "placeholder:text-neutral-400",
          "transition-colors duration-fast ease-out",
          "border-neutral-200",
          "focus:outline-none focus:border-primary-700 focus:border-2 focus:px-[11px]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-body-sm file:font-medium",
          error && "border-danger-500 bg-danger-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
