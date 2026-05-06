import Link from 'next/link';
import { Button } from '@locore/ui';
import { Bookmark } from 'lucide-react';
import { requireUser } from '@/lib/auth/require-user';
import { listMyBookmarks } from '@/lib/bookmarks/actions';
import { ArticleGrid } from '@/components/ArticleGrid';
import { getArticle } from '@/lib/mock';
import type { Article } from '@/lib/mock';

export const metadata = {
  title: '保存した記事',
  description: 'あとで読みたい・行きたい記事を保存しておけるライブラリ',
};

// 認証ユーザー依存・DB アクセスがあるため常に動的レンダリング
export const dynamic = 'force-dynamic';

/**
 * ライブラリページ — ログインユーザーが保存した記事の一覧。
 *
 * - 未ログインなら `/auth/login?next=/library` にリダイレクト
 * - DB 上の bookmarks をベースに、対応する記事メタを mock から解決して ArticleGrid で表示
 *   （プロト時点では mock の記事 ID は UUID ではないので実体マッピングは限定的）
 */
export default async function LibraryPage() {
  // 未ログインなら /auth/login?redirect_to=/library にリダイレクト
  await requireUser('/library');

  const bookmarks = await listMyBookmarks();

  // bookmarks.created_at の並び（DESC）を保ったまま、対応する mock 記事を解決
  const items: Article[] = bookmarks
    .map((b) => getArticle(b.articleId))
    .filter((a): a is Article => Boolean(a));

  const totalCount = bookmarks.length;
  const renderedCount = items.length;

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/60">
              <Bookmark className="h-3 w-3" />
              Library
            </p>
            <h1
              className="text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]"
              style={{
                fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
              }}
            >
              保存した記事
            </h1>
            <p className="mt-2 text-[13px] text-foreground/60">
              あとで読みたい記事や、行ってみたい街を保存しておけます。
              {totalCount > 0 ? (
                <>
                  {' '}
                  <span className="tabular text-foreground/80">{totalCount}</span> 件
                  {totalCount !== renderedCount ? (
                    <span className="ml-1 text-foreground/50">
                      （表示可能 {renderedCount} 件）
                    </span>
                  ) : null}
                </>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="outline" size="sm">
                フィードに戻る
              </Button>
            </Link>
          </div>
        </header>

        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <ArticleGrid articles={items} bookmarkedIds={new Set(items.map((a) => a.id))} />
        )}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
      <Bookmark className="mx-auto h-8 w-8 text-foreground/30" />
      <p
        className="mt-4 text-[18px] font-semibold tracking-tight"
        style={{
          fontFamily: 'var(--font-serif-jp), var(--font-serif), serif',
        }}
      >
        まだ保存した記事がありません
      </p>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-foreground/60">
        記事カードのブックマークボタンを押すと、ここにまとめられます。
        あとで読みたい記事や、行ってみたい街を集めましょう。
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/">
          <Button variant="primary" size="sm">
            フィードを見る
          </Button>
        </Link>
        <Link href="/light-diaries">
          <Button variant="outline" size="sm">
            ライト旅行記
          </Button>
        </Link>
      </div>
    </div>
  );
}
