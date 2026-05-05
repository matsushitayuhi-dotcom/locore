/**
 * Locore color tokens — TypeScript constants mirroring the CSS variables in
 * `src/styles/globals.css` and the Tailwind preset. Use this when JS code
 * needs a concrete HEX (e.g. SVG `fill`, canvas, map styling).
 *
 * Source of truth: DESIGN.md §2.1.
 */

export const neutral = {
  0: "#FFFFFF",
  25: "#FAF8F5",
  50: "#F4F1EB",
  100: "#EAE5DD",
  200: "#D8D2C7",
  300: "#B8B0A2",
  400: "#8A8275",
  500: "#5E574C",
  700: "#3A352D",
  900: "#1A1814",
} as const;

export const primary = {
  50: "#EEF1F8",
  100: "#D5DCEC",
  300: "#7E8DBF",
  500: "#3D4F8C",
  700: "#26356B",
  900: "#141E45",
} as const;

export const secondary = {
  50: "#FBF1EC",
  300: "#D89A7E",
  500: "#B8623F",
  700: "#8A4525",
} as const;

export const accent = {
  50: "#EEF2EA",
  300: "#8FA37A",
  500: "#5E7548",
  700: "#3F5230",
} as const;

export const semantic = {
  success50: "#EAF3EC",
  success500: "#3F8A57",
  warning50: "#FAF1DD",
  warning500: "#C68A2E",
  warning700: "#8A5E1F",
  danger50: "#F8E7E5",
  danger500: "#B8453E",
  info50: "#E5EEF5",
  info500: "#3D6A8A",
} as const;

/**
 * Local score gradient — drives map pins and the LocalScoreBar fill.
 * 70-100 = high (moss), 30-69 = mid (dusty purple), 0-29 = low (terracotta).
 */
export const local = {
  high: "#5E7548",
  mid: "#6B5B8A",
  low: "#B8623F",
} as const;

export const colors = {
  neutral,
  primary,
  secondary,
  accent,
  semantic,
  local,
} as const;

export type ColorTokens = typeof colors;

/** Pick the local-score color for a given 0-100 value. */
export function localScoreColor(value: number): string {
  if (value >= 70) return local.high;
  if (value >= 30) return local.mid;
  return local.low;
}
