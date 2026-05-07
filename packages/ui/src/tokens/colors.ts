/**
 * Locore color tokens — TypeScript constants mirroring the CSS variables in
 * `src/styles/globals.css` and the Tailwind preset. Use this when JS code
 * needs a concrete HEX (e.g. SVG `fill`, canvas, map styling).
 *
 * Bright / Pop / Emerald edition.
 */

export const neutral = {
  0: "#FFFFFF",
  25: "#F8FBF9",
  50: "#F1F6F3",
  100: "#E3EBE7",
  200: "#CDD8D2",
  300: "#A8B6AF",
  400: "#7C8C84",
  500: "#51625A",
  700: "#2F3D36",
  900: "#16201C",
} as const;

/** Primary: Emerald */
export const primary = {
  50:  "#E6F7EF",
  100: "#C0ECD6",
  300: "#54C79A",
  500: "#14A37C",
  700: "#0D7A5C",
  900: "#06432F",
} as const;

/** Secondary: Coral / Peach (CTA / 価格) */
export const secondary = {
  50:  "#FFF0EC",
  300: "#FFA58C",
  500: "#FF7A59",
  700: "#C24A2C",
} as const;

/** Accent: Sun (注意・ハイライト) */
export const accent = {
  50:  "#FFF8DE",
  300: "#FFDF6B",
  500: "#F4B400",
  700: "#B87F00",
} as const;

export const semantic = {
  success50: "#E7FAEC",
  success500: "#21B85A",
  warning50: "#FFF3D6",
  warning500: "#F4A300",
  warning700: "#A86B00",
  danger50: "#FDE4E1",
  danger500: "#E8514A",
  info50: "#E1F0FF",
  info500: "#2F86D6",
} as const;

/**
 * Local score gradient — drives map pins and the LocalScoreBar fill.
 * 70-100 = emerald (high local), 30-69 = sun (mid), 0-29 = coral (tourist).
 */
export const local = {
  high: "#14A37C",
  mid: "#F4B400",
  low: "#FF7A59",
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
