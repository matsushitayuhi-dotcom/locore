import { FloatingMapButton } from '@/components/FloatingMapButton';
import { ArticleJournal } from '@/components/articles/ArticleJournal';
import { getPublishedDbArticles } from '@/lib/articles/published';
import { SUPPORTED_COUNTRIES } from '@/lib/geo/countrySlug';
import type { ArticleType } from '@/lib/mock';

export const revalidate = 60;

type Props = {
  searchParams?: { type?: string; region?: string; country?: string };
};

export const metadata = { title: '記事一覧 — Locore' };

const VALID_TYPES: ArticleType[] = ['spot_guide', 'itinerary', 'expat_info'];
const VALID_COUNTRY_CODES = new Set(SUPPORTED_COUNTRIES.map((c) => c.code));

function asCat(type: string | undefined): 'all' | ArticleType {
  return type && (VALID_TYPES as string[]).includes(type)
    ? (type as ArticleType)
    : 'all';
}
function asCountry(code: string | undefined): string {
  return code && VALID_COUNTRY_CODES.has(code) ? code : 'all';
}

/**
 * 記事一覧（全地域・全国）。国・カテゴリ・検索の絞り込みは ArticleJournal が
 * クライアント側で即時に行う。
 *
 * - `?country=fr` → 国の初期フィルタ（/[country] ハブからの導線）
 * - `?type=spot_guide` 等 → 初期カテゴリ
 * - `?region=paris` → 地域 slug でサーバー側の事前絞り込み
 */
export default async function ArticlesIndexPage({ searchParams }: Props) {
  const regionSlug = searchParams?.region;
  const articles = await getPublishedDbArticles(200, regionSlug);

  return (
    <main>
      <h1 className="sr-only">記事一覧</h1>
      <ArticleJournal
        articles={articles}
        countries={SUPPORTED_COUNTRIES}
        initialCountry={asCountry(searchParams?.country)}
        initialCat={asCat(searchParams?.type)}
      />
      <FloatingMapButton />
    </main>
  );
}
