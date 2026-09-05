import { NextResponse } from 'next/server';
import { and, gte, inArray, isNull, lt } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { notifyBookingReminder } from '@/lib/email/booking-notify';
import { expireStaleBookings } from '@/lib/bookings/queries';

/**
 * /api/cron/booking-reminder — 相談の前日リマインダー + 期限切れ処理。
 *
 * 動作:
 *   1. CRON_SECRET でリクエストを検証（既存 cron と同じ Bearer 方式）
 *   2. expireStaleBookings(): 開始時刻を過ぎた requested を expired に一括遷移
 *   3. 「status IN ('accepted','paid') AND start_at が now+24h〜48h AND
 *      reminder_sent_at IS NULL」の予約を取得
 *   4. 各行を guarded UPDATE（reminder_sent_at IS NULL の行だけマーク）してから
 *      両者へリマインダーメール送信 — 先にマークするので 2 回叩いても
 *      2 通目は出ない（冪等）。送信失敗してもマークは戻さない
 *      （翌日の実行で二重送信するより、欠送を許容する方が安全）。
 *
 * 想定スケジュール: 毎日 00:00 UTC = 日本時間 09:00（vercel.json "0 0 * * *"）。
 * 24〜48h 窓なので 1 日 1 回の実行で全確定予約が一度だけ対象になる。
 */

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return runReminder(req);
}
export async function GET(req: Request) {
  return runReminder(req);
}

async function runReminder(req: Request) {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401 },
    );
  }

  const expired = await expireStaleBookings();

  const db = getDb();
  const now = Date.now();
  const from = new Date(now + 24 * 60 * 60 * 1000);
  const to = new Date(now + 48 * 60 * 60 * 1000);

  let targets: Array<{
    id: string;
    expertId: string;
    requesterId: string;
    startAt: Date;
    endAt: Date;
    serviceTitle: string;
    priceJpy: number;
    meetUrl: string | null;
  }> = [];
  try {
    targets = await db
      .select({
        id: schema.consultationBookings.id,
        expertId: schema.consultationBookings.expertId,
        requesterId: schema.consultationBookings.requesterId,
        startAt: schema.consultationBookings.startAt,
        endAt: schema.consultationBookings.endAt,
        serviceTitle: schema.consultationBookings.serviceTitle,
        priceJpy: schema.consultationBookings.priceJpy,
        meetUrl: schema.consultationBookings.meetUrl,
      })
      .from(schema.consultationBookings)
      .where(
        and(
          inArray(schema.consultationBookings.status, ['accepted', 'paid']),
          gte(schema.consultationBookings.startAt, from),
          lt(schema.consultationBookings.startAt, to),
          isNull(schema.consultationBookings.reminderSentAt),
        ),
      );
  } catch (err) {
    // 0082 未適用（reminder_sent_at が無い）でも 500 にしない
    console.warn('[booking-reminder] target query failed (0082 未適用?):', err);
    return NextResponse.json({
      ok: true,
      expired,
      reminded: 0,
      error: 'reminder query failed — manual/0082_booking_notifications.sql を適用してください',
    });
  }

  let reminded = 0;
  for (const t of targets) {
    // 先に冪等マーク: 並行実行・再実行では 0 行更新になりスキップされる
    const marked = await db
      .update(schema.consultationBookings)
      .set({ reminderSentAt: new Date() })
      .where(
        and(
          inArray(schema.consultationBookings.status, ['accepted', 'paid']),
          isNull(schema.consultationBookings.reminderSentAt),
          gte(schema.consultationBookings.startAt, from),
          lt(schema.consultationBookings.startAt, to),
          // id 一致（他条件は再検証。マークとりこぼし防止）
          inArray(schema.consultationBookings.id, [t.id]),
        ),
      )
      .returning({ id: schema.consultationBookings.id });
    if (marked.length === 0) continue;

    await notifyBookingReminder(t);
    reminded += 1;
  }

  return NextResponse.json({ ok: true, expired, reminded });
}
