import 'server-only';
import { getCountryByCode, type CountryDetail } from './countries';

/**
 * 国別ページ (/[country]/...) の URL スラッグ → 国コード解決。
 *
 * URL は英語国名スラッグ（例: /france）。DB の countries.code は ISO alpha-2
 * lowercase（例: 'fr'）。当面はフランスのみ対応。国を増やすときはこのマップに
 * 1 行追加するだけでよい。
 */
const SLUG_TO_CODE: Record<string, string> = {
  france: 'fr',
};

/** 対応している国スラッグ一覧（generateStaticParams 用）。 */
export const SUPPORTED_COUNTRY_SLUGS = Object.keys(SLUG_TO_CODE);

/** スラッグから国情報を解決。未対応スラッグや該当国なしなら null。 */
export async function getCountryBySlug(
  slug: string,
): Promise<CountryDetail | null> {
  const code = SLUG_TO_CODE[slug.toLowerCase()];
  if (!code) return null;
  return getCountryByCode(code);
}
