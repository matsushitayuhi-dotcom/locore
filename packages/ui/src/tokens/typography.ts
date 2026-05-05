/**
 * Locore typography tokens. Mirrors DESIGN.md §2.2.
 */

export const fontFamilies = {
  sansJp: '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif',
  serifJp: '"Noto Serif JP", "Yu Mincho", "Hiragino Mincho ProN", serif',
  sansLatin: '"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  display: '"Fraunces", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
} as const;

export type FontStep = {
  /** font-size in px */
  size: number;
  /** line-height in px */
  lineHeight: number;
  /** letter-spacing as em (0 = normal) */
  letterSpacing?: number;
};

export const typeScale = {
  "display-2xl": { size: 56, lineHeight: 64, letterSpacing: -0.02 },
  "display-xl": { size: 44, lineHeight: 52, letterSpacing: -0.02 },
  "display-lg": { size: 36, lineHeight: 44, letterSpacing: -0.01 },
  "heading-xl": { size: 28, lineHeight: 36, letterSpacing: -0.01 },
  "heading-lg": { size: 24, lineHeight: 32, letterSpacing: -0.01 },
  "heading-md": { size: 20, lineHeight: 28 },
  "heading-sm": { size: 18, lineHeight: 26 },
  "body-lg": { size: 17, lineHeight: 28 },
  "body-md": { size: 15, lineHeight: 26 },
  "body-sm": { size: 14, lineHeight: 22 },
  caption: { size: 12, lineHeight: 18, letterSpacing: 0.01 },
  overline: { size: 11, lineHeight: 16, letterSpacing: 0.08 },
  "mono-md": { size: 14, lineHeight: 20 },
} as const satisfies Record<string, FontStep>;

export type TypeScaleKey = keyof typeof typeScale;
