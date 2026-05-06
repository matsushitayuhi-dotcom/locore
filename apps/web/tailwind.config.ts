import type { Config } from 'tailwindcss';
import locorePreset from '@locore/ui/tailwind-preset';

const config: Config = {
  presets: [locorePreset],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './i18n/**/*.{ts,tsx}',
    '../../packages/ui/dist/**/*.{js,mjs}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Override the preset to wire next/font CSS variables.
        sans: [
          'var(--font-sans-jp)',
          'var(--font-sans)',
          'system-ui',
          'sans-serif',
        ],
        serif: [
          'var(--font-serif-jp)',
          'var(--font-serif)',
          'Georgia',
          'serif',
        ],
        display: ['var(--font-serif)', 'var(--font-serif-jp)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
