// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import nextPlugin from '@next/eslint-plugin-next';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

/**
 * Locore 共有 ESLint flat config（モノレポルート）。
 *
 * Next.js プロジェクト（apps/web）で多用される
 * `// eslint-disable-next-line @next/next/no-img-element` や
 * `jsx-a11y/alt-text` といった disable コメントが効くように、
 * 該当プラグインを flat config に明示的に登録している。
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.cjs',
      '**/*.config.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: {
      '@next/next': nextPlugin,
      'jsx-a11y': jsxA11yPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Next.js 推奨ルール（軽量に warn）。
      // ソース側に // eslint-disable-next-line @next/next/no-img-element
      // が書かれている前提で、明示的に登録するだけにしている。
      '@next/next/no-img-element': 'warn',
      // App Router 専用なので Pages Router 向けの link チェックは無効化
      '@next/next/no-html-link-for-pages': 'off',
      // jsx-a11y で よく出る最低限。alt-text は disable comment が多用されるため
      // ここで明示登録だけしておく。
      'jsx-a11y/alt-text': 'warn',
      // React Hooks の依存配列チェック。disable comment が複数箇所で
      // 使われているのでルールを有効化しておく。
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  prettier,
);
