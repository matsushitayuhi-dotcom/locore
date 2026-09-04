'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Check, Globe, Plus, Trash2 } from 'lucide-react';
import {
  addAvailabilityBulk,
  deleteAvailability,
} from '@/lib/bookings/actions';
import {
  DEFAULT_BULK_WEEKS,
  TIMEZONE_OPTIONS,
  tzShortLabel,
} from '@/lib/bookings/constants';
import {
  formatTimeRangeInTz,
  localToUtc,
  formatTimeInTz,
  wallPartsInTz,
} from '@/lib/bookings/time';

/**
 * 空き時間管理の Client 部分（booking-slice モック 1/5 準拠）。
 *
 * - 入力はエキスパートの現地時間（timezone セレクト）、一覧は現地時間主表示＋日本時間併記
 * - 「毎週◯曜」の一括追加が主役、単発追加は従
 * - 予約が入った枠はライム背景の「予約あり」バッジ付きで削除不可
 */

type SlotView = {
  id: string;
  startIso: string;
  endIso: string;
  hasBooking: boolean;
};

const WEEKDAY_CHIPS: Array<{ dow: number; label: string }> = [
  { dow: 1, label: '月' },
  { dow: 2, label: '火' },
  { dow: 3, label: '水' },
  { dow: 4, label: '木' },
  { dow: 5, label: '金' },
  { dow: 6, label: '土' },
  { dow: 0, label: '日' },
];

const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;

const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

function todayStrInTz(tz: string): string {
  const w = wallPartsInTz(new Date(), tz);
  return `${w.year}-${String(w.month).padStart(2, '0')}-${String(w.day).padStart(2, '0')}`;
}

const selectCls =
  'appearance-none rounded-full border border-border-strong bg-card px-4 py-2 pr-8 text-[13.5px] font-bold tabular-nums text-foreground outline-none focus:border-primary-500';

