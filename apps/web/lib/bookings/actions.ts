'use server';

import 'server-only';
import { z } from 'zod';
import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import {
  findOrCreateDirectThread,
  postThreadMessage,
} from '@/lib/chat/threads';
import { CONSULTATION_TAG } from '@/lib/experts/constants';
import {
  DEFAULT_BULK_WEEKS,
  MIN_LEAD_HOURS,
  PLATFORM_FEE_RATE,
} from './constants';
import { formatSlotJst, localToUtc, wallPartsInTz } from './time';

/**
 * 予約スライスの Server Actions。
 *
 * - 空き時間: addAvailabilityBulk / deleteAvailability（エキスパート本人のみ）
 * - 予約: requestBooking（相談者）→ acceptBooking / declineBooking（エキスパート）
 *         / cancelBooking（相談者の取り下げ）
 * - 確定済み枠の二重予約は DB の EXCLUDE 制約（consultation_bookings_no_overlap）が
 *   最終防衛線。同時承諾は片方が 23P01 で失敗し、ここで文言に変換する。
 */

export type BookingActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const BLOCKING_STATUSES = ['requested', 'accepted', 'paid'] as const;
const hmPat = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePat = /^\d{4}-\d{2}-\d{2}$/;

function isWriterRole(role: string): boolean {
  return role === 'resident_writer' || role === 'editor';
}

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** 純カレンダー日付（y,m,d）の曜日。0=日 */
function weekdayOf(y: number, mo: number, d: number): number {
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}

