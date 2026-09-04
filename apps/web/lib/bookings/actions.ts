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
  BLOCKING_STATUSES,
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
): Promise<
  BookingActionResult<{ added: number; extended: number; skipped: number }>
> {
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
    // 同一開始時刻の既存枠と突き合わせ:
    //   - (startAt, endAt) 完全一致 → スキップ（再送・二重クリック対策）
    //   - 同 startAt で新しい endAt の方が長い → 既存行を延長（13:00-15:00 登録済みに
    //     13:00-17:00 を追加したら 17:00 まで伸びる）
    //   - 同 startAt で短い/同じ → スキップ
    const existing = await db
      .select({
        id: schema.expertAvailability.id,
        startAt: schema.expertAvailability.startAt,
        endAt: schema.expertAvailability.endAt,
      })
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
    const existingByStart = new Map(
      existing.map((r) => [r.startAt.getTime(), r]),
    );
    const toInsert: typeof rows = [];
    const toExtend: Array<{ id: string; endAt: Date }> = [];
    let skipped = 0;
    for (const r of rows) {
      const ex = existingByStart.get(r.startAt.getTime());
      if (!ex) {
        toInsert.push(r);
      } else if (r.endAt.getTime() > ex.endAt.getTime()) {
        toExtend.push({ id: ex.id, endAt: r.endAt });
      } else {
        skipped += 1;
      }
    }

    let added = 0;
    if (toInsert.length > 0) {
      // UNIQUE(user_id, start_at) との並行送信レースは DO NOTHING で吸収
      const inserted = await db
        .insert(schema.expertAvailability)
        .values(
          toInsert.map((r) => ({
            userId: me.id,
            startAt: r.startAt,
            endAt: r.endAt,
          })),
        )
        .onConflictDoNothing({
          target: [
            schema.expertAvailability.userId,
            schema.expertAvailability.startAt,
          ],
        })
        .returning({ id: schema.expertAvailability.id });
      added = inserted.length;
      skipped += toInsert.length - inserted.length;
    }
    for (const ext of toExtend) {
      await db
        .update(schema.expertAvailability)
        .set({ endAt: ext.endAt })
        .where(eq(schema.expertAvailability.id, ext.id));
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
      data: { added, extended: toExtend.length, skipped },
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
      contactMethod: schema.userServices.contactMethod,
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
  // 予約可能なメニューの条件（UI 側の CTA 出し分けと同一ルール）:
  //   - contactMethod='chat'（外部サイト申し込みのメニューに内部予約を作らない）
  //   - duration_minutes が確定している（フォールバックで 30 分にすると実所要より
  //     短くカレンダーを塞ぎ、排他制約が実二重予約を通してしまう）
  //   - priceJpy が確定している（応相談 = チャットで交渉のフローを維持）
  if (service.contactMethod !== 'chat') {
    return {
      ok: false,
      error: 'このメニューは外部サイトでの申し込み専用です',
    };
  }
  if (service.durationMinutes == null) {
    return {
      ok: false,
      error:
        'このメニューは空き枠予約に対応していません。チャットで日程をご相談ください',
    };
  }
  if (service.priceJpy == null) {
    return {
      ok: false,
      error: '料金が「応相談」のメニューは、チャットでご相談ください',
    };
  }

  const duration = service.durationMinutes;
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

    const price = service.priceJpy;
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

/** 予約 1 件をロード（当事者チェックは呼び出し側で行う） */
async function loadBooking(bookingId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.consultationBookings)
    .where(eq(schema.consultationBookings.id, bookingId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * ステータス遷移の guarded UPDATE。fromStatuses に一致する行だけを更新し、
 * 実際に更新できたか（= レースで先を越されていないか）を返す。
 * 取り下げと承諾の競合などで UPDATE が空振りしたときに、偽の成功応答と
 * 偽のチャット投稿をしないための要。
 */
async function transitionBooking(
  bookingId: string,
  fromStatuses: readonly string[],
  set: Partial<typeof schema.consultationBookings.$inferInsert>,
): Promise<boolean> {
  const db = getDb();
  const updated = await db
    .update(schema.consultationBookings)
    .set(set)
    .where(
      and(
        eq(schema.consultationBookings.id, bookingId),
        inArray(schema.consultationBookings.status, [...fromStatuses]),
      ),
    )
    .returning({ id: schema.consultationBookings.id });
  return updated.length > 0;
}

/** 遷移成功後のチャット自動投稿（スレッド未設定・失敗は握りつぶす） */
async function postBookingChat(
  chatThreadId: string | null,
  senderId: string,
  body: string,
): Promise<void> {
  if (!chatThreadId) return;
  try {
    await postThreadMessage(chatThreadId, senderId, body);
    revalidatePath(`/chat/${chatThreadId}`);
  } catch (err) {
    console.warn('[bookings] chat message failed:', err);
  }
}

/** エキスパートがリクエストを承諾する（accepted = 確定） */
export async function acceptBooking(
  input: unknown,
): Promise<BookingActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const me = await requireUser();

  const b = await loadBooking(parsed.data.bookingId);
  if (!b || b.expertId !== me.id) {
    return { ok: false, error: 'リクエストが見つかりません' };
  }
  if (b.status !== 'requested') {
    return { ok: false, error: 'このリクエストはすでに処理済みです' };
  }
  // 過去枠は承諾できない → expired へ遅延遷移
  if (b.startAt.getTime() < Date.now()) {
    await transitionBooking(b.id, ['requested'], { status: 'expired' });
    revalidatePath('/bookings');
    return {
      ok: false,
      error: '開始時刻を過ぎたリクエストのため、期限切れにしました',
    };
  }

  let accepted: boolean;
  try {
    accepted = await transitionBooking(b.id, ['requested'], {
      status: 'accepted',
      respondedAt: new Date(),
    });
  } catch (err) {
    if (isExclusionViolation(err)) {
      // 同時承諾の競合: もう一方が先に確定した
      return { ok: false, error: 'この枠は別の予約で確定済みです' };
    }
    console.error('[acceptBooking] failed:', err);
    return { ok: false, error: '承諾に失敗しました' };
  }
  if (!accepted) {
    // レース: 直前に相談者が取り下げた等。チャット投稿せず正直に伝える
    revalidatePath('/bookings');
    return {
      ok: false,
      error: 'このリクエストは取り下げ済みか、すでに処理されています',
    };
  }

  await postBookingChat(
    b.chatThreadId,
    me.id,
    `【予約確定】${b.serviceTitle} / ${formatSlotJst(b.startAt, b.endAt)}（日本時間）を承諾しました。当日の参加方法はこのチャットでご案内します。`,
  );
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

  const b = await loadBooking(parsed.data.bookingId);
  if (!b || b.expertId !== me.id) {
    return { ok: false, error: 'リクエストが見つかりません' };
  }
  if (b.status !== 'requested') {
    return { ok: false, error: 'このリクエストはすでに処理済みです' };
  }

  const declined = await transitionBooking(b.id, ['requested'], {
    status: 'declined',
    respondedAt: new Date(),
  });
  if (!declined) {
    revalidatePath('/bookings');
    return {
      ok: false,
      error: 'このリクエストは取り下げ済みか、すでに処理されています',
    };
  }

  await postBookingChat(
    b.chatThreadId,
    me.id,
    `【リクエスト辞退】${b.serviceTitle} / ${formatSlotJst(b.startAt, b.endAt)}（日本時間）は今回お受けできませんでした。別の枠でのリクエストをご検討ください。`,
  );
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

  const b = await loadBooking(parsed.data.bookingId);
  if (!b || b.requesterId !== me.id) {
    return { ok: false, error: '予約が見つかりません' };
  }
  if (b.status !== 'requested' && b.status !== 'accepted') {
    return { ok: false, error: 'この予約は取り下げできません' };
  }

  const cancelled = await transitionBooking(b.id, ['requested', 'accepted'], {
    status: 'cancelled',
    cancelledAt: new Date(),
  });
  if (!cancelled) {
    revalidatePath('/bookings');
    return {
      ok: false,
      error: 'この予約はすでに処理されています。最新の状態を確認してください',
    };
  }

  await postBookingChat(
    b.chatThreadId,
    me.id,
    `【リクエスト取り下げ】${b.serviceTitle} / ${formatSlotJst(b.startAt, b.endAt)}（日本時間）のリクエストを取り下げました。`,
  );
  revalidatePath('/bookings');
  // TODO(mail): エキスパートへ「リクエストが取り下げられました」メール通知（次スライス）
  return { ok: true };
}

// expireStaleBookings（requested 一括 expired 化）は 'use server' から外し、
// lib/bookings/queries.ts へ移動した（無認証で POST 可能なサーバーアクションに
// しないため。将来 cron から呼ぶシームはそちら）。
