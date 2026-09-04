import 'server-only';
import { and, asc, eq, gt, inArray, lt } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import {
  BLOCKING_STATUSES,
  BOOKING_WINDOW_DAYS,
  MIN_LEAD_HOURS,
  SLOT_STEP_MINUTES,
} from './constants';

/**
 * 空き枠の読み取りクエリ。
 *
 * 0061 未適用環境ではテーブルが無いので、すべて try/catch で
 * 「空き枠なし（予約 CTA 非表示・従来チャット導線のみ）」にフォールバックする。
 */

export type AvailabilitySlot = {
  id: string;
  startAt: Date;
  endAt: Date;
  /** requested / accepted / paid の予約がこの枠に重なっているか（削除不可バッジ用） */
  hasBooking: boolean;
};

/** エキスパート本人の空き枠一覧（from 以降、開始昇順）。設定画面用 */
export async function listAvailability(
  userId: string,
  from: Date = new Date(),
): Promise<AvailabilitySlot[]> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.expertAvailability.id,
        startAt: schema.expertAvailability.startAt,
        endAt: schema.expertAvailability.endAt,
      })
      .from(schema.expertAvailability)
      .where(
        and(
          eq(schema.expertAvailability.userId, userId),
          gt(schema.expertAvailability.endAt, from),
        ),
      )
      .orderBy(asc(schema.expertAvailability.startAt))
      .limit(200);
    if (rows.length === 0) return [];

    // 予約取得の上限境界は「全枠の endAt の最大」（startAt 順の最終行の endAt だと
    // 長い枠が先にあるケースでバッジ判定が漏れる）
    const rangeEnd = rows.reduce(
      (max, r) => (r.endAt > max ? r.endAt : max),
      rows[0]!.endAt,
    );
    const bookings = await db
      .select({
        startAt: schema.consultationBookings.startAt,
        endAt: schema.consultationBookings.endAt,
      })
      .from(schema.consultationBookings)
      .where(
        and(
          eq(schema.consultationBookings.expertId, userId),
          inArray(schema.consultationBookings.status, [...BLOCKING_STATUSES]),
          gt(schema.consultationBookings.endAt, from),
          lt(schema.consultationBookings.startAt, rangeEnd),
        ),
      );

    return rows.map((r) => ({
      id: r.id,
      startAt: r.startAt,
      endAt: r.endAt,
      hasBooking: bookings.some(
        (b) => b.startAt < r.endAt && b.endAt > r.startAt,
      ),
    }));
  } catch (err) {
    console.warn('[listAvailability] failed (0061 未適用?):', err);
    return [];
  }
}

/**
 * 相談者向け: あるエキスパートの「開始時刻候補」を返す（UTC Date、昇順）。
 *
 * 今後 BOOKING_WINDOW_DAYS 日の空き枠 window から SLOT_STEP_MINUTES 刻みで
 * 開始候補を生成し、
 *   - いまから MIN_LEAD_HOURS 時間以内に始まる候補
 *   - start + durationMinutes が window に収まらない候補
 *   - requested / accepted / paid の既存予約と重なる候補
 * を除外する。
 */
export async function listOpenStartTimes(
  expertId: string,
  durationMinutes: number,
): Promise<Date[]> {
  const durMs = Math.max(durationMinutes, SLOT_STEP_MINUTES) * 60_000;
  const from = new Date(Date.now() + MIN_LEAD_HOURS * 3_600_000);
  const to = new Date(Date.now() + BOOKING_WINDOW_DAYS * 86_400_000);
  try {
    const db = getDb();
    const [windows, bookings] = await Promise.all([
      db
        .select({
          startAt: schema.expertAvailability.startAt,
          endAt: schema.expertAvailability.endAt,
        })
        .from(schema.expertAvailability)
        .where(
          and(
            eq(schema.expertAvailability.userId, expertId),
            gt(schema.expertAvailability.endAt, from),
            lt(schema.expertAvailability.startAt, to),
          ),
        )
        .orderBy(asc(schema.expertAvailability.startAt))
        .limit(200),
      db
        .select({
          startAt: schema.consultationBookings.startAt,
          endAt: schema.consultationBookings.endAt,
        })
        .from(schema.consultationBookings)
        .where(
          and(
            eq(schema.consultationBookings.expertId, expertId),
            inArray(schema.consultationBookings.status, [...BLOCKING_STATUSES]),
            gt(schema.consultationBookings.endAt, from),
            lt(schema.consultationBookings.startAt, to),
          ),
        ),
      ]);

    const stepMs = SLOT_STEP_MINUTES * 60_000;
    const out: Date[] = [];
    const seen = new Set<number>();
    for (const w of windows) {
      // window 開始に揃えた 30 分グリッドで候補を出す
      for (
        let t = w.startAt.getTime();
        t + durMs <= w.endAt.getTime();
        t += stepMs
      ) {
        if (t < from.getTime() || t > to.getTime()) continue;
        const overlapsBooking = bookings.some(
          (b) => t < b.endAt.getTime() && t + durMs > b.startAt.getTime(),
        );
        if (overlapsBooking) continue;
        if (!seen.has(t)) {
          seen.add(t);
          out.push(new Date(t));
        }
      }
      if (out.length >= 300) break;
    }
    out.sort((a, b) => a.getTime() - b.getTime());
    return out;
  } catch (err) {
    console.warn('[listOpenStartTimes] failed (0061 未適用?):', err);
    return [];
  }
}
