'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, Trash2, Loader2 } from 'lucide-react';
import {
  publishArticle,
  unpublishArticle,
  softDeleteArticle,
  type ArticleActionResult,
} from './actions';

/**
 * 記事行に並べる「公開 / 非公開 / 削除」操作ボタン群。
 *
 * - status に応じて出すボタンを切り替える
 *   - published → 「非公開」ボタン
 *   - それ以外  → 「公開」ボタン
 * - 削除は常に表示、ただしブラウザ confirm で 2-step
 * - 実行中は対象ボタンに spinner、結果をトースト表示
 */
type Status = 'draft' | 'pending_review' | 'published' | 'archived';

type Props = {
  articleId: string;
  articleTitle: string;
  status: Status;
};

export function ArticleAdminActions({ articleId, articleTitle, status }: Props) {
  const [isPending, startTransition] = useTransition();
  /** 押下中のボタン種別。スピナー切替用 */
  const [activeAction, setActiveAction] = useState<
    'publish' | 'unpublish' | 'delete' | null
  >(null);

  const run = (
    action: 'publish' | 'unpublish' | 'delete',
    fn: () => Promise<ArticleActionResult>,
  ) => {
    setActiveAction(action);
    startTransition(async () => {
      try {
        const res = await fn();
        if (res.ok) {
          toast.success(res.message ?? '更新しました');
        } else {
          toast.error(res.error);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '操作失敗');
      } finally {
        setActiveAction(null);
      }
    });
  };

  const onPublish = () =>
    run('publish', () => publishArticle({ id: articleId }));

  const onUnpublish = () => {
    if (
      !window.confirm(
        `「${articleTitle}」を非公開にしますか？\n\n` +
          '一覧からは消えますが、既に購入したユーザーは引き続き読めます。',
      )
    )
      return;
    run('unpublish', () => unpublishArticle({ id: articleId }));
  };

  const onDelete = () => {
    if (
      !window.confirm(
        `「${articleTitle}」を削除しますか？\n\n` +
          'サイトの全画面から消え、復活には Supabase Studio での手動操作が必要です。\n' +
          '※ 購入履歴はそのまま残ります (FK のため物理削除はされません)。',
      )
    )
      return;
    run('delete', () => softDeleteArticle({ id: articleId }));
  };

  const isPublished = status === 'published';

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {isPublished ? (
        <button
          type="button"
          onClick={onUnpublish}
          disabled={isPending}
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-500/10 disabled:opacity-50"
          aria-label="非公開にする"
          title="非公開にする"
        >
          {activeAction === 'unpublish' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
          <span className="hidden sm:inline">非公開</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onPublish}
          disabled={isPending}
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-success-500 transition hover:bg-success-500/10 disabled:opacity-50"
          aria-label="公開する"
          title="公開する"
        >
          {activeAction === 'publish' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
          <span className="hidden sm:inline">公開</span>
        </button>
      )}

      <button
        type="button"
        onClick={onDelete}
        disabled={isPending}
        className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-danger-500 transition hover:bg-danger-500/10 disabled:opacity-50"
        aria-label="削除"
        title="削除"
      >
        {activeAction === 'delete' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
        <span className="hidden sm:inline">削除</span>
      </button>
    </div>
  );
}
