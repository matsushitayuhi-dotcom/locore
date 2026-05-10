'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ArticleCard } from '@locore/ui';
import type { Article } from '../lib/mock';
import { TripAdds } from '../lib/storage/local';
import { addBookmark, removeBookmark } from '../lib/bookmarks/actions';

interface ArticleGridProps {
  articles: Article[];
  hideAuthor?: boolean;
  /**
   * 初期描画時にブックマーク済みとして表示する記事 ID 集合。
   * サーバ側で `getMyBookmarkedIdSet()` を呼んで渡すのが想定。
   * 渡されない場合は空集合扱い（誰もブックマークしていない状態）。
   */
  bookmarkedIds?: Set<string>;
  /**
   * 記事 ID → いいね件数 / ブックマーク件数。サーバ側で
   * `getArticleSocialCounts(articleIds)` を呼んで渡す。
   */
  socialCounts?: Map<string, { likeCount: number; bookmarkCount: number }>;
}

/**
 * area の表示用整形：
 * - 'パリ' そのもの → 'パリ'（重複防止）
 * - 'パリ・マレ' のような既にプレフィックス付き → そのまま
 * - 'マレ（3区）' のようなサブエリアのみ → 'パリ・<sub>'（旧 mock 互換）
 */
function formatArea(area: string): string {
  if (!area) return 'パリ';
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

export function ArticleGrid({
  articles,
  hideAuthor,
  bookmarkedIds,
  socialCounts,
}: ArticleGridProps) {
  const router = useRouter();
  // 楽観的 UI 用のローカル state。サーバから渡された Set を初期値にする。
  const [bookmarked, setBookmarked] = useState<Set<string>>(
    () => new Set(bookmarkedIds ?? []),
  );
  const [, startTransition] = useTransition();

  // bookmarkedIds prop が外から更新された場合（例: 親が再評価）に追随
  useEffect(() => {
    setBookmarked(new Set(bookmarkedIds ?? []));
  }, [bookmarkedIds]);

  if (articles.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-foreground/60">
        条件に合う記事がまだありません。
      </div>
    );
  }

  function handleBookmark(articleId: string) {
    const wasOn = bookmarked.has(articleId);

    // 楽観的 UI：先に見た目を切り替える
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (wasOn) next.delete(articleId);
      else next.add(articleId);
      return next;
    });

    const rollback = () => {
      setBookmarked((prev) => {
        const next = new Set(prev);
        if (wasOn) next.add(articleId);
        else next.delete(articleId);
        return next;
      });
    };

    startTransition(async () => {
      try {
        const res = wasOn
          ? await removeBookmark({ articleId })
          : await addBookmark({ articleId });

        if (res.ok) {
          toast(wasOn ? 'ブックマークを外しました' : 'ブックマークしました');
          return;
        }

        if (res.reason === 'unauthenticated') {
          rollback();
          toast('ログインすると記事を保存できます', {
            action: {
              label: 'ログインする',
              onClick: () => router.push('/auth/login?redirect_to=/library'),
            },
          });
          return;
        }

        // バリデーション or 不明エラー
        rollback();
        toast.error('ブックマーク操作に失敗しました', {
          description: res.message ?? '時間をおいて再度お試しください',
        });
      } catch (err) {
        rollback();
        toast.error('ブックマーク操作に失敗しました', {
          description: err instanceof Error ? err.message : '不明なエラー',
        });
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <ArticleCard
          key={article.id}
          article={toCardModel(article, socialCounts?.get(article.id))}
          hideAuthor={hideAuthor}
          bookmarked={bookmarked.has(article.id)}
          onClick={() => router.push(`/articles/${article.id}`)}
          onBookmark={() => handleBookmark(article.id)}
          onAddToTrip={() => {
            TripAdds.add(article.id);
            toast.success('旅程に追加しました', {
              description: '「旅程」ページから確認できます',
            });
          }}
        />
      ))}
    </div>
  );
}
