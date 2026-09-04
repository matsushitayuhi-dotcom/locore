'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Calendar, Check, MessageCircle } from 'lucide-react';
import type { ConsultationBookingStatus } from '@locore/db';
import {
  acceptBooking,
  cancelBooking,
  declineBooking,
} from '@/lib/bookings/actions';
import {
  RESPONSE_DEADLINE_HOURS,
  STATUS_LABELS,
  tzShortLabel,
} from '@/lib/bookings/constants';
import {
  formatDateShortInTz,
  formatSlotInTz,
  formatTimeRangeInTz,
} from '@/lib/bookings/time';

/**
 * /bookings の予約カード（booking-slice モック 4/5 準拠）。
 *
 * - リクエスト中 = warning / 確定 = ライム / それ以外 = neutral + 薄表示
 * - 受け側（side='received'）は本人の現地時間を主表示し日本時間を併記、
 *   依頼側は日本時間のみ（空き時間管理と同じ非対称ルール）
 * - 承諾はライムの主ボタン、辞退・取り下げはテキストに降格（誤タップ防止）
 */

export type BookingCardData = {
  id: string;
  displayStatus: ConsultationBookingStatus;
  startIso: string;
  endIso: string;
  serviceTitle: string;
  priceJpy: number;
  requestMessage: string | null;
  chatThreadId: string | null;
  counterpartId: string;
  counterpartName: string;
  counterpartAvatarUrl: string | null;
  counterpartFlag: string;
  counterpartCity: string | null;
};

const JST = 'Asia/Tokyo';

export function BookingCard({
  side,
  viewerTz,
  booking: b,
}: {
  side: 'mine' | 'received';
  /** 受け側の主表示 TZ（users.timezone）。null なら日本時間のみ */
  viewerTz: string | null;
  booking: BookingCardData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const start = new Date(b.startIso);
  const end = new Date(b.endIso);
  const st = b.displayStatus;
  const isPending = st === 'requested';
  const isConfirmed = st === 'accepted' || st === 'paid';
  const isDim = !isPending && !isConfirmed;

  const mainTz = side === 'received' && viewerTz ? viewerTz : JST;
  const showJstSub = mainTz !== JST;
  const deadline = new Date(
    start.getTime() - RESPONSE_DEADLINE_HOURS * 3_600_000,
  );

  const run = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
  ) => {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error ?? '操作に失敗しました');
      } else {
        toast.success(okMsg);
      }
      router.refresh();
    });
  };

  return (
    <article
      className={
        'mt-3.5 rounded-2xl border bg-card px-5 py-[18px] shadow-xs ' +
        (isPending
          ? 'border-warning-500/40'
          : isConfirmed
            ? 'border-primary-200'
            : 'border-border opacity-60')
      }
    >
      <div className="flex items-start gap-3.5">
        {b.counterpartAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={b.counterpartAvatarUrl}
            alt=""
            className="h-[46px] w-[46px] shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-primary-100 text-[17px] font-bold text-primary-900">
            {b.counterpartName.charAt(0) || '？'}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-bold">{b.counterpartName}</div>
          <div className="mt-0.5 text-[12px] text-neutral-500">
            <b className="font-bold text-neutral-700">{b.serviceTitle}</b>
            {' ・ '}¥{b.priceJpy.toLocaleString('ja-JP')}
            {b.counterpartCity
              ? ` ・ ${b.counterpartFlag ? `${b.counterpartFlag} ` : ''}${b.counterpartCity}`
              : ''}
          </div>
        </div>
        <span
          className={
            'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-bold ' +
            (isPending
              ? 'border-warning-500/40 bg-warning-50 text-warning-700'
              : isConfirmed
                ? 'border-primary-300 bg-primary-100 text-primary-900'
                : 'border-border bg-muted text-neutral-500')
          }
        >
          <i className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {STATUS_LABELS[st]}
        </span>
      </div>

      {/* 日時 */}
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5">
        <Calendar className="h-[15px] w-[15px] shrink-0 text-primary-700" aria-hidden />
        <span className="text-[13px] font-bold">
          {formatDateShortInTz(start, mainTz)}
        </span>
        <div>
          <span className="text-[14px] font-semibold tabular-nums">
            {formatTimeRangeInTz(start, end, mainTz)}
            <small className="ml-1 text-[10.5px] font-normal text-neutral-500">
              {tzShortLabel(mainTz)}
            </small>
          </span>
          {showJstSub ? (
            <div className="text-[11px] leading-snug text-neutral-500">
              （日本時間 {formatDateShortInTz(start, JST)}{' '}
              {formatTimeRangeInTz(start, end, JST)}）
            </div>
          ) : null}
        </div>
        <span className="ml-auto text-[14.5px] font-bold tabular-nums">
          ¥{b.priceJpy.toLocaleString('ja-JP')}
        </span>
      </div>

      {/* リクエスト本文（受け側のみ） */}
      {side === 'received' && b.requestMessage ? (
        <p className="mt-2.5 border-l-[3px] border-border-strong py-1 pl-3.5 text-[12.5px] leading-relaxed text-neutral-500">
          {b.requestMessage}
        </p>
      ) : null}

      {/* アクション */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        {side === 'received' && isPending ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => acceptBooking({ bookingId: b.id }), '予約を確定しました')
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
                run(() => declineBooking({ bookingId: b.id }), '辞退しました')
              }
              className="rounded-full px-3.5 py-2.5 text-[13px] font-medium text-neutral-500 transition hover:text-foreground disabled:opacity-50"
            >
              辞退
            </button>
            <span className="ml-auto text-[11px] text-neutral-400">
              返答期限: {formatSlotInTz(deadline, mainTz)} {tzShortLabel(mainTz)}
            </span>
          </>
        ) : null}

        {side === 'mine' && isPending ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => cancelBooking({ bookingId: b.id }),
                  'リクエストを取り下げました',
                )
              }
              className="rounded-full px-3.5 py-2.5 text-[13px] font-medium text-neutral-500 transition hover:text-foreground disabled:opacity-50"
            >
              リクエストを取り消す
            </button>
            <span className="ml-auto text-[11px] text-neutral-400">
              返答期限: {formatSlotInTz(deadline, JST)} まで
            </span>
          </>
        ) : null}

        {isConfirmed ? (
          <>
            {b.chatThreadId ? (
              <Link
                href={`/chat/${b.chatThreadId}`}
                className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-card px-[22px] py-2 text-[13px] font-bold text-neutral-700 transition hover:border-foreground hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                チャットを開く
              </Link>
            ) : null}
            <span className="ml-auto text-[11px] text-neutral-400">
              当日の参加リンクはチャットで共有されます
            </span>
          </>
        ) : null}

        {side === 'mine' && isDim ? (
          <Link
            href={`/experts/${b.counterpartId}`}
            className="rounded-full px-1 py-1 text-[13px] font-medium text-neutral-500 underline-offset-4 transition hover:text-foreground hover:underline"
          >
            別の枠でもう一度リクエスト
          </Link>
        ) : null}
      </div>
    </article>
  );
}
