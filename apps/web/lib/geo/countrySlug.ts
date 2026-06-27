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

/**
 * 既知スラッグの最小限の国情報（フォールバック）。
 *
 * 国別ページは revalidate + generateStaticParams で「ビルド時」に静的生成される。
 * このとき getCountryByCode は DB を引くが、ビルド環境で DB に到達できないと
 * null を返し、ページが notFound()（= 404 を静的に焼き込み）になってしまう。
 * 一度 404 を焼くと revalidate ウィンドウのあいだ 404 が固定され、ランタイムで
 * DB が復活しても 404 のままになる。
 *
 * 「対応している国かどうか」は SLUG_TO_CODE で確定しているので、DB 不通は
 * 「ページを出さない理由」にはならない。DB が引けたらリッチな情報（regions・
 * heroImageUrl 等）を使い、引けなければこの最小情報で必ずページを描画する。
 * 記事・サービス・掲示板など DB 依存の中身は空表示にフォールバックし、
 * revalidate 後のランタイム再生成で実データが埋まる。
 */
const FALLBACK_COUNTRY: Record<string, CountryDetail> = {
  fr: {
    code: 'fr',
    nameJa: 'フランス',
    nameEn: 'France',
    continent: 'Europe',
    status: 'active',
    emoji: '🇫🇷',
    heroImageUrl: null,
    shortDescription: null,
    regions: [],
  },
};

/** 対応している国スラッグ一覧（generateStaticParams 用）。 */
export const SUPPORTED_COUNTRY_SLUGS = Object.keys(SLUG_TO_CODE);

/**
 * 一覧ページの国フィルタ用の軽量メタ（クライアントへ渡せる静的データ）。
 * 国を増やすときは SLUG_TO_CODE とここに 1 行ずつ足す。
 */
export const SUPPORTED_COUNTRIES: {
  slug: string;
  code: string;
  nameJa: string;
  emoji: string;
}[] = [{ slug: 'france', code: 'fr', nameJa: 'フランス', emoji: '🇫🇷' }];

/** スラッグ → 国コード（リダイレクト等で使用）。未対応は null。 */
export function codeFromSlug(slug: string): string | null {
  return SLUG_TO_CODE[slug.toLowerCase()] ?? null;
}

/** ?country= の値を検証。対応国コードならそのまま、未対応/未指定は undefined。 */
export function resolveCountryCode(
  code: string | undefined | null,
): string | undefined {
  return code && SUPPORTED_COUNTRIES.some((c) => c.code === code)
    ? code
    : undefined;
}

/**
 * スラッグから国情報を解決。未対応スラッグなら null（= 正当な 404）。
 * 対応スラッグなら DB を優先し、DB 不通時は最小フォールバックを返す
 * （対応国を DB 都合で 404 にしないため）。
 */
export async function getCountryBySlug(
  slug: string,
): Promise<CountryDetail | null> {
  const code = SLUG_TO_CODE[slug.toLowerCase()];
  if (!code) return null;
  const fromDb = await getCountryByCode(code);
  return fromDb ?? FALLBACK_COUNTRY[code] ?? null;
}
