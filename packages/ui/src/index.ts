// Public surface for @locore/ui.
// Apps consume primitives + locore-specific components from a single entry,
// while the Tailwind preset and the styles file are exposed via subpath
// exports declared in package.json (`@locore/ui/tailwind-preset`,
// `@locore/ui/styles.css`).

// --- Primitives (shadcn-style) ---
export * from "./components/primitives";

// --- Locore-specific compounds ---
export * from "./components/locore";

// --- Utilities ---
export { cn, formatJpy, clamp } from "./lib/utils";

// --- Tokens (HEX constants for canvas / SVG / map styling) ---
export * as tokens from "./tokens";
export {
  colors,
  neutral,
  primary,
  secondary,
  accent,
  semantic,
  local,
  localScoreColor,
  spacing,
  radii,
  shadows,
  fontFamilies,
  typeScale,
  type ColorTokens,
  type FontStep,
  type TypeScaleKey,
  type SpacingKey,
  type RadiusKey,
  type ShadowKey,
} from "./tokens";

// --- Icons ---
export * as icons from "./icons";
