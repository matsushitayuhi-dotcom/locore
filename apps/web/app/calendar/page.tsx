import Link from 'next/link';
import { and, eq, gte, lte, asc, desc, or, sql } from 'drizzle-orm';
import { ChevronLeft, ChevronRight, MapPin, ExternalLink } from 'lucide-react';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import {
  BOARD_CATEGORIES,
  BOARD_CATEGORY_LABEL,
  type BoardCategory,
} from '@/lib/board/constants';

/**
 * /calendar — パリのイベントカレンダー。
 *
 * board_posts.event_date を月のグリッドに配置する。Vercel Cron と
 * /admin/board の「本番実行」で蓄積された AI 自動収集ニュース、
 * 手動投稿ニュースの両方を扱う。
 *
 * URL クエリ:
 *   - y=YYYY        表示月 (年)
 *   - m=1..12       表示月 (月)
 *   - cat=event,transit,...   カテゴリフィルタ (カンマ区切り)
 *   - date=YYYY-MM-DD         選択中の日付 (詳細を下に展開)
 */

export const metadata = { title: 'イベントカレンダー — Locore' };
export const dynamic = 'force-dynamic';

type Search = {
  y?: string;
  m?: string;
  cat?: string;
  date?: string;
};

// ============================================================================
// 日付ユーティリティ
// ============================================================================

