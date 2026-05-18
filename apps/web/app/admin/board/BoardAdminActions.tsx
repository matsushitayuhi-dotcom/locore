'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, Trash2, Loader2 } from 'lucide-react';
import {
  publishBoardPost,
  unpublishBoardPost,
  softDeleteBoardPost,
  type BoardPostActionResult,
} from './actions';

/**
 * 掲示板投稿行に並べる「公開 / 非公開 / 削除」操作ボタン群。
 *
 * - status='published'           → 「非公開」ボタン
 * - status='draft' | 'archived'  → 「公開」ボタン
 * - 削除は常時表示 (status='deleted' は親側で表示制御してもよい)
 */

type Props = {
  postId: string;
  postTitle: string;
  status: string;
};

export function BoardAdminActions({ postId, postTitle, status }: Props) {
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<
    'publish' | 'unpublish' | 'delete' | null
  >(null);

  const run = (
    action: 'publish' | 'unpublish' | 'delete',
    fn: () => Promise<BoardPostActionResult>,
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
    run('publish', () => publishBoardPost({ id: postId }));

  const onUnpublish = () => {
    if (
      !window.confirm(
        `「${postTitle}」を非公開にしますか？\n\n` +
          'ホームと /board の一覧から消えます（status=archived）。',
      )
    )
      return;
    run('unpublish', () => unpublishBoardPost({ id: postId }));
  };

  const onDelete = () => {
    if (
      !window.confirm(
        `「${postTitle}」を削除しますか？\n\n` +
          'サイトの全画面から消えます（status=deleted）。\n' +
          '復活には Supabase Studio で status を published に戻す必要があります。',
      )
    )
      return;
    run('delete', () => softDeleteBoardPost({ id: postId }));
  };

  const isPublished = status === 'published';
  const isDeleted = status === 'deleted';

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
          disabled={isPending || isDeleted}
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-success-500 transition hover:bg-success-500/10 disabled:opacity-50"
          aria-label="公開する"
          title={isDeleted ? '削除済みは Studio から復活してください' : '公開する'}
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
        disabled={isPending || isDeleted}
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
