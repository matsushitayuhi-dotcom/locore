'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { addBookmark, removeBookmark } from '@/lib/bookmarks/actions';

/**
 * 記事の保存（ブックマーク）ボタン。
 *
 * 以前は「旅程を保存」というラベルで旅程記事だけを対象にしていたが、
 * 記事を保存する操作はブックマーク 1 種に統一。記事種別を問わず使う。
 *
 * - 押下で bookmarks テーブルに記録（addBookmark / removeBookmark）
 * - 楽観的 UI でレスポンスを待たずトグル
 * - 保存済みは塗り潰しブックマークアイコンに変化、未保存はアウトライン
 * - 親から initialSaved / initialCount を渡しておくと SSR で正しい初期状態
 *
 * NOTE: コンポーネント名は後方互換のため AddToTripButton のまま。
 *       実体は記事ブックマークボタンとして機能する。
 */
export function AddToTripButton({
  articleId,
  size = 'md',
  initialSaved = false,
  initialCount,
  compact = false,
}: {
  articleId: string;
  size?: 'sm' | 'md' | 'lg';
  initialSaved?: boolean;
  /** 親から渡せばこのボタン内に保存数も表示する */
  initialCount?: number;
  /**
   * 記事詳細のヘッダーなどで使う小型ピル表示。LikeButton と並んだときに
   * 高さ・余白が揃うようにする (h-7 / text-[12px])。アイコンのみ表示。
   */
  compact?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [count, setCount] = useState(initialCount ?? 0);
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    const wasOn = saved;
    setSaved(!wasOn);
    if (initialCount !== undefined) {
      setCount((c) => Math.max(0, c + (wasOn ? -1 : 1)));
    }

    startTransition(async () => {
      try {
        const res = wasOn
          ? await removeBookmark({ articleId })
          : await addBookmark({ articleId });
        if (res.ok) {
          if (wasOn) {
            toast('保存ライブラリから外しました');
          } else {
            toast.success('記事を保存しました', {
              description: '「保存ライブラリ」から見返せます',
              action: {
                label: 'ライブラリを開く',
                onClick: () => router.push('/library'),
              },
            });
          }
          return;
        }

        // 失敗：ロールバック
        setSaved(wasOn);
        if (initialCount !== undefined) {
          setCount((c) => Math.max(0, c + (wasOn ? 1 : -1)));
        }
        if (res.reason === 'unauthenticated') {
          toast('ログインすると保存できます', {
            action: {
              label: 'ログインする',
              onClick: () => router.push('/auth/login?redirect_to=/library'),
            },
          });
        } else {
          toast.error('保存に失敗しました', {
            description: res.message ?? '時間をおいて再度お試しください',
          });
        }
      } catch (err) {
        setSaved(wasOn);
        if (initialCount !== undefined) {
          setCount((c) => Math.max(0, c + (wasOn ? 1 : -1)));
        }
        toast.error('保存に失敗しました', {
          description: err instanceof Error ? err.message : '不明なエラー',
        });
      }
    });
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        aria-pressed={saved}
        aria-label={saved ? '保存済み（クリックで外す）' : '保存する'}
        className={
          'inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold transition ' +
          (saved
            ? 'bg-primary-700 text-white shadow-sm'
            : 'bg-card text-primary-300 ring-1 ring-border hover:bg-primary-500/10')
        }
      >
        {saved ? (
          <BookmarkCheck className="h-3.5 w-3.5" />
        ) : (
          <Bookmark className="h-3.5 w-3.5" />
        )}
        {initialCount !== undefined ? (
          <span className="tabular">{count.toLocaleString('ja-JP')}</span>
        ) : null}
      </button>
    );
  }

  return (
    <Button
      variant={saved ? 'primary' : 'outline'}
      size={size}
      onClick={onClick}
      disabled={isPending}
      aria-pressed={saved}
      aria-label={saved ? '保存済み（クリックで外す）' : '保存する'}
    >
      {saved ? (
        <BookmarkCheck className="mr-1.5 h-4 w-4" />
      ) : (
        <Bookmark className="mr-1.5 h-4 w-4" />
      )}
      <span>{saved ? '保存済み' : '保存'}</span>
      {initialCount !== undefined ? (
        <span className="ml-1.5 tabular text-[12px] opacity-75">
          {count.toLocaleString('ja-JP')}
        </span>
      ) : null}
    </Button>
  );
}
