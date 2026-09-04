'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Clock, Send } from 'lucide-react';
import { requestBooking } from '@/lib/bookings/actions';
import { formatSlotJst } from '@/lib/bookings/time';

/**
 * 予約リクエストフォームの Client 部分（booking-slice モック 3/5）。
 * 日付グルーピングの時刻チップ（日本時間）→ メッセージ必須 → ライムのサマリー復唱 → 送信。
 */

type Group = {
  label: string;
  times: Array<{ iso: string; label: string }>;
};

export function RequestForm({
  serviceId,
  serviceTitle,
  expertName,
  priceJpy,
  durationMinutes,
  groups,
}: {
  serviceId: string;
  serviceTitle: string;
  expertName: string;
  priceJpy: number | null;
  durationMinutes: number;
  groups: Group[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const summarySlot = useMemo(() => {
    if (!selectedIso) return null;
    const start = new Date(selectedIso);
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    return formatSlotJst(start, end);
  }, [selectedIso, durationMinutes]);

  const canSend = !!selectedIso && message.trim().length > 0 && !pending;

  const onSubmit = () => {
    if (!selectedIso) {
      toast.error('希望の枠を選んでください');
      return;
    }
    if (!message.trim()) {
      toast.error('相談したいことをお書きください');
      return;
    }
    startTransition(async () => {
      const res = await requestBooking({
        serviceId,
        startAtIso: selectedIso,
        message: message.trim(),
      });
      if (!res.ok) {
        toast.error(res.error);
        router.refresh();
        return;
      }
      toast.success('リクエストを送信しました', {
        description: `${expertName}さんの承諾をお待ちください`,
      });
      router.push('/bookings');
    });
  };

  return (
    <div>
      {/* step 1: 日時 */}
      <div className="mt-7 flex items-center gap-2.5 text-[13.5px] font-bold">
        <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-primary-500 text-[12px] font-bold tabular-nums text-neutral-950">
          1
        </span>
        日時をえらぶ
        <span className="ml-auto inline-flex items-center gap-1.5 text-[10.5px] font-medium text-neutral-500">
          <Clock className="h-3 w-3 text-primary-700" aria-hidden />
          すべて日本時間
        </span>
      </div>

      {groups.map((g) => (
        <div key={g.label} className="mt-4">
          <div className="text-[12.5px] font-bold text-neutral-700">
            {g.label}
            <span className="ml-1.5 text-[11px] font-normal tabular-nums text-neutral-500">
              あと{g.times.length}枠
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {g.times.map((t) => {
              const on = selectedIso === t.iso;
              return (
                <button
                  key={t.iso}
                  type="button"
                  onClick={() => setSelectedIso(on ? null : t.iso)}
                  aria-pressed={on}
                  className={
                    'rounded-full border px-[18px] py-2 text-[13.5px] tabular-nums transition ' +
                    (on
                      ? 'border-primary-500 bg-primary-500 font-bold text-neutral-950 shadow-sm'
                      : 'border-border-strong bg-card font-semibold text-neutral-700 hover:border-primary-700 hover:text-primary-700')
                  }
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* step 2: 相談内容 */}
      <div className="mt-7 flex items-center gap-2.5 text-[13.5px] font-bold">
        <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-primary-500 text-[12px] font-bold tabular-nums text-neutral-950">
          2
        </span>
        相談したいこと
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={5}
        maxLength={2000}
        placeholder="相談したいことを具体的にお書きください。例:「来年4月にパリ移住予定。ビザ申請の書類と、11区・20区あたりのエリア選びについて相談したいです」"
        className="mt-3 w-full resize-y rounded-xl border border-border-strong bg-card px-4 py-3 text-[13.5px] leading-relaxed text-foreground outline-none placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
      />

      {/* サマリー復唱 */}
      {summarySlot ? (
        <div className="mt-5 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-[12px] leading-relaxed text-neutral-700">
          送信する内容: <b className="tabular-nums">{summarySlot}</b>（日本時間）の{' '}
          <b>
            {serviceTitle}
            {priceJpy != null ? ` ¥${priceJpy.toLocaleString('ja-JP')}` : ''}
          </b>{' '}
          — {expertName}さんの承諾後に確定します。
        </div>
      ) : null}

      <button
        type="button"
        disabled={!canSend}
        onClick={onSubmit}
        className="mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary-500 py-3.5 text-[15px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300 disabled:opacity-50"
      >
        この内容でリクエストする
        <Send className="h-4 w-4" aria-hidden />
      </button>
      <p className="mt-2.5 text-center text-[11px] leading-relaxed text-neutral-400">
        この時点では料金は発生しません。開始時刻までに返答がない場合、リクエストは自動で期限切れになります。
      </p>
    </div>
  );
}