export function AvailabilityManager({
  initialTimezone,
  slots,
}: {
  initialTimezone: string;
  slots: SlotView[];
}) {
  const [pending, startTransition] = useTransition();
  const [timezone, setTimezone] = useState(initialTimezone);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [wStart, setWStart] = useState('13:00');
  const [wEnd, setWEnd] = useState('15:00');
  const [sDate, setSDate] = useState('');
  const [sStart, setSStart] = useState('10:00');
  const [sEnd, setSEnd] = useState('11:00');

  const tzOptions = useMemo(() => {
    const opts = [...TIMEZONE_OPTIONS];
    if (!opts.some((o) => o.value === timezone)) {
      opts.push({ value: timezone, label: timezone, short: tzShortLabel(timezone) });
    }
    return opts;
  }, [timezone]);

  // 現地→日本時間の目安（今日の日付で換算） e.g. '日本時間 20:00〜22:00'
  const jstPreview = useMemo(() => {
    try {
      const d = todayStrInTz(timezone);
      const s = formatTimeInTz(localToUtc(timezone, d, wStart), 'Asia/Tokyo');
      const e = formatTimeInTz(localToUtc(timezone, d, wEnd), 'Asia/Tokyo');
      return `${s}〜${e}`;
    } catch {
      return '';
    }
  }, [timezone, wStart, wEnd]);

  const toggleDay = (dow: number) =>
    setWeekdays((ds) =>
      ds.includes(dow) ? ds.filter((d) => d !== dow) : [...ds, dow],
    );

  // 一覧の更新はアクション内の revalidatePath('/settings/availability') に任せる
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
        toast(`すべて登録済みの枠でした（${skipped} 件スキップ）`);
        return;
      }
      toast.success(`空き枠を${parts.join('・')}しました`, {
        description:
          skipped > 0 ? `${skipped} 件は登録済みのためスキップ` : undefined,
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

  // 週ごとにグルーピング（本人 TZ の月曜はじまり）
  const weeks = useMemo(() => {
    const map = new Map<string, { label: string; rows: SlotView[] }>();
    for (const s of [...slots].sort((a, b) => a.startIso.localeCompare(b.startIso))) {
      const w = wallPartsInTz(new Date(s.startIso), timezone);
      // 月曜はじまりの週頭日付
      const back = (w.weekday + 6) % 7;
      const monday = new Date(Date.UTC(w.year, w.month - 1, w.day - back));
      const key = monday.toISOString().slice(0, 10);
      const label = `${monday.getUTCMonth() + 1}/${monday.getUTCDate()}の週`;
      const g = map.get(key) ?? { label, rows: [] };
      g.rows.push(s);
      map.set(key, g);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, g]) => g);
  }, [slots, timezone]);

  const short = tzShortLabel(timezone);

  return (
    <div>
      <div>
        <h2 className="text-[21px] font-bold">空き時間管理</h2>
        <p className="mt-1.5 max-w-[52em] text-[13px] text-neutral-500">
          相談を受けられる時間帯を登録してください。空き枠があると、プロフィールに「予約リクエスト」ボタンが表示されます。
        </p>
      </div>

      {/* タイムゾーン行 */}
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
          時間は<b className="text-neutral-700">あなたの現地時間</b>
          で入力します。相談者には<b className="text-neutral-700">日本時間</b>
          で表示されます。
        </span>
      </div>

      {/* 追加フォーム 2 枚 */}
      <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* weekly */}
        <div className="rounded-2xl border border-border bg-card px-[22px] py-5 shadow-xs">
          <div className="flex items-center gap-2 text-[13.5px] font-bold">
            <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-primary-700">
              Weekly
            </span>
            毎週の空き時間を一括追加
          </div>
          <p className="mt-0.5 text-[11.5px] text-neutral-500">
            選んだ曜日・時間帯を、今後{DEFAULT_BULK_WEEKS}週間分まとめて登録します。
          </p>
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {WEEKDAY_CHIPS.map((d) => {
              const on = weekdays.includes(d.dow);
              return (
                <button
                  key={d.dow}
                  type="button"
                  onClick={() => toggleDay(d.dow)}
                  aria-pressed={on}
                  className={
                    'grid h-10 w-10 place-items-center rounded-full border text-[13px] transition ' +
                    (on
                      ? 'border-primary-500 bg-primary-500 font-bold text-neutral-950'
                      : 'border-border-strong bg-card font-medium text-neutral-700 hover:border-primary-700 hover:text-primary-700')
                  }
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
            <select value={wStart} onChange={(e) => setWStart(e.target.value)} aria-label="開始時刻" className={selectCls}>
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <span className="text-[13px] text-neutral-500">〜</span>
            <select value={wEnd} onChange={(e) => setWEnd(e.target.value)} aria-label="終了時刻" className={selectCls}>
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {jstPreview ? (
              <span className="text-[11px] text-neutral-500">
                {short}（日本時間 {jstPreview}）
              </span>
            ) : null}
          </div>
          <button
            type="button"
            disabled={pending || weekdays.length === 0}
            onClick={() =>
              runAdd({
                mode: 'weekly',
                weekdays,
                startHm: wStart,
                endHm: wEnd,
                weeks: DEFAULT_BULK_WEEKS,
                timezone,
              })
            }
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary-500 py-2.5 text-[13.5px] font-bold text-neutral-950 shadow-sm transition hover:bg-primary-300 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            今後{DEFAULT_BULK_WEEKS}週間分に追加
          </button>
        </div>

        {/* one-off */}
        <div className="rounded-2xl border border-border bg-card px-[22px] py-5 shadow-xs">
          <div className="flex items-center gap-2 text-[13.5px] font-bold">
            <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-primary-700">
              One-off
            </span>
            単発で追加
          </div>
          <p className="mt-0.5 text-[11.5px] text-neutral-500">
            特定の日だけ空けたいときに。
          </p>
          <div className="mt-3.5">
            <input
              type="date"
              value={sDate}
              min={todayStrInTz(timezone)}
              onChange={(e) => setSDate(e.target.value)}
              aria-label="日付"
              className="rounded-full border border-border-strong bg-card px-4 py-2 text-[13.5px] font-bold tabular-nums text-foreground outline-none focus:border-primary-500"
            />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
            <select value={sStart} onChange={(e) => setSStart(e.target.value)} aria-label="開始時刻" className={selectCls}>
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <span className="text-[13px] text-neutral-500">〜</span>
            <select value={sEnd} onChange={(e) => setSEnd(e.target.value)} aria-label="終了時刻" className={selectCls}>
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={pending || !sDate}
            onClick={() =>
              runAdd({
                mode: 'single',
                date: sDate,
                startHm: sStart,
                endHm: sEnd,
                timezone,
              })
            }
            className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-border-strong bg-card py-2.5 text-[13px] font-bold text-neutral-700 transition hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            この日だけ追加
          </button>
        </div>
      </div>

      {/* 登録済み一覧（週ごと） */}
      <div className="mt-7">
        {weeks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-strong bg-muted px-6 py-9 text-center text-[13px] text-neutral-500">
            まだ空き枠がありません。まずは週1枠から登録してみましょう。
          </div>
        ) : (
          weeks.map((wk) => (
            <div key={wk.label}>
              <div className="mb-2 mt-5 flex items-center gap-3 text-[12px] font-semibold tabular-nums text-neutral-500">
                {wk.label}
                <span className="h-px flex-1 bg-border" aria-hidden />
              </div>
              <div className="flex flex-col gap-2">
                {wk.rows.map((s) => {
                  const start = new Date(s.startIso);
                  const end = new Date(s.endIso);
                  const w = wallPartsInTz(start, timezone);
                  return (
                    <div
                      key={s.id}
                      className={
                        'flex flex-wrap items-center gap-3.5 rounded-xl border px-4 py-3 shadow-xs ' +
                        (s.hasBooking
                          ? 'border-primary-100 bg-primary-50'
                          : 'border-border bg-card')
                      }
                    >
                      <span className="w-14 shrink-0 text-center leading-tight">
                        <b className="block text-[14px]">{WEEKDAY_JA[w.weekday]}</b>
                        <span className="text-[10.5px] tabular-nums text-neutral-500">
                          {w.month}/{w.day}
                        </span>
                      </span>
                      <span className="text-[14px] font-semibold tabular-nums">
                        {formatTimeRangeInTz(start, end, timezone)}
                        <small className="ml-1 text-[11px] font-normal text-neutral-500">
                          {short}
                        </small>
                      </span>
                      <span className="text-[11.5px] text-neutral-500">
                        日本時間 {formatTimeRangeInTz(start, end, 'Asia/Tokyo')}
                      </span>
                      {s.hasBooking ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary-300 bg-primary-100 px-2.5 py-0.5 text-[11px] font-bold text-primary-900">
                          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                          予約あり
                        </span>
                      ) : null}
                      <span className="flex-1" />
                      {!s.hasBooking ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onDelete(s.id)}
                          aria-label="削除"
                          className="grid h-8 w-8 place-items-center rounded-full text-neutral-400 transition hover:bg-danger-50 hover:text-danger-500"
                        >
                          <Trash2 className="h-[15px] w-[15px]" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
