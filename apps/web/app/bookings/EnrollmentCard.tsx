'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarPlus, Check, MessageCircle, Repeat } from 'lucide-react';
import type { PlanEnrollmentStatus } from '@locore/db';
import {
  acceptEnrollment,
  cancelEnrollment,
  declineEnrollment,
} from '@/lib/plans/actions';

/**
 * /bookings の継続プラン契約カード（伴走スライス）。
 *
 * - member 側: 伴走中は「今月の残り◯回」＋「セッションを予約」CTA
 *   （/experts/[expertId]/request?enrollment=…）とチャット。申込中は取り下げ。
 * - expert 側: 申込中（requested）は 承諾 / 辞退 の要返答カード。
 */

export type EnrollmentCardData = {
  id: string;
  status: PlanEnrollmentStatus;
  planTitle: string;
  monthlyPriceJpy: number;
  sessionsPerMonth: number;
  durationMinutes: number;
  requestMessage: string | null;
  chatThreadId: string | null;
  expertId: string;
  remainingThisMonth: number;
  counterpartName: string;
  counterpartAvatarUrl: string | null;
};

const STATUS_LABELS: Record<PlanEnrollmentStatus, string> = {
  requested: '申込中',
  active: '伴走中',
  declined: '辞退',
  cancelled: '解約',
  ended: '終了',
  past_due: '支払い確認中',
};

export function EnrollmentCard({
  side,
  enrollment: e,
}: {
  side: 'mine' | 'received';
  enrollment: EnrollmentCardData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const isPendingStatus = e.status === 'requested';
  const isActive = e.status === 'active' || e.status === 'past_due';
  const isDim = !isPendingStatus && !isActive;

  const run = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
  ) => {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error ?? '操作に失敗しました');
        router.refresh();
        return;
      }
      toast.success(okMsg);
    });
  };

  return (
    <article
      className={
        'mt-3.5 rounded-2xl border bg-card px-5 py-[18px] shadow-xs ' +
        (isPendingStatus
          ? 'border-warning-500/40'
          : isActive
            ? 'border-primary-200'
            : 'border-border opacity-60')
      }
    >
      <div className="flex items-start gap-3.5">
        {e.counterpartAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={e.counterpartAvatarUrl}
            alt=""
            className="h-[46px] w-[46px] shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-primary-100 text-[17px] font-bold text-primary-900">
            {e.counterpartName.charAt(0) || '？'}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-bold">{e.counterpartName}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-neutral-500">
            <Repeat className="h-3 w-3 text-primary-700" aria-hidden />
            <b className="font-bold text-neutral-700">{e.planTitle}</b>
            {' ・ '}¥{e.monthlyPriceJpy.toLocaleString('ja-JP')}/月{' ・ '}月
            {e.sessionsPerMonth}回×{e.durationMinutes}分
          </div>
        </div>
        <span
          className={
            'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-bold ' +
            (isPendingStatus
              ? 'border-warning-500/40 bg-warning-50 text-warning-700'
              : isActive
                ? 'border-primary-300 bg-primary-100 text-primary-900'
                : 'border-border bg-muted text-neutral-500')
          }
        >
          <i className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {STATUS_LABELS[e.status]}
        </span>
      </div>

      {/* 今月の残り（伴走中のみ） */}
      {isActive ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 text-[13px]">
          <span className="font-bold">今月の残りセッション</span>
          <span className="text-[15px] font-bold tabular-nums text-primary-700">
            {e.remainingThisMonth}回
          </span>
          <span className="text-[11px] text-neutral-500">
            / 月{e.sessionsPerMonth}回（繰越なし・翌月1日に回復）
          </span>
        </div>
      ) : null}

      {/* 申込メッセージ（受け側のみ） */}
      {side === 'received' && e.requestMessage ? (
        <p className="mt-2.5 border-l-[3px] border-border-strong py-1 pl-3.5 text-[12.5px] leading-relaxed text-neutral-500">
          {e.requestMessage}
        </p>
      ) : null}

      {/* アクション */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        {side === 'received' && isPendingStatus ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => acceptEnrollment({ enrollmentId: e.id }),
                  '伴走プランを開始しました',
                )
              }
              className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-[26px] py-2.5 text-[13.5px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300 disabled:opacity-50"
            >
              <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
              承諾する
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => declineEnrollment({ enrollmentId: e.id }),
                  '辞退しました',
                )
              }
              className="rounded-full px-3.5 py-2.5 text-[13px] font-medium text-neutral-500 transition hover:text-foreground disabled:opacity-50"
            >
              辞退
            </button>
          </>
        ) : null}

        {side === 'mine' && isActive ? (
          <Link
            href={`/experts/${e.expertId}/request?enrollment=${e.id}`}
            className={
              'inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[13.5px] font-bold shadow-sm transition ' +
              (e.remainingThisMonth > 0
                ? 'bg-primary-500 text-neutral-950 hover:bg-primary-300'
                : 'pointer-events-none bg-muted text-neutral-400')
            }
            aria-disabled={e.remainingThisMonth === 0}
          >
            <CalendarPlus className="h-4 w-4" aria-hidden />
            セッションを予約
          </Link>
        ) : null}

        {(side === 'mine' || isActive) && e.chatThreadId ? (
          <Link
            href={`/chat/${e.chatThreadId}`}
            className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-card px-[22px] py-2 text-[13px] font-bold text-neutral-700 transition hover:border-foreground hover:text-foreground"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            チャットを開く
          </Link>
        ) : null}

        {side === 'mine' && (isPendingStatus || isActive) ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (
                isActive &&
                !confirm(
                  'プランを解約しますか？ 確定済みのセッションは予定どおり実施されます。',
                )
              ) {
                return;
              }
              run(
                () => cancelEnrollment({ enrollmentId: e.id }),
                isActive ? 'プランを解約しました' : '申し込みを取り下げました',
              );
            }}
            className="ml-auto rounded-full px-3.5 py-2.5 text-[12.5px] font-medium text-neutral-500 transition hover:text-foreground disabled:opacity-50"
          >
            {isActive ? '解約する' : '申し込みを取り消す'}
          </button>
        ) : null}
      </div>
    </article>
  );
}
