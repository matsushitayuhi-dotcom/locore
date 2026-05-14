'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Lock, Unlock, Trash2 } from 'lucide-react';
import {
  closeCommunityPost,
  reopenCommunityPost,
  deleteCommunityPost,
} from '@/lib/community/actions';

/**
 * 投稿者本人にのみ表示する締切 / 再公開 / 削除ボタン。
 */
export function OwnerControls({
  postId,
  status,
}: {
  postId: string;
  status: 'active' | 'closed' | 'expired';
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onClose = () => {
    startTransition(async () => {
      const res = await closeCommunityPost({ id: postId });
      if (res.ok) {
        toast.success('物件を締切りました');
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const onReopen = () => {
    startTransition(async () => {
      const res = await reopenCommunityPost({ id: postId });
      if (res.ok) {
        toast.success('物件を再公開しました');
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const onDelete = () => {
    if (!confirm('この物件投稿を削除しますか？この操作は取り消せません。')) return;
    startTransition(async () => {
      const res = await deleteCommunityPost({ id: postId });
      if (res.ok) {
        toast.success('投稿を削除しました');
        router.push('/apartments');
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'active' ? (
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-foreground/75 hover:border-foreground/30 disabled:opacity-50"
        >
          <Lock className="h-3.5 w-3.5" />
          締切る
        </button>
      ) : (
        <button
          type="button"
          onClick={onReopen}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-foreground/75 hover:border-foreground/30 disabled:opacity-50"
        >
          <Unlock className="h-3.5 w-3.5" />
          再公開する
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-50/50 px-3 py-1.5 text-[12px] font-medium text-rose-700 hover:bg-rose-100/60 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        削除
      </button>
    </div>
  );
}
