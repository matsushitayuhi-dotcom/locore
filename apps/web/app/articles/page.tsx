import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { FeedFilters } from '@/components/FeedFilters';
import { FloatingMapButton } from '@/components/FloatingMapButton';
import { getPublishedDbArticles } from '@/lib/articles/published';
import { getArticleSocialCounts } from '@/lib/articleLikes/actions';

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

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-4 sm:px-6 sm:py-8">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          ホーム
        </Link>
        {/* aria 用に sr-only の H1 を残す（SEO / a11y のため） */}
        <h1 className="sr-only">記事一覧</h1>
      </div>

      <FeedFilters articles={articles} socialCounts={socialCounts} />

      <FloatingMapButton />
    </main>
  );
}
