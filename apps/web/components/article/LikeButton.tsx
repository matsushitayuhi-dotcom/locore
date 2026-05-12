'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Heart } from 'lucide-react';
import { toggleArticleLike } from '@/lib/articleLikes/actions';

type Props = {
  articleId: string;
  initialLiked: boolean;
  initialCount: number;
  viewerLoggedIn: boolean;
};

/**
 * 記事のいいねボタン。クリックでトグル。
 * count はクリックで楽観的に ±1 する（次回ロードでサーバ値に揃う）。
 */
export function LikeButton({
  articleId,
  initialLiked,
  initialCount,
  viewerLoggedIn,
}: Props) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    if (!viewerLoggedIn) {
      router.push(
        `/auth/login?redirectTo=${encodeURIComponent(window.location.pathname)}`,
      );
      return;
    }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount((c) => c + (wasLiked ? -1 : 1));
    startTransition(async () => {
      const res = await toggleArticleLike({ articleId });
      if (!res.ok) {
        // ロールバック
        setLiked(wasLiked);
        setCount((c) => c + (wasLiked ? 1 : -1));
        toast.error(res.error);
      } else if (res.data && res.data.liked !== !wasLiked) {
        // サーバ最終状態が予想と違ったら同期
        setLiked(res.data.liked);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-pressed={liked}
      className={
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition ' +
        (liked
          ? 'bg-primary-700 text-white shadow-sm'
          : 'bg-card text-primary-300 ring-1 ring-border hover:bg-primary-500/10')
      }
    >
      <Heart
        className="h-4 w-4"
        fill={liked ? 'currentColor' : 'none'}
        strokeWidth={2}
      />
      <span className="tabular">{count.toLocaleString('ja-JP')}</span>
    </button>
  );
}
