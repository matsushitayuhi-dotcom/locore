'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import { followUser, unfollowUser } from '@/lib/follow/actions';

type Props = {
  targetUserId: string;
  /** 初期状態（サーバ側で isFollowing を判定して渡す） */
  initialFollowing: boolean;
  /** 親プロフィールの followers 数（楽観更新用） */
  initialFollowerCount: number;
  viewerLoggedIn: boolean;
};

/**
 * フォロー / フォロー中ボタン。
 * クリックでトグルし、すぐ表示を切り替える（サーバアクションは fire-and-forget 寄り）。
 *
 * 親（profile page）は `followers` カウントを自前で持って表示するが、
 * クリック直後の楽観更新のため、ローカルの delta を持ち回す形。
 */
export function FollowButton({
  targetUserId,
  initialFollowing,
  initialFollowerCount,
  viewerLoggedIn,
}: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  // 表示するフォロワー数。クリックで ±1
  const [_followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [isPending, startTransition] = useTransition();
  void _followerCount;

  const onClick = () => {
    if (!viewerLoggedIn) {
      router.push(
        `/auth/login?redirectTo=${encodeURIComponent(`/users/${targetUserId}`)}`,
      );
      return;
    }
    const wasFollowing = following;
    // 楽観更新
    setFollowing(!wasFollowing);
    setFollowerCount((c) => c + (wasFollowing ? -1 : 1));
    startTransition(async () => {
      const res = wasFollowing
        ? await unfollowUser({ targetUserId })
        : await followUser({ targetUserId });
      if (!res.ok) {
        // ロールバック
        setFollowing(wasFollowing);
        setFollowerCount((c) => c + (wasFollowing ? 1 : -1));
        toast.error(res.error);
      }
    });
  };

  return (
    <Button
      type="button"
      variant={following ? 'outline' : 'primary'}
      size="sm"
      onClick={onClick}
      disabled={isPending}
    >
      {following ? 'フォロー中' : 'フォロー'}
    </Button>
  );
}
