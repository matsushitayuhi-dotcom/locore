import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { FloatingMapButton } from '@/components/FloatingMapButton';
import { ArticleJournal } from '@/components/articles/ArticleJournal';
import { getPublishedDbArticles } from '@/lib/articles/published';
import type { ArticleType } from '@/lib/mock';

export const revalidate = 60;

type Props = {
  searchParams?: { type?: string; region?: string };
};

export const metadata = { title: '記事一覧 — Locore' };

const VALID_TYPES: ArticleType[] = ['spot_guide', 'itinerary', 'expat_info'];

function asCat(type: string | undefined): 'all' | ArticleType {
  return type && (VALID_TYPES as string[]).includes(type)
    ? (type as ArticleType)
    : 'all';
}

/**
 * 記事一覧ページ（全地域）。国別 (/[country]/articles) と同じ ArticleJournal
 * レイアウトに統一。
 *
 * - `?region=paris` → 地域 slug で絞り込み（地域ホームの「続きを見る」から）
 * - `?type=spot_guide` 等 → 初期カテゴリ
 * - 全件をその場で表示するため「もっと読む」は出さない
 */
export default async function ArticlesIndexPage({ searchParams }: Props) {
  const regionSlug = searchParams?.region;
  const articles = await getPublishedDbArticles(200, regionSlug);

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 font-mono text-[12px] font-medium text-primary-700 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          ホーム
        </Link>
        <h1 className="sr-only">記事一覧</h1>
      </div>

      <ArticleJournal articles={articles} initialCat={asCat(searchParams?.type)} />

      <FloatingMapButton />
    </main>
  );
}
