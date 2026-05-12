import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { FeedFilters } from '@/components/FeedFilters';
import { getPublishedDbArticles } from '@/lib/articles/published';
import { getArticleSocialCounts } from '@/lib/articleLikes/actions';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams?: { type?: string };
};

export const metadata = { title: '記事一覧 — Locore' };

/**
 * 記事一覧ページ。
 *
 * - クエリパラメータ `?type=spot_guide` or `?type=itinerary` でデフォルト絞り込み
 * - FeedFilters が searchParams を読んでタブを初期化する作りなのでそのまま渡せばよい
 * - ホームの「スポット 10 件 / 旅程 10 件」横スクロールから「続きを見る」で
 *   ここに遷移してきたユーザーに、全件 + 詳細フィルタを提供する
 */
export default async function ArticlesIndexPage({ searchParams }: Props) {
  const articles = await getPublishedDbArticles(200);
  const socialCounts = await getArticleSocialCounts(articles.map((a) => a.id));

  const typeParam = searchParams?.type;
  const titleByType: Record<string, { title: string; subtitle: string }> = {
    spot_guide: {
      title: 'パリ・スポット紹介',
      subtitle: '1 地点を深掘りした記事。お気に入りスポットを増やすのに最適。',
    },
    itinerary: {
      title: 'パリ・旅程プラン',
      subtitle:
        '半日・1 日かけて辿る、現地民がデザインしたルート。所要時間つき。',
    },
  };
  const heading = typeParam && titleByType[typeParam]
    ? titleByType[typeParam]
    : { title: 'パリ・すべての記事', subtitle: 'タイプを切り替えて絞り込めます。' };

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
          style={{
            fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
          }}
        >
          {heading.title}
        </h1>
        <p className="mt-1 text-[13px] text-foreground/70">{heading.subtitle}</p>
      </header>

      <FeedFilters articles={articles} socialCounts={socialCounts} />
    </main>
  );
}
