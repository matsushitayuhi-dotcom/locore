import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * Locore Tailwind preset.
 *
 * Consume from apps/web like:
 *   import locorePreset from "@locore/ui/tailwind-preset";
 *   export default { presets: [locorePreset], content: [...] } satisfies Config;
 *
 * The CSS variables referenced below must be loaded via:
 *   import "@locore/ui/styles.css";
 */
const preset: Partial<Config> = {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        neutral: {
          0: "var(--color-neutral-0)",
          25: "var(--color-neutral-25)",
          50: "var(--color-neutral-50)",
          100: "var(--color-neutral-100)",
          200: "var(--color-neutral-200)",
          300: "var(--color-neutral-300)",
          400: "var(--color-neutral-400)",
          500: "var(--color-neutral-500)",
          700: "var(--color-neutral-700)",
          900: "var(--color-neutral-900)",
        },
        primary: {
          50: "var(--color-primary-50)",
          100: "var(--color-primary-100)",
          300: "var(--color-primary-300)",
          500: "var(--color-primary-500)",
          700: "var(--color-primary-700)",
          900: "var(--color-primary-900)",
          DEFAULT: "var(--color-primary-700)",
          foreground: "var(--color-neutral-0)",
        },
        secondary: {
          50: "var(--color-secondary-50)",
          300: "var(--color-secondary-300)",
          500: "var(--color-secondary-500)",
          700: "var(--color-secondary-700)",
          DEFAULT: "var(--color-secondary-500)",
          foreground: "var(--color-neutral-0)",
        },
        accent: {
          50: "var(--color-accent-50)",
          300: "var(--color-accent-300)",
          500: "var(--color-accent-500)",
          700: "var(--color-accent-700)",
          DEFAULT: "var(--color-accent-500)",
          foreground: "var(--color-neutral-0)",
        },
        success: {
          50: "var(--color-success-50)",
          500: "var(--color-success-500)",
        },
        warning: {
          50: "var(--color-warning-50)",
          500: "var(--color-warning-500)",
          700: "var(--color-warning-700)",
        },
        danger: {
          50: "var(--color-danger-50)",
          500: "var(--color-danger-500)",
          DEFAULT: "var(--color-danger-500)",
          foreground: "var(--color-neutral-0)",
        },
        destructive: {
          DEFAULT: "var(--color-danger-500)",
          foreground: "var(--color-neutral-0)",
        },
        info: {
          50: "var(--color-info-50)",
          500: "var(--color-info-500)",
        },
        local: {
          high: "var(--color-local-high)",
          mid: "var(--color-local-mid)",
          low: "var(--color-local-low)",
        },
        // Semantic surface roles
        background: "var(--color-bg)",
        foreground: "var(--color-fg)",
        muted: {
          DEFAULT: "var(--color-surface-muted)",
          foreground: "var(--color-fg-muted)",
        },
        card: {
          DEFAULT: "var(--color-surface)",
          foreground: "var(--color-fg)",
        },
        popover: {
          DEFAULT: "var(--color-surface)",
          foreground: "var(--color-fg)",
        },
        border: "var(--color-border)",
        input: "var(--color-border)",
        ring: "var(--color-ring)",
      },
      fontFamily: {
        sans: ["var(--font-sans-jp)", "var(--font-sans-latin)"],
        serif: ["var(--font-serif-jp)", "var(--font-display)"],
        display: ["var(--font-display)", "var(--font-serif-jp)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        // DESIGN.md §2.2.2 typescale
        "display-2xl": ["56px", { lineHeight: "64px", letterSpacing: "-0.02em" }],
        "display-xl": ["44px", { lineHeight: "52px", letterSpacing: "-0.02em" }],
        "display-lg": ["36px", { lineHeight: "44px", letterSpacing: "-0.01em" }],
        "heading-xl": ["28px", { lineHeight: "36px", letterSpacing: "-0.01em" }],
        "heading-lg": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em" }],
        "heading-md": ["20px", { lineHeight: "28px" }],
        "heading-sm": ["18px", { lineHeight: "26px" }],
        "body-lg": ["17px", { lineHeight: "28px" }],
        "body-md": ["15px", { lineHeight: "26px" }],
        "body-sm": ["14px", { lineHeight: "22px" }],
        caption: ["12px", { lineHeight: "18px", letterSpacing: "0.01em" }],
        overline: ["11px", { lineHeight: "16px", letterSpacing: "0.08em" }],
        "mono-md": ["14px", { lineHeight: "20px" }],
      },
      spacing: {
        0: "var(--space-0)",
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        8: "var(--space-8)",
        10: "var(--space-10)",
        12: "var(--space-12)",
        16: "var(--space-16)",
        20: "var(--space-20)",
        24: "var(--space-24)",
      },
      borderRadius: {
        none: "var(--radius-none)",
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        "in-out": "var(--ease-in-out)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },
      aspectRatio: {
        // DESIGN.md §1.3 — cover images are 3:2, never 16:9
        cover: "3 / 2",
      },
    },
  },
  plugins: [animate],
};

export default preset;
