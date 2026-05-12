'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import { CalendarPlus, Check } from '@locore/ui/icons';
import { addBookmark, removeBookmark } from '@/lib/bookmarks/actions';

/**
 * 「旅程に追加 / 保存」ボタン。
 *
 * 以前は localStorage の TripAdds に追加するだけで、サーバ側に何も保存されず
 * 「押しても保存されない」バグになっていた。bookmarks テーブルに addBookmark し、
 * /library/itineraries タブから見返せる本物の保存に切り替えた。
 */
export function AddToTripButton({
  articleId,
  size = 'md',
  initialSaved = false,
}: {
  articleId: string;
  size?: 'sm' | 'md' | 'lg';
  /** サーバから「既にブックマーク済みか」を渡すと初期状態に反映 */
  initialSaved?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    const wasOn = saved;
    setSaved(!wasOn); // 楽観的 UI

    startTransition(async () => {
      try {
        const res = wasOn
          ? await removeBookmark({ articleId })
          : await addBookmark({ articleId });
        if (res.ok) {
          if (wasOn) {
            toast('保存ライブラリから外しました');
          } else {
            toast.success('旅程を保存しました', {
              description: '「保存ライブラリ → 旅程」から見返せます',
              action: {
                label: 'ライブラリを開く',
                onClick: () => router.push('/library?tab=itineraries'),
              },
            });
          }
          return;
        }

        // 失敗：ロールバック
        setSaved(wasOn);
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
        toast.error('保存に失敗しました', {
          description: err instanceof Error ? err.message : '不明なエラー',
        });
      }
    });
  };

  return (
    <Button
      variant={saved ? 'primary' : 'outline'}
      size={size}
      onClick={onClick}
      disabled={isPending}
      aria-pressed={saved}
    >
      {saved ? (
        <>
          <Check className="mr-1.5 h-4 w-4" />
          保存済み
        </>
      ) : (
        <>
          <CalendarPlus className="mr-1.5 h-4 w-4" />
          旅程を保存
        </>
      )}
    </Button>
  );
}
