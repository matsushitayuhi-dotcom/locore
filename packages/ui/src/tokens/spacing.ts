/**
 * Locore spacing scale (4px base). Mirrors DESIGN.md §2.3.
 * Values are expressed in px to make canvas / SVG math straightforward.
 */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export type SpacingKey = keyof typeof spacing;

export const radii = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export type RadiusKey = keyof typeof radii;

export const shadows = {
  xs: "0 1px 2px rgba(26, 24, 20, 0.04)",
  sm: "0 2px 8px rgba(26, 24, 20, 0.06)",
  md: "0 4px 16px rgba(26, 24, 20, 0.08)",
  lg: "0 12px 32px rgba(26, 24, 20, 0.12)",
} as const;

export type ShadowKey = keyof typeof shadows;
