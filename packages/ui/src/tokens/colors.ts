/**
 * Locore color tokens — TypeScript constants mirroring the CSS variables in
 * `src/styles/globals.css` and the Tailwind preset.
 *
 * Emerald Mono palette: 全部 emerald 色相の濃淡で揃え、コーラル / 黄色のような
 * 別系統色を使わない。CTA の差は明度（primary / secondary / accent）で出す。
 */

export const neutral = {
  0:   "#FFFFFF",
  25:  "#F8FBF9",
  50:  "#F1F6F3",
  100: "#E3EBE7",
  200: "#CDD8D2",
  300: "#A8B6AF",
  400: "#7C8C84",
  500: "#51625A",
  700: "#2F3D36",
  900: "#16201C",
} as const;

/** Primary: Emerald（メイン CTA / リンク / アクティブ強調） */
export const primary = {
  50:  "#E6F7EF",
  100: "#C6ECD9",
  200: "#95DAB8",
  300: "#54C79A",
  500: "#14A37C",
  700: "#0D7A5C",
  900: "#06432F",
} as const;

/** Secondary: 同じ emerald 系の深い側（"もう一歩濃い" CTA） */
export const secondary = {
  50:  "#D8EFE2",
  300: "#2C8A6D",
  500: "#0D7A5C",
  700: "#06432F",
} as const;

/** Accent: 同じ emerald 系の淡い側（ハイライト / 下線 / 控えめ pill） */
export const accent = {
  50:  "#ECF9F3",
  300: "#95DAB8",
  500: "#54C79A",
  700: "#14A37C",
} as const;

export const semantic = {
  success50: "#E7FAEC",
  success500: "#14A37C",
  warning50: "#FDF3DA",
  warning500: "#B8860B",
  warning700: "#7A5800",
  danger50: "#FBE6E3",
  danger500: "#C0463F",
  info50: "#E1ECEC",
  info500: "#3D7A78",
} as const;

/**
 * Local score gradient — Editorial Light の落ち着いたアース系で 3 段に分ける。
 * 70-100 = 深い asphalt brown, 30-69 = 中間 warm taupe, 0-29 = 淡いベージュ
 *
 * 以前は emerald 緑だった → terra-cotta(#B5453A) は赤すぎた、
 * という履歴を経て、彩度を抑えた茶系に落ち着かせた。
 */
export const local = {
  high: "#7A4A33", // 深いブラウン（炒り立てコーヒー寄り）
  mid:  "#B58563", // ウォーム・トープ（落ち着いたキャメル）
  low:  "#E8D9C2", // ソフトベージュ
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
