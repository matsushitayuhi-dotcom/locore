/**
 * 予約スライスのタイムゾーン変換・表示ヘルパ（依存追加なしの Intl ベース）。
 *
 * ルール（booking-slice モック準拠）:
 *   - 空き枠の入力はエキスパートの現地時間 → UTC に展開して保存
 *   - 相談者への表示はすべて日本時間（時差の換算をユーザーにさせない）
 *   - エキスパート向け表示は本人の現地時間を主、日本時間を併記
 *
 * server / client 両方から使える純関数のみ。
 */

const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;

type WallParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0=日
};

/** UTC 時刻を tz の壁時計に分解する */
export function wallPartsInTz(utc: Date, tz: string): WallParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  }).formatToParts(utc);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const wdMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
    weekday: wdMap[get('weekday')] ?? 0,
  };
}

function tzOffsetMs(tz: string, utc: Date): number {
  const w = wallPartsInTz(utc, tz);
  return (
    Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute) - utc.getTime()
  );
}

/**
 * tz の現地日時（date='YYYY-MM-DD', hm='HH:MM'）を UTC Date に変換する。
 * Intl.formatToParts でオフセットを逆算（DST 跨ぎは 2 回反復で収束）。
 */
export function localToUtc(tz: string, date: string, hm: string): Date {
  const [y, mo, d] = date.split('-').map(Number);
  const [hh, mm] = hm.split(':').map(Number);
  if (!y || !mo || !d || hh == null || mm == null || Number.isNaN(hh)) {
    throw new Error(`invalid local datetime: ${date} ${hm}`);
  }
  const wall = Date.UTC(y, mo - 1, d, hh, mm);
  let ts = wall;
  for (let i = 0; i < 2; i++) {
    ts = wall - tzOffsetMs(tz, new Date(ts));
  }
  return new Date(ts);
}

function two(n: number): string {
  return String(n).padStart(2, '0');
}

/** '9/18(金)' 形式（tz の壁時計）。 */
export function formatDateShortInTz(utc: Date, tz: string): string {
  const w = wallPartsInTz(utc, tz);
  return `${w.month}/${w.day}(${WEEKDAY_JA[w.weekday]})`;
}

/** '20:00' 形式（tz の壁時計）。 */
export function formatTimeInTz(utc: Date, tz: string): string {
  const w = wallPartsInTz(utc, tz);
  return `${two(w.hour)}:${two(w.minute)}`;
}

/**
 * '9/18(金) 20:00–20:30' 形式（tz の壁時計）。end 省略時は '9/18(金) 20:00'。
 * 終了が翌日に跨るときは終了側に「翌」を付ける。
 */
export function formatSlotInTz(utc: Date, tz: string, end?: Date): string {
  const s = wallPartsInTz(utc, tz);
  const head = `${s.month}/${s.day}(${WEEKDAY_JA[s.weekday]}) ${two(s.hour)}:${two(s.minute)}`;
  if (!end) return head;
  const e = wallPartsInTz(end, tz);
  const nextDay = e.day !== s.day || e.month !== s.month;
  return `${head}–${nextDay ? '翌' : ''}${two(e.hour)}:${two(e.minute)}`;
}

/** 日本時間の '9/18(金) 20:00–20:30'。相談者向け表示の既定 */
export function formatSlotJst(utc: Date, end?: Date): string {
  return formatSlotInTz(utc, 'Asia/Tokyo', end);
}

/** 日本時間の '20:00–22:00'（同日前提の時刻レンジ。跨ぎは「翌」付き） */
export function formatTimeRangeInTz(start: Date, end: Date, tz: string): string {
  const s = wallPartsInTz(start, tz);
  const e = wallPartsInTz(end, tz);
  const nextDay = e.day !== s.day || e.month !== s.month;
  return `${two(s.hour)}:${two(s.minute)}–${nextDay ? '翌' : ''}${two(e.hour)}:${two(e.minute)}`;
}

/** '9月18日（金）' 形式（日本時間）。リクエストページの日付グルーピング見出し用 */
export function formatDateLongJst(utc: Date): string {
  const w = wallPartsInTz(utc, 'Asia/Tokyo');
  return `${w.month}月${w.day}日（${WEEKDAY_JA[w.weekday]}）`;
}

/** 日本時間の日付キー 'YYYY-MM-DD'（グルーピング用） */
export function jstDateKey(utc: Date): string {
  const w = wallPartsInTz(utc, 'Asia/Tokyo');
  return `${w.year}-${two(w.month)}-${two(w.day)}`;
}

/** tz での日付キー 'YYYY-MM-DD' */
export function dateKeyInTz(utc: Date, tz: string): string {
  const w = wallPartsInTz(utc, tz);
  return `${w.year}-${two(w.month)}-${two(w.day)}`;
}
