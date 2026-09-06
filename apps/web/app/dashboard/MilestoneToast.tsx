'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

/** 今回初めて達成したマイルストーンをトーストで祝う（表示は 1 回。永続化は syncMilestones 側） */
export function MilestoneToast({ labels }: { labels: string[] }) {
  useEffect(() => {
    if (labels.length === 0) return;
    const t = setTimeout(() => {
      toast.success(labels.length === 1 ? `マイルストーン達成: ${labels[0]}` : `マイルストーン達成: ${labels.join('・')}`, {
        description: 'おめでとうございます。ダッシュボードのマイルストーンに記録しました',
        duration: 6000,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [labels]);
  return null;
}
