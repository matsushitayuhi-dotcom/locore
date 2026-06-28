'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { rsvpToEvent, cancelRsvp, type RsvpStatus } from '@/lib/community/rsvp';

/**
 * 参加カードの「参加する / 興味あり」ボタン群。
 *
 * - 楽観更新 → Server Action（rsvpToEvent / cancelRsvp）。
 * - 自分の状態に応じて「参加する → 参加予定（取消）」へ変化。
 * - 未ログインはログイン導線へ。
 * - capacity 満員で going 不可なら interested に切替えて満員メッセージを表示。
 *
 * クラスはモック準拠（.gr-join 内の .cta / .save）。CSS は GroupDetail.tsx が描画。
 */
export function RsvpButtons({
  postId,
  initialStatus,
  viewerLoggedIn,
  isOwner,
}: {
  postId: string;
  initialStatus: RsvpStatus | null;
  viewerLoggedIn: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<RsvpStatus | null>(initialStatus);
  const [isPending, startTransition] = useTransition();

  const requireLogin = () => {
    router.push('/auth/login?redirect_to=' + encodeURIComponent(location.pathname));
  };

  const apply = (next: RsvpStatus) => {
    if (!viewerLoggedIn) {
      requireLogin();
      return;
    }
    // 同じ状態をもう一度押したら取消
    if (status === next) {
      const prev = status;
      setStatus(null);
      startTransition(async () => {
        const res = await cancelRsvp(postId);
        if (!res.ok) {
          setStatus(prev);
          toast.error(res.error);
        } else {
          toast.success(next === 'going' ? '参加を取り消しました' : '興味ありを解除しました');
          router.refresh();
        }
      });
      return;
    }

    const prev = status;
    setStatus(next); // 楽観更新
    startTransition(async () => {
      const res = await rsvpToEvent(postId, next);
      if (!res.ok) {
        setStatus(prev);
        toast.error(res.error);
        return;
      }
      // capacity 満員などで実際の status が切り替わった場合は補正
      const finalStatus = res.data?.status ?? next;
      setStatus(finalStatus);
      if (res.data?.full) {
        toast.warning('定員に達したため「興味あり」で登録しました', {
          description: '空きが出たら参加に切り替えられます',
        });
      } else {
        toast.success(finalStatus === 'going' ? '参加表明しました' : '興味ありに登録しました');
      }
      router.refresh();
    });
  };

  if (isOwner) {
    return (
      <div className="closed">あなたが主催する集まりです</div>
    );
  }

  const going = status === 'going';
  const interested = status === 'interested';

  return (
    <>
      <button
        type="button"
        className={`cta${going ? ' is-on' : ''}`}
        onClick={() => apply('going')}
        disabled={isPending}
      >
        {going ? '✓ 参加予定（取り消す）' : '参加する'}
      </button>
      <button
        type="button"
        className={`save${interested ? ' is-on' : ''}`}
        onClick={() => apply('interested')}
        disabled={isPending}
      >
        {interested ? '♥ 興味あり（解除）' : '♡ 興味あり / 保存'}
      </button>
    </>
  );
}
