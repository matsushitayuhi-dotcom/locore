'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ArticleCard } from '@locore/ui';
import type { Article } from '../lib/mock';
import { TripAdds } from '../lib/storage/local';
import { addBookmark, removeBookmark } from '../lib/bookmarks/actions';
import type { BookmarkFolderSummary } from '../lib/bookmarks/actions';
import { BookmarkFolderDialog } from './bookmarks/BookmarkFolderDialog';

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
  /**
   * 自分のブックマークフォルダ一覧。渡されたら、ブックマーク追加時に
   * フォルダ選択ダイアログを開く。空配列なら「未分類のみ」扱いだが
   * 「新しいフォルダを作る」UI は提供する。
   */
  bookmarkFolders?: BookmarkFolderSummary[];
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
  bookmarkFolders,
}: ArticleGridProps) {
  const router = useRouter();
  // 楽観的 UI 用のローカル state。サーバから渡された Set を初期値にする。
  const [bookmarked, setBookmarked] = useState<Set<string>>(
    () => new Set(bookmarkedIds ?? []),
  );
  const [, startTransition] = useTransition();
  // フォルダ選択ダイアログの対象記事
  const [pickerArticleId, setPickerArticleId] = useState<string | null>(null);

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
          if (wasOn) {
            toast('ブックマークを外しました');
          } else if (bookmarkFolders) {
            // 追加直後にフォルダ選択ダイアログを開く（未分類のままが嫌な人向け）
            toast.success('ブックマークしました', {
              action: {
                label: 'フォルダを選ぶ',
                onClick: () => setPickerArticleId(articleId),
              },
            });
          } else {
            toast('ブックマークしました');
          }
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

  const pickerArticle =
    pickerArticleId != null
      ? articles.find((a) => a.id === pickerArticleId)
      : null;

  return (
    <>
      {/*
        高密度レイアウト:
        - モバイル (< sm): 横スクロール + scroll-snap、1 枚 ≒ 42vw（2.3 枚見える）
        - sm: 3 列グリッド
        - md: 4 列
        - xl: 5 列
        - 2xl: 6 列
      */}
      <div
        className={
          // モバイル横スクロール
          'flex snap-x snap-mandatory gap-3 overflow-x-auto -mx-4 px-4 pb-2 scrollbar-thin ' +
          // sm+ で grid に切り替え
          'sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0 ' +
          'md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
        }
      >
        {articles.map((article) => (
          <div
            key={article.id}
            // モバイル: w-[42vw] で 2.3 枚見える、snap-start で吸着
            className="w-[42vw] shrink-0 snap-start sm:w-auto sm:shrink"
          >
            <ArticleCard
              article={toCardModel(article, socialCounts?.get(article.id))}
              hideAuthor={hideAuthor}
              bookmarked={bookmarked.has(article.id)}
              onClick={() => router.push(`/articles/${article.id}`)}
              onBookmark={() => handleBookmark(article.id)}
              // 「+ 旅程」ボタンはフィード / ライブラリでは出さない（記事詳細ページに集約）
            />
          </div>
        ))}
      </div>

      {bookmarkFolders ? (
        <BookmarkFolderDialog
          articleId={pickerArticleId}
          articleTitle={pickerArticle?.title}
          initialFolders={bookmarkFolders}
          onClose={() => setPickerArticleId(null)}
        />
      ) : null}
    </>
  );
}
