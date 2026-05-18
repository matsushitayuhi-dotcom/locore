'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, Trash2, Loader2 } from 'lucide-react';
import {
  publishCommunityPost,
  unpublishCommunityPost,
  softDeleteCommunityPost,
  type CommunityActionResult,
} from './actions';
import type { CommunityStatus } from '@/lib/community/constants';

/**
 * コミュニティ投稿行に並べる「公開 / 非公開 / 削除」操作ボタン群。
 *
 * - status='active'           → 「非公開」ボタン
 * - status='closed'|'expired' → 「公開」ボタン
 * - 削除は常時 (expired ならボタン側で吸収) 表示し confirm で 2-step
 */

type Props = {
  postId: string;
  postTitle: string;
  status: CommunityStatus;
};

export function CommunityAdminActions({ postId, postTitle, status }: Props) {
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<
    'publish' | 'unpublish' | 'delete' | null
  >(null);

  const run = (
    action: 'publish' | 'unpublish' | 'delete',
    fn: () => Promise<CommunityActionResult>,
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
    run('publish', () => publishCommunityPost({ id: postId }));

  const onUnpublish = () => {
    if (
      !window.confirm(
        `「${postTitle}」を非公開にしますか？\n\n` +
          '一覧からは消えますが、データは残ります（status=closed）。',
      )
    )
      return;
    run('unpublish', () => unpublishCommunityPost({ id: postId }));
  };

  const onDelete = () => {
    if (
      !window.confirm(
        `「${postTitle}」を削除しますか？\n\n` +
          'サイトの全画面から消えます（status=expired）。\n' +
          '復活には Supabase Studio で status を active に戻す必要があります。',
      )
    )
      return;
    run('delete', () => softDeleteCommunityPost({ id: postId }));
  };

  const isActive = status === 'active';

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {isActive ? (
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
