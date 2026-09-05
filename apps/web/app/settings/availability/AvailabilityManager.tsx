'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight, Globe, Trash2 } from 'lucide-react';
import {
  addAvailabilityBulk,
  deleteAvailability,
} from '@/lib/bookings/actions';
import { MeetingRoomCard } from './MeetingRoomCard';
import {
  DEFAULT_BULK_WEEKS,
  TIMEZONE_OPTIONS,
  tzShortLabel,
} from '@/lib/bookings/constants';
import { formatTimeRangeInTz, wallPartsInTz } from '@/lib/bookings/time';

/**
 * 空き時間管理 — Outlook 風の週カレンダー。
 *
 * - 縦 = 0:00〜24:00（30分刻み）、横 = 月〜日。ドラッグで空き枠を作成する。
 * - 入力はエキスパートの現地時間（timezone セレクト）。相談者には相談者の
 *   現地時間で表示されるため、海外の早朝・深夜が日本の相談者にとって好都合な
 *   ケースもある → 24 時間ぶんスクロールで見せる。
 * - 「1回だけ／毎週くり返す」を切り替え可能（くり返しは今後 N 週分を一括登録）。
 * - 予約が入った枠はライム背景の「予約あり」で表示し、削除不可。
 */

type SlotView = {
  id: string;
  startIso: string;
  endIso: string;
  hasBooking: boolean;
};

const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;

const ROW_H = 22; // 1 行（30分）の高さ px
const ROWS = 48; // 0:00〜24:00 を 30 分刻み

const pad = (n: number) => String(n).padStart(2, '0');
const hmFromRow = (r: number) => `${pad(Math.floor(r / 2))}:${r % 2 ? '30' : '00'}`;

