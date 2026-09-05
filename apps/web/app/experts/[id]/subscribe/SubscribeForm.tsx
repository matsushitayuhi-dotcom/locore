'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { applyToPlan } from '@/lib/plans/actions';

/** 継続プラン申し込みフォーム（メッセージ必須 → applyToPlan → /bookings） */
export function SubscribeForm({
  serviceId,
  planTitle,
  expertName,
}: {
  serviceId: string;
  planTitle: string;
  expertName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  const onSubmit = () => {
    if (!message.trim()) {
      toast.error('相談したいこと・目標をお書きください');
      return;
    }
    startTransition(async () => {
      const res = await applyToPlan({ serviceId, message: message.trim() });
      if (!res.ok) {
        toast.error(res.error);
        router.refresh();
        return;
      }
      toast.success('申し込みを送信しました', {
        description: `${expertName}さんの承諾をお待ちください`,
      });
      router.push('/bookings');
    });
  };

  return (
    <div>
      <div className="mt-7 flex items-center gap-2.5 text-[13.5px] font-bold">
        <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-primary-500 text-[12px] font-bold tabular-nums text-neutral-950">
          1
        </span>
        目標・相談したいこと
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={6}
        maxLength={2000}
        placeholder={`目標と現在地を具体的にお書きください。例:「2027年秋入学でMBAを目指しています。GMAT対策は進行中で、エッセイと出願校選びを月2回のペースで伴走してほしいです」`}
        className="mt-3 w-full resize-y rounded-xl border border-border-strong bg-card px-4 py-3 text-[13.5px] leading-relaxed text-foreground outline-none placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
      />

      <button
        type="button"
        disabled={pending || message.trim() === ''}
        onClick={onSubmit}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary-500 py-3.5 text-[15px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300 disabled:opacity-50"
      >
        {planTitle}に申し込む
        <Send className="h-4 w-4" aria-hidden />
      </button>
      <p className="mt-2.5 text-center text-[11px] leading-relaxed text-neutral-400">
        決済は準備中のため、この時点で料金は発生しません。承諾後すぐ相談を始められます。
      </p>
    </div>
  );
}
