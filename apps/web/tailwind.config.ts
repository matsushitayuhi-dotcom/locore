import type { Config } from 'tailwindcss';

/**
 * Tailwind 設定。
 * デザイントークンは別途 DESIGN.md に従い `theme.extend` 配下に集約する想定。
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './i18n/**/*.{ts,tsx}',
    // 後で @locore/ui を組み込むときに有効化:
    // '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
