'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@locore/ui';
import { startDirectThread } from '@/lib/chat/actions';

type Props = {
  ownerUserId: string;
  viewerUserId: string | null;
};

export function ContactButton({ ownerUserId, viewerUserId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    if (!viewerUserId) {
      router.push(
        `/auth/login?redirectTo=${encodeURIComponent(`/users/${ownerUserId}`)}`,
      );
      return;
    }
    if (viewerUserId === ownerUserId) {
      toast.info('自分自身にはメッセージを送れません');
      return;
    }
    startTransition(async () => {
      const res = await startDirectThread({ withUserId: ownerUserId });
      if (res.ok && res.data) {
        router.push(`/chat/${res.data.threadId}`);
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={isPending}
    >
      メッセージを送る
    </Button>
  );
}