function addDays(
  y: number,
  mo: number,
  d: number,
  days: number,
): { y: number; mo: number; d: number } {
  const t = new Date(Date.UTC(y, mo - 1, d + days));
  return { y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

function dateStr(p: { y: number; mo: number; d: number }): string {
  return `${p.y}-${String(p.mo).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// 空き時間の登録・削除
// ---------------------------------------------------------------------------

const addSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('weekly'),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    startHm: z.string().regex(hmPat),
    endHm: z.string().regex(hmPat),
    weeks: z.number().int().min(1).max(8).default(DEFAULT_BULK_WEEKS),
    timezone: z.string().min(1).max(64),
  }),
  z.object({
    mode: z.literal('single'),
    date: z.string().regex(datePat),
    startHm: z.string().regex(hmPat),
    endHm: z.string().regex(hmPat),
    timezone: z.string().min(1).max(64),
  }),
]);

/**
 * 空き枠の追加。weekly = 選んだ曜日 × 今後 weeks 週分を一括、single = 単発 1 枠。
 * 入力はエキスパートの現地時間（timezone）で受け、UTC に展開して保存する。
 * timezone は users.timezone にも保存する（次回の初期値・受信箱の表示に使う）。
 */
export async function addAvailabilityBulk(
  input: unknown,
): Promise<BookingActionResult<{ added: number; skipped: number }>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '入力内容に誤りがあります' };
  const p = parsed.data;

  const me = await requireUser();
  if (!isWriterRole(me.role)) {
    return { ok: false, error: 'エキスパートのみ空き時間を登録できます' };
  }
  if (!isValidTimezone(p.timezone)) {
    return { ok: false, error: 'タイムゾーンが不正です' };
  }
  if (p.endHm <= p.startHm) {
    return { ok: false, error: '終了時刻は開始時刻より後にしてください（日跨ぎは2枠に分けて登録してください）' };
  }

  // 対象日付（timezone の壁カレンダー基準）
  const dates: string[] = [];
  if (p.mode === 'single') {
    dates.push(p.date);
  } else {
    const today = wallPartsInTz(new Date(), p.timezone);
    for (const dow of new Set(p.weekdays)) {
      // 明日以降で最初にその曜日になる日を探し、そこから weeks 週分
      let first = addDays(today.year, today.month, today.day, 1);
      while (weekdayOf(first.y, first.mo, first.d) !== dow) {
        first = addDays(first.y, first.mo, first.d, 1);
      }
      for (let w = 0; w < p.weeks; w++) {
        dates.push(dateStr(addDays(first.y, first.mo, first.d, w * 7)));
      }
    }
  }

  const now = Date.now();
  const rows = dates
    .map((d) => ({
      startAt: localToUtc(p.timezone, d, p.startHm),
      endAt: localToUtc(p.timezone, d, p.endHm),
    }))
    .filter((r) => r.startAt.getTime() > now);
  if (rows.length === 0) {
    return { ok: false, error: '追加できる未来の枠がありません（過去の日時は登録できません）' };
  }

  try {
    const db = getDb();
    // 完全一致の既存枠はスキップ（再送・二重クリック対策）
    const existing = await db
      .select({ startAt: schema.expertAvailability.startAt })
      .from(schema.expertAvailability)
      .where(
        and(
          eq(schema.expertAvailability.userId, me.id),
          inArray(
            schema.expertAvailability.startAt,
            rows.map((r) => r.startAt),
          ),
        ),
      );
    const existingTs = new Set(existing.map((r) => r.startAt.getTime()));
    const toInsert = rows.filter((r) => !existingTs.has(r.startAt.getTime()));

    if (toInsert.length > 0) {
      await db.insert(schema.expertAvailability).values(
        toInsert.map((r) => ({
          userId: me.id,
          startAt: r.startAt,
          endAt: r.endAt,
        })),
      );
    }
    // 現地 TZ をプロフィールに保存（初期値・受信箱表示用）
    await db
      .update(schema.users)
      .set({ timezone: p.timezone })
      .where(eq(schema.users.id, me.id));

    revalidatePath('/settings/availability');
    // TODO(mail): 空き枠公開のお知らせメール等はこのスライスでは送らない
    return {
      ok: true,
      data: { added: toInsert.length, skipped: rows.length - toInsert.length },
    };
  } catch (err) {
    console.error('[addAvailabilityBulk] failed:', err);
    return {
      ok: false,
      error:
        '空き枠の保存に失敗しました。0061_booking_availability.sql が適用されているか確認してください',
    };
  }
}

const deleteSchema = z.object({ id: z.string().uuid() });

/** 空き枠の削除。予約（requested/accepted/paid）が重なっている枠は削除不可 */
export async function deleteAvailability(
  input: unknown,
): Promise<BookingActionResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const me = await requireUser();
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.expertAvailability.id,
        userId: schema.expertAvailability.userId,
        startAt: schema.expertAvailability.startAt,
        endAt: schema.expertAvailability.endAt,
      })
      .from(schema.expertAvailability)
      .where(eq(schema.expertAvailability.id, parsed.data.id))
      .limit(1);
    const slot = rows[0];
    if (!slot || slot.userId !== me.id) {
      return { ok: false, error: '枠が見つかりません' };
    }

    const overlapping = await db
      .select({ id: schema.consultationBookings.id })
      .from(schema.consultationBookings)
      .where(
        and(
          eq(schema.consultationBookings.expertId, me.id),
          inArray(schema.consultationBookings.status, [...BLOCKING_STATUSES]),
          lt(schema.consultationBookings.startAt, slot.endAt),
          sql`${schema.consultationBookings.endAt} > ${slot.startAt}`,
        ),
      )
      .limit(1);
    if (overlapping.length > 0) {
      return {
        ok: false,
        error: '予約（またはリクエスト）が入っている枠は削除できません',
      };
    }

    await db
      .delete(schema.expertAvailability)
      .where(eq(schema.expertAvailability.id, slot.id));
    revalidatePath('/settings/availability');
    return { ok: true };
  } catch (err) {
    console.error('[deleteAvailability] failed:', err);
    return { ok: false, error: '削除に失敗しました' };
  }
}

// ---------------------------------------------------------------------------
// 予約リクエスト → 承諾 / 辞退 / 取り下げ
// ---------------------------------------------------------------------------

const requestSchema = z.object({
  serviceId: z.string().uuid(),
  startAtIso: z.string().datetime({ offset: true }),
  message: z.string().trim().min(1).max(2000),
});

/** 相談者が空き枠から予約リクエストを送る */
export async function requestBooking(
  input: unknown,
): Promise<BookingActionResult<{ bookingId: string }>> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: '入力内容に誤りがあります（枠とメッセージを確認してください）' };
  }
  const me = await requireUser();
  const db = getDb();

  // 相談メニュー（consultation タグ・active）と所有者を引く
  const svcRows = await db
    .select({
      id: schema.userServices.id,
      userId: schema.userServices.userId,
      title: schema.userServices.title,
      priceJpy: schema.userServices.priceJpy,
      durationMinutes: schema.userServices.durationMinutes,
      durationLabel: schema.userServices.durationLabel,
    })
    .from(schema.userServices)
    .where(
      and(
        eq(schema.userServices.id, parsed.data.serviceId),
        eq(schema.userServices.isActive, true),
        sql`${schema.userServices.tags} && ARRAY[${CONSULTATION_TAG}]::text[]`,
      ),
    )
    .limit(1);
  const service = svcRows[0];
  if (!service) return { ok: false, error: '相談メニューが見つかりません' };
  if (service.userId === me.id) {
    return { ok: false, error: '自分の相談メニューは予約できません' };
  }

  const duration =
    service.durationMinutes ??
    (service.durationLabel?.match(/^(\d+)分$/)
      ? Number(service.durationLabel.match(/^(\d+)分$/)![1])
      : 30);
  const start = new Date(parsed.data.startAtIso);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, error: '開始日時が不正です' };
  }
  const end = new Date(start.getTime() + duration * 60_000);

  if (start.getTime() < Date.now() + MIN_LEAD_HOURS * 3_600_000) {
    return {
      ok: false,
      error: `開始まで${MIN_LEAD_HOURS}時間を切った枠はリクエストできません。別の枠をお選びください`,
    };
  }

  try {
    // 空き枠 window 内か
    const windows = await db
      .select({
        startAt: schema.expertAvailability.startAt,
        endAt: schema.expertAvailability.endAt,
      })
      .from(schema.expertAvailability)
      .where(
        and(
          eq(schema.expertAvailability.userId, service.userId),
          sql`${schema.expertAvailability.startAt} <= ${start}`,
          sql`${schema.expertAvailability.endAt} >= ${end}`,
        ),
      )
      .limit(1);
    if (windows.length === 0) {
      return {
        ok: false,
        error: 'この枠は空き時間から外れています。ページを更新して選び直してください',
      };
    }

    // 既存予約との重なり
    const conflicts = await db
      .select({ id: schema.consultationBookings.id })
      .from(schema.consultationBookings)
      .where(
        and(
          eq(schema.consultationBookings.expertId, service.userId),
          inArray(schema.consultationBookings.status, [...BLOCKING_STATUSES]),
          lt(schema.consultationBookings.startAt, end),
          sql`${schema.consultationBookings.endAt} > ${start}`,
        ),
      )
      .limit(1);
    if (conflicts.length > 0) {
      return {
        ok: false,
        error: 'この枠は他のリクエストで埋まりました。別の枠をお選びください',
      };
    }

    const price = service.priceJpy ?? 0;
    const inserted = await db
      .insert(schema.consultationBookings)
      .values({
        serviceId: service.id,
        expertId: service.userId,
        requesterId: me.id,
        status: 'requested',
        startAt: start,
        endAt: end,
        durationMinutes: duration,
        serviceTitle: service.title,
        priceJpy: price,
        commissionRate: PLATFORM_FEE_RATE.toFixed(2),
        platformFeeJpy: Math.round(price * PLATFORM_FEE_RATE),
        requestMessage: parsed.data.message,
      })
      .returning({ id: schema.consultationBookings.id });
    const bookingId = inserted[0]!.id;

    // チャット連携: 1:1 スレッドを確保して自動メッセージを投稿
    try {
      const threadId = await findOrCreateDirectThread(me.id, service.userId);
      await db
        .update(schema.consultationBookings)
        .set({ chatThreadId: threadId })
        .where(eq(schema.consultationBookings.id, bookingId));
      await postThreadMessage(
        threadId,
        me.id,
        `【相談リクエスト】${service.title} / ${formatSlotJst(start, end)}（日本時間）\n${parsed.data.message}`,
        service.id,
      );
      revalidatePath(`/chat/${threadId}`);
    } catch (err) {
      // チャット未整備（0017 未適用等）でも予約自体は成立させる
      console.warn('[requestBooking] chat linkage failed:', err);
    }

    revalidatePath('/bookings');
    revalidatePath('/chat');
    revalidatePath(`/experts/${service.userId}`);
    // TODO(mail): エキスパートへ「新しい相談リクエスト」メール通知（次スライス）
    return { ok: true, data: { bookingId } };
  } catch (err) {
    console.error('[requestBooking] failed:', err);
    return {
      ok: false,
      error:
        'リクエストの送信に失敗しました。0061_booking_availability.sql が適用されているか確認してください',
    };
  }
}

const idSchema = z.object({ bookingId: z.string().uuid() });

/** Postgres の EXCLUDE 制約違反（23P01）か */
function isExclusionViolation(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  return (
    e?.code === '23P01' ||
    /consultation_bookings_no_overlap/.test(e?.message ?? '')
  );
}

/** エキスパートがリクエストを承諾する（accepted = 確定） */
export async function acceptBooking(
  input: unknown,
): Promise<BookingActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const me = await requireUser();
  const db = getDb();

  const rows = await db
    .select()
    .from(schema.consultationBookings)
    .where(eq(schema.consultationBookings.id, parsed.data.bookingId))
    .limit(1);
  const b = rows[0];
  if (!b || b.expertId !== me.id) {
    return { ok: false, error: 'リクエストが見つかりません' };
  }
  if (b.status !== 'requested') {
    return { ok: false, error: 'このリクエストはすでに処理済みです' };
  }
  // 過去枠は承諾できない → expired へ遅延遷移
  if (b.startAt.getTime() < Date.now()) {
    await db
      .update(schema.consultationBookings)
      .set({ status: 'expired' })
      .where(
        and(
          eq(schema.consultationBookings.id, b.id),
          eq(schema.consultationBookings.status, 'requested'),
        ),
      );
    revalidatePath('/bookings');
    return {
      ok: false,
      error: '開始時刻を過ぎたリクエストのため、期限切れにしました',
    };
  }

  try {
    await db
      .update(schema.consultationBookings)
      .set({ status: 'accepted', respondedAt: new Date() })
      .where(
        and(
          eq(schema.consultationBookings.id, b.id),
          eq(schema.consultationBookings.status, 'requested'),
        ),
      );
  } catch (err) {
    if (isExclusionViolation(err)) {
      // 同時承諾の競合: もう一方が先に確定した
      return { ok: false, error: 'この枠は別の予約で確定済みです' };
    }
    console.error('[acceptBooking] failed:', err);
    return { ok: false, error: '承諾に失敗しました' };
  }

  if (b.chatThreadId) {
    try {
      await postThreadMessage(
        b.chatThreadId,
        me.id,
        `【予約確定】${b.serviceTitle} / ${formatSlotJst(b.startAt, b.endAt)}（日本時間）を承諾しました。当日の参加方法はこのチャットでご案内します。`,
      );
      revalidatePath(`/chat/${b.chatThreadId}`);
    } catch (err) {
      console.warn('[acceptBooking] chat message failed:', err);
    }
  }
  revalidatePath('/bookings');
  // TODO(mail): 相談者へ「予約が確定しました」メール通知（次スライス）
  return { ok: true };
}

/** エキスパートがリクエストを辞退する */
export async function declineBooking(
  input: unknown,
): Promise<BookingActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const me = await requireUser();
  const db = getDb();

  const rows = await db
    .select()
    .from(schema.consultationBookings)
    .where(eq(schema.consultationBookings.id, parsed.data.bookingId))
    .limit(1);
  const b = rows[0];
  if (!b || b.expertId !== me.id) {
    return { ok: false, error: 'リクエストが見つかりません' };
  }
  if (b.status !== 'requested') {
    return { ok: false, error: 'このリクエストはすでに処理済みです' };
  }

  await db
    .update(schema.consultationBookings)
    .set({ status: 'declined', respondedAt: new Date() })
    .where(
      and(
        eq(schema.consultationBookings.id, b.id),
        eq(schema.consultationBookings.status, 'requested'),
      ),
    );

  if (b.chatThreadId) {
    try {
      await postThreadMessage(
        b.chatThreadId,
        me.id,
        `【リクエスト辞退】${b.serviceTitle} / ${formatSlotJst(b.startAt, b.endAt)}（日本時間）は今回お受けできませんでした。別の枠でのリクエストをご検討ください。`,
      );
      revalidatePath(`/chat/${b.chatThreadId}`);
    } catch (err) {
      console.warn('[declineBooking] chat message failed:', err);
    }
  }
  revalidatePath('/bookings');
  // TODO(mail): 相談者へ「リクエストが辞退されました」メール通知（次スライス）
  return { ok: true };
}

/** 相談者がリクエストを取り下げる（requested / accepted のみ） */
export async function cancelBooking(
  input: unknown,
): Promise<BookingActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const me = await requireUser();
  const db = getDb();

  const rows = await db
    .select()
    .from(schema.consultationBookings)
    .where(eq(schema.consultationBookings.id, parsed.data.bookingId))
    .limit(1);
  const b = rows[0];
  if (!b || b.requesterId !== me.id) {
    return { ok: false, error: '予約が見つかりません' };
  }
  if (b.status !== 'requested' && b.status !== 'accepted') {
    return { ok: false, error: 'この予約は取り下げできません' };
  }

  await db
    .update(schema.consultationBookings)
    .set({ status: 'cancelled', cancelledAt: new Date() })
    .where(
      and(
        eq(schema.consultationBookings.id, b.id),
        inArray(schema.consultationBookings.status, ['requested', 'accepted']),
      ),
    );

  if (b.chatThreadId) {
    try {
      await postThreadMessage(
        b.chatThreadId,
        me.id,
        `【リクエスト取り下げ】${b.serviceTitle} / ${formatSlotJst(b.startAt, b.endAt)}（日本時間）のリクエストを取り下げました。`,
      );
      revalidatePath(`/chat/${b.chatThreadId}`);
    } catch (err) {
      console.warn('[cancelBooking] chat message failed:', err);
    }
  }
  revalidatePath('/bookings');
  // TODO(mail): エキスパートへ「リクエストが取り下げられました」メール通知（次スライス）
  return { ok: true };
}

/**
 * 開始時刻を過ぎた requested を expired に一括遷移させる。
 * 現状は accept 時の個別遷移＋表示側の遅延判定で足りるが、
 * 将来 cron（/api/cron/...）から呼ぶためのシームとして分離しておく。
 */
export async function expireStaleBookings(): Promise<
  BookingActionResult<{ expired: number }>
> {
  try {
    const db = getDb();
    const updated = await db
      .update(schema.consultationBookings)
      .set({ status: 'expired' })
      .where(
        and(
          eq(schema.consultationBookings.status, 'requested'),
          lt(schema.consultationBookings.startAt, new Date()),
        ),
      )
      .returning({ id: schema.consultationBookings.id });
    return { ok: true, data: { expired: updated.length } };
  } catch (err) {
    console.error('[expireStaleBookings] failed:', err);
    return { ok: false, error: '期限切れ処理に失敗しました' };
  }
}
