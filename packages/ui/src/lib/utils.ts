import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names. Combines clsx + tailwind-merge so that
 * conditional classes resolve cleanly without conflicting utilities.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format an integer JPY amount as `¥1,234`. Negative amounts are prefixed
 * with a minus sign in front of the symbol (`-¥1,234`).
 */
export function formatJpy(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(amount));
  return `${sign}¥${abs.toLocaleString("ja-JP")}`;
}

/** Clamp a number to the [min, max] range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