function addDaysYmd(y: number, mo: number, d: number, days: number) {
  const t = new Date(Date.UTC(y, mo - 1, d + days));
  return { y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

type DayCol = {
  key: string; // YYYY-MM-DD
  y: number;
  mo: number;
  d: number;
  weekday: number; // 0=日
  isPast: boolean;
  isToday: boolean;
};

/** 現在の tz・週オフセットから月曜はじまりの 7 日と今日の情報を返す（純関数）。 */
function computeWeek(tz: string, offset: number): {
  days: DayCol[];
  todayKey: string;
  nowRow: number;
} {
  const today = wallPartsInTz(new Date(), tz);
  const todayKey = `${today.year}-${pad(today.month)}-${pad(today.day)}`;
  const back = (today.weekday + 6) % 7; // 月曜はじまり
  const start = addDaysYmd(today.year, today.month, today.day, -back + offset * 7);
  const days: DayCol[] = Array.from({ length: 7 }, (_, i) => {
    const p = addDaysYmd(start.y, start.mo, start.d, i);
    const key = `${p.y}-${pad(p.mo)}-${pad(p.d)}`;
    const weekday = new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay();
    return {
      key,
      y: p.y,
      mo: p.mo,
      d: p.d,
      weekday,
      isPast: key < todayKey,
      isToday: key === todayKey,
    };
  });
  const nowRow = today.hour * 2 + (today.minute >= 30 ? 1 : 0);
  return { days, todayKey, nowRow };
}

type Selection = { col: number; r0: number; r1: number };

const selectCls =
  'appearance-none rounded-full border border-border-strong bg-card px-4 py-2 pr-8 text-[13.5px] font-bold text-foreground outline-none focus:border-primary-500';

export function AvailabilityManager({
  initialTimezone,
  initialMeetingRoomUrl,
  slots,
}: {
  initialTimezone: string;
  initialMeetingRoomUrl: string | null;
  slots: SlotView[];
}) {
  const [pending, startTransition] = useTransition();
  const [timezone, setTimezone] = useState(initialTimezone);
  const [weekOffset, setWeekOffset] = useState(0);
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [sel, setSel] = useState<Selection | null>(null);

  const selRef = useRef<Selection | null>(null);
  const draggingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const tzOptions = useMemo(() => {
    const opts = [...TIMEZONE_OPTIONS];
    if (!opts.some((o) => o.value === timezone)) {
      opts.push({ value: timezone, label: timezone, short: tzShortLabel(timezone) });
    }
    return opts;
  }, [timezone]);

  const { days, nowRow } = useMemo(
    () => computeWeek(timezone, weekOffset),
    [timezone, weekOffset],
  );

  const short = tzShortLabel(timezone);
  const rangeLabel =
    days.length === 7
      ? `${days[0]!.mo}/${days[0]!.d} 〜 ${days[6]!.mo}/${days[6]!.d}`
      : '';

  // 既存の空き枠を「この週の」列にマッピング
  type Block = {
    id: string;
    col: number;
    topR: number;
    botR: number;
    hasBooking: boolean;
    label: string;
    jst: string;
  };
  const blocks = useMemo<Block[]>(() => {
    const out: Block[] = [];
    for (const s of slots) {
      const st = new Date(s.startIso);
      const en = new Date(s.endIso);
      const sw = wallPartsInTz(st, timezone);
      const key = `${sw.year}-${pad(sw.month)}-${pad(sw.day)}`;
      const col = days.findIndex((d) => d.key === key);
      if (col < 0) continue;
      const topR = sw.hour * 2 + (sw.minute >= 30 ? 1 : 0);
      const ew = wallPartsInTz(en, timezone);
      const sameDay = ew.year === sw.year && ew.month === sw.month && ew.day === sw.day;
      let botR = sameDay ? ew.hour * 2 + (ew.minute >= 30 ? 1 : 0) : ROWS;
      if (botR <= topR) botR = Math.min(topR + 1, ROWS);
      out.push({
        id: s.id,
        col,
        topR,
        botR,
        hasBooking: s.hasBooking,
        label: formatTimeRangeInTz(st, en, timezone),
        jst: formatTimeRangeInTz(st, en, 'Asia/Tokyo'),
      });
    }
    return out;
  }, [slots, timezone, days]);

  const runAdd = (input: Parameters<typeof addAvailabilityBulk>[0]) => {
    startTransition(async () => {
      const res = await addAvailabilityBulk(input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const { added = 0, extended = 0, skipped = 0 } = res.data ?? {};
      const parts = [
        added > 0 ? `${added} 件追加` : null,
        extended > 0 ? `${extended} 件を延長` : null,
      ].filter(Boolean);
      if (parts.length === 0) {
        toast(`すでに登録済みの枠でした（${skipped} 件）`);
        return;
      }
      toast.success(`空き枠を${parts.join('・')}しました`, {
        description: skipped > 0 ? `${skipped} 件は登録済みのためスキップ` : undefined,
      });
    });
  };

  const onDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteAvailability({ id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast('空き枠を削除しました');
    });
  };

  // ドラッグ確定（window の pointerup / pointercancel で拾う）
  useEffect(() => {
    const finish = () => {
      const s = selRef.current;
      selRef.current = null;
      draggingRef.current = false;
      setSel(null);
      if (!s) return;
      const { days: freshDays } = computeWeek(timezone, weekOffset);
      const col = freshDays[s.col];
      if (!col) return;
      const minR = Math.min(s.r0, s.r1);
      const maxR = Math.max(s.r0, s.r1);
      const startHm = hmFromRow(minR);
      const endRowExcl = maxR + 1;
      const endHm = endRowExcl >= ROWS ? '23:59' : hmFromRow(endRowExcl);
      if (repeatWeekly) {
        runAdd({
          mode: 'weekly',
          weekdays: [col.weekday],
          startHm,
          endHm,
          weeks: DEFAULT_BULK_WEEKS,
          timezone,
        });
      } else {
        runAdd({ mode: 'single', date: col.key, startHm, endHm, timezone });
      }
    };
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    return () => {
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  }, [timezone, weekOffset, repeatWeekly]);

  const cellDisabled = (day: DayCol, r: number) =>
    day.isPast || (day.isToday && r < nowRow);

  const startSel = (col: number, r: number, day: DayCol) => {
    if (cellDisabled(day, r)) return;
    draggingRef.current = true;
    const s = { col, r0: r, r1: r };
    selRef.current = s;
    setSel(s);
  };
  const extendSel = (col: number, r: number, day: DayCol) => {
    if (!draggingRef.current) return;
    const cur = selRef.current;
    if (!cur || cur.col !== col) return; // 同じ曜日の列内でのみ
    if (cellDisabled(day, r)) return;
    const s = { ...cur, r1: r };
    selRef.current = s;
    setSel(s);
  };

  return (
    <div>
      <div>
        <h2 className="text-[21px] font-bold">空き時間管理</h2>
        <p className="mt-1.5 max-w-[54em] text-[13px] text-neutral-500">
          相談を受けられる時間帯を、カレンダー上でドラッグして登録します。
          空き枠があると、プロフィールに「予約リクエスト」ボタンが表示されます。
        </p>
      </div>

      {/* タイムゾーン */}
      <div className="mt-5 flex flex-wrap items-center gap-3.5 rounded-2xl border border-border bg-background px-[18px] py-3.5">
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-neutral-700">
          <Globe className="h-[15px] w-[15px] text-primary-700" aria-hidden />
          タイムゾーン
        </span>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          aria-label="タイムゾーン"
          className={selectCls}
        >
          {tzOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="min-w-[220px] flex-1 text-[11.5px] leading-relaxed text-neutral-500">
          時間は<b className="text-neutral-700">あなたの現地時間（{short}）</b>
          で入力します。相談者には
          <b className="text-neutral-700">相談者の現地時間</b>で表示されます。
        </span>
      </div>

      {/* 相談の受け方（固定の相談室 URL） */}
      <MeetingRoomCard initialUrl={initialMeetingRoomUrl} />

      {/* ツールバー: 週送り + くり返しトグル */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w - 1)}
            disabled={weekOffset <= 0}
            aria-label="前の週"
            className="grid h-9 w-9 place-items-center rounded-full border border-border-strong bg-card text-neutral-700 transition hover:border-foreground disabled:opacity-40"
          >
            <ChevronLeft className="h-[18px] w-[18px]" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className="rounded-full border border-border-strong bg-card px-4 py-2 text-[12.5px] font-bold text-neutral-700 transition hover:border-foreground"
          >
            今週
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            aria-label="次の週"
            className="grid h-9 w-9 place-items-center rounded-full border border-border-strong bg-card text-neutral-700 transition hover:border-foreground"
          >
            <ChevronRight className="h-[18px] w-[18px]" aria-hidden />
          </button>
          <span className="ml-2 text-[13.5px] font-bold tabular-nums text-foreground">
            {rangeLabel}
          </span>
        </div>

        <div className="inline-flex overflow-hidden rounded-full border border-border-strong">
          <button
            type="button"
            onClick={() => setRepeatWeekly(false)}
            aria-pressed={!repeatWeekly}
            className={
              'px-3.5 py-2 text-[12.5px] font-bold transition ' +
              (!repeatWeekly
                ? 'bg-foreground text-background'
                : 'bg-card text-neutral-600 hover:text-foreground')
            }
          >
            1回だけ
          </button>
          <button
            type="button"
            onClick={() => setRepeatWeekly(true)}
            aria-pressed={repeatWeekly}
            className={
              'px-3.5 py-2 text-[12.5px] font-bold transition ' +
              (repeatWeekly
                ? 'bg-foreground text-background'
                : 'bg-card text-neutral-600 hover:text-foreground')
            }
          >
            毎週くり返す
          </button>
        </div>
      </div>

      {repeatWeekly ? (
        <p className="mt-2 text-[11.5px] text-primary-700">
          ドラッグした時間帯を、その曜日で今後 {DEFAULT_BULK_WEEKS} 週間分まとめて登録します。
        </p>
      ) : (
        <p className="mt-2 text-[11.5px] text-neutral-500">
          カレンダーを縦にドラッグして、空けたい時間帯を選んでください。既存の枠をクリックすると削除できます。
        </p>
      )}

      {/* カレンダー */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-[52px_repeat(7,1fr)] border-b border-border bg-background">
          <div />
          {days.map((day) => (
            <div
              key={day.key}
              className={
                'border-l border-border py-2 text-center ' +
                (day.isToday ? 'bg-primary-50' : '')
              }
            >
              <div
                className={
                  'text-[12px] font-bold ' +
                  (day.weekday === 0
                    ? 'text-danger-500'
                    : day.weekday === 6
                      ? 'text-primary-700'
                      : 'text-neutral-700')
                }
              >
                {WEEKDAY_JA[day.weekday]}
              </div>
              <div className="text-[11px] tabular-nums text-neutral-500">
                {day.mo}/{day.d}
              </div>
            </div>
          ))}
        </div>

        {/* スクロール領域 */}
        <div ref={scrollRef} className="max-h-[62vh] overflow-y-auto">
          <div className="grid select-none grid-cols-[52px_repeat(7,1fr)]">
            {/* 時間ラベル（0〜23時） */}
            <div className="relative" style={{ height: ROWS * ROW_H }}>
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  className="relative text-right"
                  style={{ height: ROW_H * 2 }}
                >
                  <span className="absolute -top-2 right-1.5 text-[10.5px] tabular-nums text-neutral-400">
                    {h === 0 ? '' : `${h}:00`}
                  </span>
                </div>
              ))}
            </div>

            {/* 各曜日の列 */}
            {days.map((day, col) => (
              <div
                key={day.key}
                className="relative border-l border-border"
                style={{ height: ROWS * ROW_H }}
              >
                {/* 30分セル */}
                {Array.from({ length: ROWS }, (_, r) => {
                  const disabled = cellDisabled(day, r);
                  const inSel =
                    sel &&
                    sel.col === col &&
                    r >= Math.min(sel.r0, sel.r1) &&
                    r <= Math.max(sel.r0, sel.r1);
                  return (
                    <div
                      key={r}
                      onPointerDown={(e) => {
                        if (disabled) return;
                        e.preventDefault();
                        startSel(col, r, day);
                      }}
                      onPointerEnter={() => extendSel(col, r, day)}
                      className={
                        (r % 2 === 0 ? 'border-t border-border' : 'border-t border-border/30') +
                        ' ' +
                        (disabled
                          ? 'cursor-not-allowed bg-muted/50'
                          : inSel
                            ? 'bg-primary-500/40'
                            : 'cursor-pointer hover:bg-primary-500/10')
                      }
                      style={{ height: ROW_H }}
                    />
                  );
                })}

                {/* 既存の空き枠ブロック */}
                {blocks
                  .filter((b) => b.col === col)
                  .map((b) => (
                    <div
                      key={b.id}
                      title={`${b.label}（日本時間 ${b.jst}）`}
                      className={
                        'group absolute inset-x-0.5 overflow-hidden rounded-md border px-1.5 py-1 text-left ' +
                        (b.hasBooking
                          ? 'border-primary-300 bg-primary-100'
                          : 'border-primary-700 bg-primary-500')
                      }
                      style={{
                        top: b.topR * ROW_H + 1,
                        height: (b.botR - b.topR) * ROW_H - 2,
                      }}
                    >
                      <div
                        className={
                          'text-[10.5px] font-bold leading-tight tabular-nums ' +
                          (b.hasBooking ? 'text-primary-900' : 'text-neutral-950')
                        }
                      >
                        {b.label}
                      </div>
                      {b.hasBooking ? (
                        <span className="mt-0.5 inline-flex items-center gap-0.5 text-[9.5px] font-bold text-primary-900">
                          <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                          予約あり
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onDelete(b.id)}
                          aria-label="この枠を削除"
                          className="absolute right-0.5 top-0.5 hidden h-5 w-5 place-items-center rounded-full bg-neutral-950/15 text-neutral-950 hover:bg-neutral-950/30 group-hover:grid"
                        >
                          <Trash2 className="h-3 w-3" aria-hidden />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>

        {/* 凡例 */}
        <div className="flex flex-wrap items-center gap-4 border-t border-border bg-background px-4 py-2.5 text-[11px] text-neutral-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-primary-700 bg-primary-500" aria-hidden />
            空き枠
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-primary-300 bg-primary-100" aria-hidden />
            予約あり（削除不可）
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-muted" aria-hidden />
            過去（登録不可）
          </span>
        </div>
      </div>
    </div>
  );
}
