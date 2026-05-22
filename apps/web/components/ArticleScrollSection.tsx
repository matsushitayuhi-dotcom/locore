'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { ArticleCard } from '@locore/ui';
import type { Article } from '../lib/mock';

/**
 * ホームでスポット紹介 / 旅程プランをそれぞれ 1 行で並べるセクション。
 *
 * - モバイル: 横スクロール（snap-x）で 1 行
 * - sm 以上: 4〜6 列のグリッド（FeedFilters と同じ密度感）
 * - 末尾 or タイトル横に「続きを見る → /articles?type=...」
 *
 * ※ ブックマーク機能は付けない（ホームの一覧は閲覧優先、操作系はカード詳細で）。
 *   ArticleGrid と違って Server Component で渡せる軽量版にする。
 */

type Props = {
  articles: Article[];
  /** 「続きを見る」リンク先 */
  moreHref: string;
  /** 何件まで描画するか（既定 10） */
  limit?: number;
  socialCounts?: Map<string, { likeCount: number; bookmarkCount: number }>;
};

function formatArea(area: string): string {
  if (!area) return 'パリ';
  if (area.includes('・')) return area;
  if (area === 'パリ' || area.startsWith('パリ')) return area;
  return `パリ・${area}`;
}

function toCardModel(
  article: Article,
  counts?: { likeCount?: number; bookmarkCount?: number },
) {
  return {
    id: article.id,
    title: article.title,
    coverImageUrl: article.coverImageUrl,
    area: formatArea(article.area),
    author: {
      name: article.writerName ?? '匿名',
      tier: (article.writerTier ?? 'B') as 'S' | 'A' | 'B',
      residencyYears: article.writerYears,
      avatarUrl: article.writerAvatarUrl ?? undefined,
    },
    localScore: article.localScoreAverage,
    satisfactionStars: article.satisfactionAverage,
    reviewCount: article.reviewCount,
    priceJpy: article.priceJpy,
    durationType: article.durationType,
    spotsCount: article.spotIds.length,
    articleType: article.articleType,
    likeCount: counts?.likeCount,
    bookmarkCount: counts?.bookmarkCount,
  };
}

export function ArticleScrollSection({
  articles,
  moreHref,
  limit = 10,
  socialCounts,
}: Props) {
  const router = useRouter();
  const sliced = articles.slice(0, limit);

  if (sliced.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card px-6 py-10 text-center text-[13px] text-foreground/55">
        該当する記事がまだありません。
      </div>
    );
  }

  return (
    <div>
      <div
        className={
          'flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain -mx-4 px-4 pb-2 scrollbar-thin ' +
          'sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0 ' +
          'md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
        }
        // 横スワイプ時に縦方向の慣性スクロールが入らないように pan-x で限定
        style={{ touchAction: 'pan-x' }}
      >
        {sliced.map((article) => (
          <div
            key={article.id}
            className="w-[42vw] shrink-0 snap-start sm:w-auto sm:shrink"
          >
            <ArticleCard
              article={toCardModel(article, socialCounts?.get(article.id))}
              onClick={() => router.push(`/articles/${article.id}`)}
            />
          </div>
        ))}

      </div>

      {/* 中央の控えめな「→」だけの円形 CTA。sm 以上で表示。
          スマホは横スクロールで自然に最後まで見えるので CTA を出さない。 */}
      <div className="mt-5 hidden sm:flex sm:justify-center">
        <Link
          href={moreHref}
          aria-label="もっと見る"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-card text-primary-300 ring-1 ring-border transition hover:bg-primary-500/10 hover:ring-primary-300"
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