function clampMonth(y: number, m: number): { year: number; month: number } {
  const d = new Date(y, m - 1, 1);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function parseSearch(s: Search | undefined) {
  const now = new Date();
  const y = parseInt(s?.y ?? String(now.getFullYear()), 10);
  const m = parseInt(s?.m ?? String(now.getMonth() + 1), 10);
  const { year, month } = clampMonth(
    Number.isFinite(y) ? y : now.getFullYear(),
    Number.isFinite(m) ? m : now.getMonth() + 1,
  );
  const cat = (s?.cat ?? '')
    .split(',')
    .filter((x): x is BoardCategory =>
      (BOARD_CATEGORIES as readonly string[]).includes(x),
    );
  const date =
    s?.date && /^\d{4}-\d{2}-\d{2}$/.test(s.date) ? s.date : null;
  return { year, month, cat, date };
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthBounds(year: number, month: number) {
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0); // 月末
  return {
    from,
    to,
    fromStr: ymd(from),
    toStr: ymd(to),
  };
}

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

// ============================================================================
// データ取得
// ============================================================================

type CalEvent = {
  id: string;
  title: string;
  body: string;
  category: BoardCategory;
  /** 後方互換用 (start と同値)。表示には start/end を使う。 */
  eventDate: string;
  eventStartDate: string;
  eventEndDate: string;
  eventLocation: string | null;
  sourceUrls: Array<{ name: string; url: string }>;
};

async function loadMonthEvents(
  year: number,
  month: number,
  cat: BoardCategory[],
): Promise<CalEvent[]> {
  const { fromStr, toStr } = monthBounds(year, month);
  const db = getDb();
  try {
    // 期間イベントは「表示月と少しでも重なれば」ヒットさせる:
    //   start <= 月末 AND end >= 月初
    // 旧データ (start/end が NULL) は eventDate を fallback として使う。
    const effectiveStart = sql<string>`COALESCE(${schema.boardPosts.eventStartDate}, ${schema.boardPosts.eventDate})`;
    const effectiveEnd = sql<string>`COALESCE(${schema.boardPosts.eventEndDate}, ${schema.boardPosts.eventDate})`;

    const rows = await db
      .select({
        id: schema.boardPosts.id,
        title: schema.boardPosts.title,
        body: schema.boardPosts.body,
        category: schema.boardPosts.category,
        eventDate: schema.boardPosts.eventDate,
        eventStartDate: schema.boardPosts.eventStartDate,
        eventEndDate: schema.boardPosts.eventEndDate,
        eventLocation: schema.boardPosts.eventLocation,
        sourceUrls: schema.boardPosts.sourceUrls,
      })
      .from(schema.boardPosts)
      .where(
        and(
          eq(schema.boardPosts.status, 'published'),
          // 月末以前に開始、かつ月初以降に終了 → 月と重なる
          or(
            sql`${effectiveStart} IS NOT NULL`,
            sql`${effectiveEnd} IS NOT NULL`,
          ),
          sql`${effectiveStart} <= ${toStr}`,
          sql`${effectiveEnd} >= ${fromStr}`,
        ),
      )
      // UAT 指摘: 月内一覧 / 選択日詳細では「新しい開始日が上」になるように
      // DESC で取得する。カレンダーグリッドはセルの日付順に従うので、
      // この並び順はリスト表示にのみ影響する。
      .orderBy(desc(effectiveStart));

    return rows
      .filter((r) => (cat.length === 0 ? true : cat.includes(r.category as BoardCategory)))
      .map((r) => {
        const start =
          (r.eventStartDate as string | null) ??
          (r.eventDate as string | null) ??
          '';
        const end =
          (r.eventEndDate as string | null) ??
          (r.eventDate as string | null) ??
          start;
        return {
          id: r.id,
          title: r.title,
          body: r.body,
          category: r.category as BoardCategory,
          eventDate: start,
          eventStartDate: start,
          eventEndDate: end || start,
          eventLocation: r.eventLocation,
          sourceUrls: (r.sourceUrls as { name: string; url: string }[] | null) ?? [],
        };
      })
      // start_date が確定できないレコードはカレンダーに出さない (壊れたデータ保険)
      .filter((e) => !!e.eventStartDate);
  } catch (err) {
    console.error('[calendar] loadMonthEvents failed:', err);
    return [];
  }
}

// ============================================================================
// カテゴリ別の見た目
// ============================================================================

const CATEGORY_COLOR: Record<BoardCategory, { dot: string; chip: string; text: string }> = {
  event: { dot: 'bg-primary-500', chip: 'bg-primary-500/15', text: 'text-primary-300' },
  transit: { dot: 'bg-danger-500', chip: 'bg-danger-500/15', text: 'text-danger-500' },
  admin: { dot: 'bg-amber-500', chip: 'bg-amber-500/15', text: 'text-amber-600' },
  food_season: { dot: 'bg-success-500', chip: 'bg-success-500/15', text: 'text-success-500' },
  community: { dot: 'bg-accent-300', chip: 'bg-accent-300/30', text: 'text-foreground/75' },
  family_edu: { dot: 'bg-primary-300', chip: 'bg-primary-300/15', text: 'text-primary-300' },
  health_weather: { dot: 'bg-foreground/60', chip: 'bg-muted', text: 'text-foreground/65' },
};

// ============================================================================
// ページ本体
// ============================================================================

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Search;
}) {
  const { year, month, cat, date: selectedDate } = parseSearch(searchParams);
  const events = await loadMonthEvents(year, month, cat);

  // 日付別にバケット化。期間イベントは start〜end の全日に登場させる。
  const byDay = new Map<string, CalEvent[]>();
  const { fromStr: monthStart, toStr: monthEnd } = monthBounds(year, month);
  for (const e of events) {
    const start = e.eventStartDate;
    const end = e.eventEndDate || e.eventStartDate;
    if (!start) continue;
    // 月をはみ出す期間はカレンダー上は今月分のセルだけに入れる
    const clampedStart = start < monthStart ? monthStart : start;
    const clampedEnd = end > monthEnd ? monthEnd : end;
    // 文字列日付を Date 経由でイテレートする。タイムゾーンを UTC で扱って
    // 1 日ズレを防ぐ。
    const startMs = Date.parse(clampedStart + 'T00:00:00Z');
    const endMs = Date.parse(clampedEnd + 'T00:00:00Z');
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;
    for (let t = startMs; t <= endMs; t += 24 * 60 * 60 * 1000) {
      const d = new Date(t);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      const arr = byDay.get(key) ?? [];
      arr.push(e);
      byDay.set(key, arr);
    }
  }

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, +1);
  const buildHref = (overrides: Partial<{ y: number; m: number; cat: string; date: string | null }>) => {
    const params = new URLSearchParams();
    params.set('y', String(overrides.y ?? year));
    params.set('m', String(overrides.m ?? month));
    const c = overrides.cat ?? cat.join(',');
    if (c) params.set('cat', c);
    const d = overrides.date === undefined ? selectedDate : overrides.date;
    if (d) params.set('date', d);
    return `/calendar?${params.toString()}`;
  };

  // 月グリッド: 日曜始まり、6 行分のセルを作る
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstDow = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: { date: string | null; dayNum: number | null; inMonth: boolean }[] = [];
  // 前月の空セル
  for (let i = 0; i < firstDow; i++) {
    cells.push({ date: null, dayNum: null, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: ymd(new Date(year, month - 1, d)),
      dayNum: d,
      inMonth: true,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, dayNum: null, inMonth: false });
  }

  const today = ymd(new Date());
  const selectedEvents = selectedDate ? byDay.get(selectedDate) ?? [] : [];

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-screen-lg px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
              Calendar
            </p>
            <h1 className="mt-1 text-[22px] font-semibold tracking-tight sm:text-[28px]">
              {year} 年 {month} 月のイベント
            </h1>
            <p className="mt-1 text-[12px] text-foreground/60">
              AI 自動収集と手動投稿を合わせた、パリの今月のイベント・交通障害・食季節情報。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={buildHref({ y: prev.year, m: prev.month, date: null })}
              className="rounded-md bg-card px-3 py-1.5 text-[12px] ring-1 ring-border hover:bg-muted"
              aria-label="前の月"
            >
              <ChevronLeft className="inline h-3.5 w-3.5" />
              {prev.year}/{prev.month}
            </Link>
            <Link
              href={buildHref({ y: next.year, m: next.month, date: null })}
              className="rounded-md bg-card px-3 py-1.5 text-[12px] ring-1 ring-border hover:bg-muted"
              aria-label="次の月"
            >
              {next.year}/{next.month}
              <ChevronRight className="ml-0.5 inline h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        {/* カテゴリフィルタ */}
        <section className="mb-4 flex flex-wrap gap-1.5">
          <FilterChip
            label="すべて"
            active={cat.length === 0}
            href={buildHref({ cat: '', date: null })}
          />
          {BOARD_CATEGORIES.map((c) => {
            const active = cat.includes(c);
            const nextCat = active
              ? cat.filter((x) => x !== c)
              : [...cat, c];
            return (
              <FilterChip
                key={c}
                label={BOARD_CATEGORY_LABEL[c]}
                active={active}
                colorDot={CATEGORY_COLOR[c].dot}
                href={buildHref({ cat: nextCat.join(','), date: null })}
              />
            );
          })}
        </section>

        {/* 月グリッド */}
        <section className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
          {/* 曜日ヘッダ */}
          <div className="grid grid-cols-7 border-b border-border bg-background/40 text-center text-[10px] font-bold uppercase tracking-wider text-foreground/55">
            {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
              <div
                key={i}
                className={
                  'py-2 ' +
                  (i === 0 ? 'text-danger-500/80' : i === 6 ? 'text-primary-300' : '')
                }
              >
                {d}
              </div>
            ))}
          </div>
          {/* 日付セル */}
          <div className="grid grid-cols-7">
            {cells.map((c, i) => {
              if (!c.date) {
                return (
                  <div
                    key={i}
                    className="aspect-square border-b border-r border-border/60 bg-background/20"
                  />
                );
              }
              const dayEvents = byDay.get(c.date) ?? [];
              const isToday = c.date === today;
              const isSelected = c.date === selectedDate;
              return (
                <Link
                  key={c.date}
                  href={buildHref({ date: isSelected ? null : c.date })}
                  className={
                    'group relative flex aspect-square flex-col gap-0.5 border-b border-r border-border/60 p-1.5 transition hover:bg-primary-500/5 sm:p-2 ' +
                    (isSelected ? 'bg-primary-500/10 ring-1 ring-inset ring-primary-300' : '')
                  }
                >
                  <span
                    className={
                      'text-[10px] font-bold tabular sm:text-[12px] ' +
                      (isToday
                        ? 'inline-flex h-5 w-5 items-center justify-center self-start rounded-full bg-primary-500 text-neutral-950 sm:h-6 sm:w-6'
                        : c.date.endsWith('') && new Date(c.date).getDay() === 0
                          ? 'text-danger-500/80'
                          : new Date(c.date).getDay() === 6
                            ? 'text-primary-300'
                            : 'text-foreground/80')
                    }
                  >
                    {c.dayNum}
                  </span>
                  {/* イベントドット (最大 3 個) */}
                  {dayEvents.length > 0 ? (
                    <div className="flex flex-wrap gap-0.5 sm:gap-1">
                      {dayEvents.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          className={
                            'h-1.5 w-1.5 rounded-full ' +
                            CATEGORY_COLOR[e.category].dot
                          }
                          aria-label={BOARD_CATEGORY_LABEL[e.category]}
                        />
                      ))}
                      {dayEvents.length > 3 ? (
                        <span className="text-[8px] tabular text-foreground/55">
                          +{dayEvents.length - 3}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {/* タイトル先頭を 1 行だけ表示 (スマホでは非表示) */}
                  {dayEvents[0] ? (
                    <p className="mt-auto hidden truncate text-[10px] leading-tight text-foreground/65 sm:block">
                      {dayEvents[0].title}
                    </p>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </section>

        {/* 選択中の日の詳細 */}
        {selectedDate ? (
          <section
            className="mt-6 rounded-xl bg-card p-5 ring-1 ring-border sm:p-6"
            id="detail"
          >
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[18px] font-semibold tracking-tight">
                {formatDateLabel(selectedDate)}
              </h2>
              <Link
                href={buildHref({ date: null })}
                className="text-[11px] text-foreground/55 hover:underline"
              >
                閉じる
              </Link>
            </div>
            {selectedEvents.length === 0 ? (
              <p className="rounded-md bg-muted px-3 py-2 text-[12px] text-foreground/60">
                この日のイベントはまだ登録されていません。
              </p>
            ) : (
              <ul className="space-y-3">
                {selectedEvents.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {/* 月の全件サマリー (カレンダーが空のときの導線) */}
        {events.length === 0 ? (
          <section className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-center text-[12px] text-foreground/55">
            <p>この月にはまだイベントが登録されていません。</p>
            <p className="mt-2">
              管理者は{' '}
              <Link
                href="/admin/board"
                className="font-semibold text-primary-300 hover:underline"
              >
                /admin/board
              </Link>{' '}
              から「本番実行 (投稿)」ボタンで AI 取得を実行できます。
            </p>
          </section>
        ) : null}

        {/* 月のリスト (折りたたみ無しで素直に出す) */}
        {events.length > 0 ? (
          <details className="mt-6 rounded-xl bg-card ring-1 ring-border">
            <summary className="cursor-pointer px-5 py-3 text-[13px] font-semibold sm:px-6">
              この月のイベントを一覧で見る ({events.length} 件)
            </summary>
            <ul className="divide-y divide-border">
              {events.map((e) => (
                <li key={e.id} className="px-5 py-3 sm:px-6">
                  <EventCard event={e} compact />
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </main>
  );
}

// ============================================================================
// 小さな部品
// ============================================================================

function FilterChip({
  label,
  active,
  href,
  colorDot,
}: {
  label: string;
  active: boolean;
  href: string;
  colorDot?: string;
}) {
  return (
    <Link
      href={href}
      className={
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
        (active
          ? 'bg-foreground text-background'
          : 'bg-card text-foreground/65 ring-1 ring-border hover:bg-muted')
      }
    >
      {colorDot ? (
        <span className={`h-1.5 w-1.5 rounded-full ${colorDot}`} />
      ) : null}
      {label}
    </Link>
  );
}

function EventCard({ event, compact }: { event: CalEvent; compact?: boolean }) {
  const color = CATEGORY_COLOR[event.category];
  return (
    <div className="flex gap-3">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${color.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${color.chip} ${color.text}`}
          >
            {BOARD_CATEGORY_LABEL[event.category]}
          </span>
          <span className="text-[11px] tabular text-foreground/55">
            {formatDateRangeLabel(event.eventStartDate, event.eventEndDate)}
          </span>
        </div>
        <p className="mt-1 text-[14px] font-semibold leading-snug">
          {event.title}
        </p>
        {!compact ? (
          <p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed text-foreground/70">
            {event.body}
          </p>
        ) : null}
        {event.eventLocation ? (
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-foreground/55">
            <MapPin className="h-3 w-3" />
            {event.eventLocation}
          </p>
        ) : null}
        {!compact && event.sourceUrls.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {event.sourceUrls.map((s, i) => (
              <li key={i}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground/65 hover:bg-primary-500/10 hover:text-primary-300"
                >
                  {s.name}
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function formatDateLabel(dateStr: string): string {
  const parts = dateStr.split('-').map((s) => parseInt(s, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return dateStr;
  const d = new Date(parts[0]!, parts[1]! - 1, parts[2]!);
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${parts[1]}月${parts[2]}日 (${weekday})`;
}

/**
 * start と end が同じなら単日表記、違えば「M/D(曜) 〜 M/D(曜)」。
 */
function formatDateRangeLabel(start: string, end: string | null | undefined): string {
  if (!end || start === end) return formatDateLabel(start);
  return `${formatDateLabel(start)} 〜 ${formatDateLabel(end)}`;
}
