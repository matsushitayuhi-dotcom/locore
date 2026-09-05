import 'server-only';
import { inArray } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { sendEmail } from './send';
import {
  tplBookingCancelled,
  tplBookingConfirmed,
  tplBookingDeclined,
  tplBookingRequested,
  tplBookingReminder,
  type BookingMailInput,
} from './booking-templates';

/**
 * 予約イベントのメール通知（notify* 群）。
 *
 * 設計方針:
 *   - 全関数とも失敗してもアクション本体（予約の成立・承諾等）を止めない。
 *     内部で握りつぶして console.warn のみ。呼び出し側は await するだけでよい。
 *   - RESEND_API_KEY 未設定なら sendEmail が no-op（skipped）で安全。
 *   - 送信結果は notification_log に記録（これも失敗しても握りつぶす）。
 */

/** notify* が必要とする booking 行の最小形（consultation_bookings のサブセット） */
export type BookingForNotify = {
  id: string;
  expertId: string;
  requesterId: string;
  startAt: Date;
  endAt: Date;
  serviceTitle: string;
  priceJpy: number;
  requestMessage?: string | null;
  meetUrl?: string | null;
};

type Party = {
  id: string;
  email: string | null;
  displayName: string;
  timezone: string | null;
};

/** 当事者 2 名のメール・表示名・TZ をまとめて引く */
async function loadParties(
  booking: BookingForNotify,
): Promise<{ expert: Party; requester: Party } | null> {
  const db = getDb();
  const rows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      displayName: schema.users.displayName,
      timezone: schema.users.timezone,
    })
    .from(schema.users)
    .where(inArray(schema.users.id, [booking.expertId, booking.requesterId]));
  const expert = rows.find((r) => r.id === booking.expertId);
  const requester = rows.find((r) => r.id === booking.requesterId);
  if (!expert || !requester) return null;
  return { expert, requester };
}

function toMailInput(
  booking: BookingForNotify,
  expert: Party,
  requester: Party,
): BookingMailInput {
  return {
    startAt: booking.startAt,
    endAt: booking.endAt,
    serviceTitle: booking.serviceTitle,
    priceJpy: booking.priceJpy,
    expertName: expert.displayName,
    expertTimezone: expert.timezone,
    requesterName: requester.displayName,
    requestMessage: booking.requestMessage ?? null,
    meetUrl: booking.meetUrl ?? null,
  };
}

/** 送信 + notification_log 記録。すべての失敗を握りつぶす */
async function deliver(
  to: Party,
  type: string,
  bookingId: string,
  mail: { subject: string; html: string },
): Promise<void> {
  let sent = false;
  try {
    if (!to.email) {
      console.warn(`[booking-notify] ${type}: user ${to.id} has no email`);
      return;
    }
    const res = await sendEmail({ to: to.email, subject: mail.subject, html: mail.html });
    sent = res.ok;
    if (!res.ok) {
      console.warn(`[booking-notify] ${type} send failed:`, res.error);
    }
  } catch (err) {
    console.warn(`[booking-notify] ${type} send threw:`, err);
  }
  try {
    const db = getDb();
    await db.insert(schema.notificationLog).values({
      userId: to.id,
      type,
      payload: { bookingId },
      channel: 'email',
      status: sent ? 'sent' : 'failed',
      sentAt: sent ? new Date() : null,
    });
  } catch (err) {
    console.warn(`[booking-notify] ${type} log failed:`, err);
  }
}

/** リクエスト送信 → 先輩（エキスパート）へ */
export async function notifyBookingRequested(
  booking: BookingForNotify,
): Promise<void> {
  try {
    const parties = await loadParties(booking);
    if (!parties) return;
    const input = toMailInput(booking, parties.expert, parties.requester);
    await deliver(
      parties.expert,
      'booking_requested',
      booking.id,
      tplBookingRequested(input),
    );
  } catch (err) {
    console.warn('[notifyBookingRequested] failed:', err);
  }
}

/** 承諾（確定）→ 相談者へ。meetUrl は承諾処理後の値を渡す */
export async function notifyBookingConfirmed(
  booking: BookingForNotify,
): Promise<void> {
  try {
    const parties = await loadParties(booking);
    if (!parties) return;
    const input = toMailInput(booking, parties.expert, parties.requester);
    await deliver(
      parties.requester,
      'booking_confirmed',
      booking.id,
      tplBookingConfirmed(input),
    );
  } catch (err) {
    console.warn('[notifyBookingConfirmed] failed:', err);
  }
}

/** 辞退 → 相談者へ */
export async function notifyBookingDeclined(
  booking: BookingForNotify,
): Promise<void> {
  try {
    const parties = await loadParties(booking);
    if (!parties) return;
    const input = toMailInput(booking, parties.expert, parties.requester);
    await deliver(
      parties.requester,
      'booking_declined',
      booking.id,
      tplBookingDeclined(input),
    );
  } catch (err) {
    console.warn('[notifyBookingDeclined] failed:', err);
  }
}

/** 取り下げ / キャンセル → 先輩（エキスパート）へ */
export async function notifyBookingCancelled(
  booking: BookingForNotify,
): Promise<void> {
  try {
    const parties = await loadParties(booking);
    if (!parties) return;
    const input = toMailInput(booking, parties.expert, parties.requester);
    await deliver(
      parties.expert,
      'booking_cancelled',
      booking.id,
      tplBookingCancelled(input),
    );
  } catch (err) {
    console.warn('[notifyBookingCancelled] failed:', err);
  }
}

/** 前日リマインダー → 両者へ（cron から） */
export async function notifyBookingReminder(
  booking: BookingForNotify,
): Promise<void> {
  try {
    const parties = await loadParties(booking);
    if (!parties) return;
    const input = toMailInput(booking, parties.expert, parties.requester);
    await deliver(
      parties.expert,
      'booking_reminder',
      booking.id,
      tplBookingReminder(input, 'expert'),
    );
    await deliver(
      parties.requester,
      'booking_reminder',
      booking.id,
      tplBookingReminder(input, 'requester'),
    );
  } catch (err) {
    console.warn('[notifyBookingReminder] failed:', err);
  }
}
