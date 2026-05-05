import { getRequestConfig } from 'next-intl/server';

/**
 * next-intl のリクエスト時設定。
 * Phase 1 は日本語のみ運用。Phase 3 で英語などを追加する。
 */
export const DEFAULT_LOCALE = 'ja' as const;
export const SUPPORTED_LOCALES = ['ja'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export default getRequestConfig(async () => {
  const locale: AppLocale = DEFAULT_LOCALE;
  const messages = (await import(`../messages/${locale}.json`)).default;
  return {
    locale,
    messages,
    now: new Date(),
  };
});
