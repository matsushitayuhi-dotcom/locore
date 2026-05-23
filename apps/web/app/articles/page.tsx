import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { FeedFilters } from '@/components/FeedFilters';
import { FloatingMapButton } from '@/components/FloatingMapButton';
import { getPublishedDbArticles } from '@/lib/articles/published';
import { getArticleSocialCounts } from '@/lib/articleLikes/actions';
import { getRegionBySlug } from '@/lib/geo/countries';

export const revalidate = 60;

type Props = {
  searchParams?: { type?: string; region?: string };
};

export const metadata = { title: '記事一覧 — Locore' };

/**
 * 記事一覧ページ。
 *
 * - クエリパラメータ:
 *   - `?type=spot_guide` or `?type=itinerary` → FeedFilters の初期タブ
 *   - `?region=paris`   → 地域 slug で絞り込み（地域ホームの「続きを見る」から渡される）
 * - 何も指定なしなら全地域・全タイプ
 */
export default async function ArticlesIndexPage({ searchParams }: Props) {
  const regionSlug = searchParams?.region;
  const articles = await getPublishedDbArticles(200, regionSlug);
  const socialCounts = await getArticleSocialCounts(articles.map((a) => a.id));

  const region = regionSlug ? await getRegionBySlug(regionSlug) : null;
  const regionLabel = region?.nameJa ?? 'フランス';

  const typeParam = searchParams?.type;
  const subtitleByType: Record<string, string> = {
    spot_guide: '1 地点を深掘りした記事。お気に入りスポットを増やすのに最適。',
    itinerary: '半日・1 日かけて辿る、現地民がデザインしたルート。所要時間つき。',
    expat_info: '日用品・行政手続き・医療など、現地で暮らす人のための実用情報。',
  };
  const titleSuffixByType: Record<string, string> = {
    spot_guide: 'のスポット紹介',
    itinerary: 'の旅程プラン',
    expat_info: 'の駐在者情報',
  };
  const heading =
    typeParam && titleSuffixByType[typeParam]
      ? {
          title: `${regionLabel}${titleSuffixByType[typeParam]}`,
          subtitle: subtitleByType[typeParam],
        }
      : {
          title: `${regionLabel}・すべての記事`,
          subtitle: 'タイプを切り替えて絞り込めます。',
        };

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        ホームに戻る
      </Link>

      <header className="mt-4 mb-6">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-500" />
          記事一覧
        </p>
        <h1
          className="mt-2 text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]"
        >
          {heading.title}
        </h1>
        <p className="mt-1 text-[13px] text-foreground/70">{heading.subtitle}</p>
      </header>

      <FeedFilters articles={articles} socialCounts={socialCounts} />

      <FloatingMapButton />
    </main>
  );
}
