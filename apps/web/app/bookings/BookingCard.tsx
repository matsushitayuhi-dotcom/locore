'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Calendar,
  CalendarPlus,
  Check,
  Info,
  MessageCircle,
  Video,
} from 'lucide-react';
import type { ConsultationBookingStatus } from '@locore/db';
import {
  acceptBooking,
  cancelBooking,
  declineBooking,
  setBookingMeetUrl,
} from '@/lib/bookings/actions';
import { STATUS_LABELS, tzShortLabel } from '@/lib/bookings/constants';
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
  /** 参加リンク（未設定は null）。confirmed の 4 状態出し分けに使う */
  meetUrl: string | null;
  counterpartId: string;
  counterpartName: string;
  counterpartAvatarUrl: string | null;
  counterpartFlag: string;
  counterpartCity: string | null;
};

const JST = 'Asia/Tokyo';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://locore.app';

/**
 * Google カレンダーのプリセット済みイベント作成 URL（OAuth 不要）。
 * dates は UTC の YYYYMMDDTHHMMSSZ 形式。
 */
function googleCalendarUrl(b: BookingCardData, start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `【Locore】${b.serviceTitle}（${b.counterpartName}さん）`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `${b.meetUrl ? `参加リンク: ${b.meetUrl}\n` : ''}マイ相談: ${APP_URL}/bookings`,
    ...(b.meetUrl ? { location: b.meetUrl } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

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
  // 受け側の参加リンク登録フォーム（confirmed × リンク未登録 or 「変更」押下時）
  const [urlDraft, setUrlDraft] = useState('');
  const [editingUrl, setEditingUrl] = useState(false);

  const start = new Date(b.startIso);
  const end = new Date(b.endIso);
  const st = b.displayStatus;
  const isPending = st === 'requested';
  const isConfirmed = st === 'accepted' || st === 'paid';
  const isDim = !isPending && !isConfirmed;

  const mainTz = side === 'received' && viewerTz ? viewerTz : JST;
  const showJstSub = mainTz !== JST;

  const run = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
  ) => {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error ?? '操作に失敗しました');
        // 失敗（レース等）はサーバー側 revalidate が走らないことがあるので明示更新
        router.refresh();
        return;
      }
      // 成功時はアクション内の revalidatePath('/bookings') が反映してくれる
      toast.success(okMsg);
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
              返答期限: 開始時刻（{formatSlotInTz(start, mainTz)} {tzShortLabel(mainTz)}）まで
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
              開始時刻（{formatSlotInTz(start, JST)}）までに返答がないと期限切れ
            </span>
          </>
        ) : null}

        {isConfirmed && side === 'mine' ? (
          <>
            {b.meetUrl ? (
              <a
                href={b.meetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-6 py-2.5 text-[13.5px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300"
              >
                <Video className="h-4 w-4" aria-hidden />
                参加リンクを開く
              </a>
            ) : null}
            {b.chatThreadId ? (
              <Link
                href={`/chat/${b.chatThreadId}`}
                className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-card px-[22px] py-2 text-[13px] font-bold text-neutral-700 transition hover:border-foreground hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                チャットを開く
              </Link>
            ) : null}
            <a
              href={googleCalendarUrl(b, start, end)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 text-[12.5px] font-medium text-neutral-500 transition hover:text-foreground"
            >
              <CalendarPlus className="h-[15px] w-[15px]" aria-hidden />
              Googleカレンダーに追加
            </a>
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

      {/* 依頼側 × 参加リンクなし: 準備中の注記（モック B） */}
      {isConfirmed && side === 'mine' && !b.meetUrl ? (
        <div className="mt-2.5 flex items-start gap-2 rounded-[10px] border border-dashed border-border-strong bg-background px-3.5 py-2.5 text-[11.5px] leading-relaxed text-neutral-500">
          <Info
            className="mt-0.5 h-[13px] w-[13px] shrink-0 text-neutral-400"
            aria-hidden
          />
          参加リンクは準備でき次第ここに表示されます（メールでもお知らせします）。
        </div>
      ) : null}

      {/* 受け側: 参加リンクの表示（モック D）/ インライン登録（モック C） */}
      {isConfirmed && side === 'received' ? (
        b.meetUrl && !editingUrl ? (
          <div className="mt-3 flex min-w-0 items-center gap-2.5 rounded-[10px] border border-primary-100 bg-primary-50 px-3.5 py-2.5">
            <Video
              className="h-[14px] w-[14px] shrink-0 text-primary-700"
              aria-hidden
            />
            <a
              href={b.meetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 truncate font-mono text-[12px] font-semibold text-primary-900 underline-offset-4 hover:underline"
            >
              {b.meetUrl.replace(/^https:\/\//, '')}
            </a>
            <button
              type="button"
              onClick={() => {
                setUrlDraft(b.meetUrl ?? '');
                setEditingUrl(true);
              }}
              className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium text-neutral-500 transition hover:text-foreground"
            >
              変更
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-neutral-700">
              <Video className="h-[14px] w-[14px] text-primary-700" aria-hidden />
              参加リンクを{b.meetUrl ? '変更' : '登録'}
            </div>
            <div className="mt-1.5 flex gap-2">
              <input
                type="url"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="https://meet.google.com/..."
                aria-label="参加リンクの URL"
                className="min-w-0 flex-1 rounded-[10px] border border-border-strong bg-card px-3 py-2 font-mono text-[12px] text-foreground outline-none placeholder:text-neutral-400 focus:border-primary-500"
              />
              <button
                type="button"
                disabled={pending || urlDraft.trim() === ''}
                onClick={() =>
                  startTransition(async () => {
                    const res = await setBookingMeetUrl({
                      bookingId: b.id,
                      url: urlDraft.trim(),
                    });
                    if (!res.ok) {
                      toast.error(res.error ?? '保存に失敗しました');
                      router.refresh();
                      return;
                    }
                    setEditingUrl(false);
                    toast.success('参加リンクを保存しました');
                  })
                }
                className="shrink-0 rounded-full bg-primary-500 px-5 py-2 text-[13px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300 disabled:opacity-50"
              >
                保存
              </button>
            </div>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-neutral-500">
              保存すると相手のマイ相談ページとチャットに共有されます。
            </p>
          </div>
        )
      ) : null}
    </article>
  );
}
