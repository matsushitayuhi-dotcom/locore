'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Heart } from 'lucide-react';
import { followUser, unfollowUser } from '@/lib/follow/actions';

/**
 * 「お気に入りのエキスパート」に登録するハートボタン（2026-09）。
 *
 * データは既存のフォロー関係（user_follows）をそのまま使う（お気に入り = フォロー）。
 * 一覧は /favorites。未ログインならログインへ（戻り先はそのエキスパートのページ）。
 * 表示は楽観更新し、失敗時はロールバックする。
 */
export function FavoriteExpertButton({
  targetUserId,
  initialFavorited,
  viewerLoggedIn,
  variant = 'pill',
}: {
  targetUserId: string;
  initialFavorited: boolean;
  viewerLoggedIn: boolean;
  /** pill = ラベル付き（詳細ヒーロー）/ icon = 丸ボタンだけ（カード等） */
  variant?: 'pill' | 'icon';
}) {
  const router = useRouter();
  const [fav, setFav] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    if (!viewerLoggedIn) {
      router.push(`/auth/login?redirect_to=${encodeURIComponent(`/experts/${targetUserId}`)}`);
      return;
    }
    const was = fav;
    setFav(!was);
    startTransition(async () => {
      const res = was ? await unfollowUser({ targetUserId }) : await followUser({ targetUserId });
      if (!res.ok) {
        setFav(was);
        toast.error(res.error);
        return;
      }
      if (!was) toast.success('お気に入りに追加しました', { description: 'メニューの「お気に入り」から見返せます' });
    });
  };

  const iconCls = 'h-4 w-4 transition ' + (fav ? 'fill-current text-primary-700' : '');
  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        aria-pressed={fav}
        aria-label={fav ? 'お気に入りから外す' : 'お気に入りに追加'}
        title={fav ? 'お気に入りから外す' : 'お気に入りに追加'}
        className={
          'grid h-9 w-9 place-items-center rounded-full border bg-card transition hover:border-foreground disabled:opacity-60 ' +
          (fav ? 'border-primary-500' : 'border-border-strong')
        }
      >
        <Heart className={iconCls} aria-hidden />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-pressed={fav}
      className={
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition hover:border-foreground disabled:opacity-60 ' +
        (fav ? 'border-primary-500 bg-primary-50 text-primary-900' : 'border-border-strong bg-card text-neutral-700')
      }
    >
      <Heart className={iconCls} aria-hidden />
      {fav ? 'お気に入り済み' : 'お気に入り'}
    </button>
  );
}
