'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, X, RefreshCw, Trash2 } from 'lucide-react';
import {
  closeCommunityPost,
  reopenCommunityPost,
  deleteCommunityPost,
} from '@/lib/community/actions';

export function OwnerActions({
  postId,
  closed,
}: {
  postId: string;
  closed: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onClose = () => {
    if (!confirm('この投稿を締切ますか？\n（応募は受け付けられなくなります）')) return;
    startTransition(async () => {
      const res = await closeCommunityPost({ id: postId });
      if (res.ok) {
        toast.success('締切ました');
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
        toast.success('再公開しました', {
          description: '期限を 14 日延長しました',
        });
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const onDelete = () => {
    if (!confirm('この投稿を完全に削除しますか？\nこの操作は取り消せません。')) return;
    startTransition(async () => {
      const res = await deleteCommunityPost({ id: postId });
      if (res.ok) {
        toast.success('削除しました');
        router.push('/lessons');
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
        投稿者メニュー
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled
          title="編集機能は近日公開"
          className="inline-flex items-center justify-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground/45"
        >
          <Pencil className="h-3 w-3" />
          編集
        </button>
        {closed ? (
          <button
            type="button"
            onClick={onReopen}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1 rounded-md border border-primary-500/40 bg-primary-500/10 px-2.5 py-1.5 text-[11px] font-bold text-primary-300 hover:bg-primary-500/15 disabled:opacity-50"
          >
            <RefreshCw className="h-3 w-3" />
            再公開
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground/80 hover:bg-muted disabled:opacity-50"
          >
            <X className="h-3 w-3" />
            締切る
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={isPending}
          className="col-span-2 inline-flex items-center justify-center gap-1 rounded-md border border-danger-500/30 bg-danger-500/5 px-2.5 py-1.5 text-[11px] font-bold text-danger-500 hover:bg-danger-500/10 disabled:opacity-50"
        >
          <Trash2 className="h-3 w-3" />
          削除する
        </button>
      </div>
    </div>
  );
}
