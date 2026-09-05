'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Clock, Send } from 'lucide-react';
import { requestBooking } from '@/lib/bookings/actions';
import {
  formatSlotJst,
  formatTimeInTz,
  jstDateKey,
  wallPartsInTz,
} from '@/lib/bookings/time';

/**
 * 予約リクエストフォームの Client 部分（booking-slice モック 3/5・週グリッド版）。
 *
 * Preply 参考の週グリッド: 週送りナビ（過去方向 disabled）＋「日本時間」チップ、
 * 月〜日の 7 列に開始時刻セルを縦積み、空きのない日は「—」。選択セルはライム塗り。
 * モバイルはグリッドごと横スクロール（min-width で 7 列を維持）。
 * 選択後のメッセージ → ライムのサマリー復唱 → 送信フローは従来どおり。
 */

const JST = 'Asia/Tokyo';
const DAY_MS = 86_400_000;
const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;

/** 日本時間の「今日」を純カレンダー日付（UTC ms）として返す */
function jstTodayMs(): number {
  const w = wallPartsInTz(new Date(), JST);
  return Date.UTC(w.year, w.month - 1, w.day);
}

function keyOfMs(ms: number): string {
  const d = new Date(ms);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

export function RequestForm({
  serviceId,
  enrollmentId,
  serviceTitle,
  expertName,
  priceJpy,
  planSession = false,
  durationMinutes,
  slotIsos,
}: {
  /** 単発メニュー id。プラン内セッション時は null（enrollmentId を使う） */
  serviceId: string | null;
  /** 継続プラン契約 id（0083）。指定時は price 0 のプラン内セッション予約 */
  enrollmentId?: string;
  serviceTitle: string;
  expertName: string;
  priceJpy: number | null;
  /** true = プラン内セッション（サマリーに価格を出さず「プラン内」表記） */
  planSession?: boolean;
  durationMinutes: number;
  /** listOpenStartTimes の結果（UTC ISO、昇順） */
  slotIsos: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [week, setWeek] = useState(0);

  // JST 日付キー → その日の開始時刻セル
  const slotsByDay = useMemo(() => {
    const map = new Map<string, Array<{ iso: string; label: string }>>();
    for (const iso of slotIsos) {
      const d = new Date(iso);
      const key = jstDateKey(d);
      const arr = map.get(key) ?? [];
      if (arr.length < 14) {
        arr.push({ iso, label: formatTimeInTz(d, JST) });
      }
      map.set(key, arr);
    }
    return map;
  }, [slotIsos]);

  // 今日を含む月曜はじまりの週を week=0 とし、最後の空き枠がある週まで送れる
  const { weekStartMs, maxWeek } = useMemo(() => {
    const today = jstTodayMs();
    const dow = new Date(today).getUTCDay();
    const monday = today - ((dow + 6) % 7) * DAY_MS;
    const last = slotIsos[slotIsos.length - 1];
    let max = 0;
    if (last) {
      const w = wallPartsInTz(new Date(last), JST);
      const lastMs = Date.UTC(w.year, w.month - 1, w.day);
      max = Math.max(0, Math.floor((lastMs - monday) / (7 * DAY_MS)));
    }
    return { weekStartMs: monday, maxWeek: max };
  }, [slotIsos]);

  const days = useMemo(() => {
    const start = weekStartMs + week * 7 * DAY_MS;
    return Array.from({ length: 7 }, (_, i) => {
      const ms = start + i * DAY_MS;
      const d = new Date(ms);
      return {
        key: keyOfMs(ms),
        dow: WEEKDAY_JA[d.getUTCDay()],
        date: d.getUTCDate(),
        month: d.getUTCMonth() + 1,
      };
    });
  }, [weekStartMs, week]);

  const rangeLabel = `${days[0]!.month}月${days[0]!.date}日〜${days[6]!.month}月${days[6]!.date}日`;

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
      const res = await requestBooking(
        enrollmentId
          ? {
              enrollmentId,
              startAtIso: selectedIso,
              message: message.trim(),
            }
          : {
              serviceId: serviceId ?? undefined,
              startAtIso: selectedIso,
              message: message.trim(),
            },
      );
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

  const navBtnCls =
    'grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full border border-border-strong bg-card text-neutral-700 transition hover:border-primary-700 hover:text-primary-700 disabled:cursor-default disabled:border-border disabled:text-border-strong';

  return (
    <div>
      {/* step 1: 日時（週グリッド） */}
      <div className="mt-7 flex items-center gap-2.5 text-[13.5px] font-bold">
        <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-primary-500 text-[12px] font-bold tabular-nums text-neutral-950">
          1
        </span>
        日時をえらぶ
      </div>

      {/* 週送りナビ */}
      <div className="mt-3.5 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setWeek((w) => Math.max(0, w - 1))}
          disabled={week === 0}
          aria-label="前の週"
          className={navBtnCls}
        >
          <ChevronLeft className="h-[15px] w-[15px]" aria-hidden />
        </button>
        <span className="text-[14px] font-bold tabular-nums">{rangeLabel}</span>
        <button
          type="button"
          onClick={() => setWeek((w) => Math.min(maxWeek, w + 1))}
          disabled={week >= maxWeek}
          aria-label="次の週"
          className={navBtnCls}
        >
          <ChevronRight className="h-[15px] w-[15px]" aria-hidden />
        </button>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-[11px] font-bold text-primary-900">
          <Clock className="h-3 w-3 text-primary-700" aria-hidden />
          日本時間
        </span>
      </div>

      {/* 7 列グリッド（モバイルは横スクロールで 7 列を維持） */}
      <div className="-mx-1 mt-3 overflow-x-auto px-1 pb-1">
        <div className="grid min-w-[560px] grid-cols-7 gap-1.5">
          {days.map((day) => {
            const daySlots = slotsByDay.get(day.key) ?? [];
            const empty = daySlots.length === 0;
            return (
              <div key={day.key} className="flex min-w-0 flex-col gap-1.5">
                <div
                  className={
                    'border-b border-border pb-2 pt-1 text-center leading-snug ' +
                    (empty ? 'opacity-40' : '')
                  }
                >
                  <span className="block text-[11px] text-neutral-500">
                    {day.dow}
                  </span>
                  <span className="block text-[14.5px] font-bold tabular-nums">
                    {day.date}
                  </span>
                </div>
                {empty ? (
                  <div
                    className="select-none py-2.5 text-center text-[13px] text-border-strong"
                    aria-hidden
                  >
                    —
                  </div>
                ) : (
                  daySlots.map((s) => {
                    const on = selectedIso === s.iso;
                    return (
                      <button
                        key={s.iso}
                        type="button"
                        onClick={() => setSelectedIso(on ? null : s.iso)}
                        aria-pressed={on}
                        className={
                          'w-full rounded-[10px] border py-2 text-center text-[13px] font-semibold tabular-nums transition ' +
                          (on
                            ? 'border-primary-500 bg-primary-500 font-bold text-neutral-950 shadow-sm'
                            : 'border-border-strong bg-card text-neutral-700 hover:border-primary-700 hover:text-primary-700')
                        }
                      >
                        {s.label}
                      </button>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>

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
        placeholder="相談したいことを具体的にお書きください。例:「来年秋入学で米大学院を目指しています。SoPの構成と、出願校リストの絞り込みについて相談したいです」"
        className="mt-3 w-full resize-y rounded-xl border border-border-strong bg-card px-4 py-3 text-[13.5px] leading-relaxed text-foreground outline-none placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
      />

      {/* サマリー復唱 */}
      {summarySlot ? (
        <div className="mt-5 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-[12px] leading-relaxed text-neutral-700">
          送信する内容: <b className="tabular-nums">{summarySlot}</b>（日本時間）の{' '}
          <b>
            {serviceTitle}
            {planSession
              ? '（プラン内・追加料金なし）'
              : priceJpy != null
                ? ` ¥${priceJpy.toLocaleString('ja-JP')}`
                : ''}
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
