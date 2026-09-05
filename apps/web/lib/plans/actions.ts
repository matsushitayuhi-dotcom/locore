'use server';

import 'server-only';
import { z } from 'zod';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import {
  findOrCreateDirectThread,
  postThreadMessage,
} from '@/lib/chat/threads';
import { CONSULTATION_TAG } from '@/lib/experts/constants';
import { PLATFORM_FEE_RATE } from '@/lib/bookings/constants';
import { isProfilePublished } from '@/lib/experts/completeness';

/**
 * 継続プラン（伴走）契約の Server Actions。
 *
 * - applyToPlan: 相談者がプランに申し込む（enrollment requested + チャット投稿）
 * - acceptEnrollment / declineEnrollment: エキスパートの承諾 / 辞退
 * - cancelEnrollment: 申込側の取り下げ（requested）/ 解約（active）
 *
 * 遷移は bookings と同じ guarded UPDATE + .returning() 行チェック。
 * 同一プラン × 同一メンバーの requested/active 重複は DB の EXCLUDE 制約
 * （plan_enrollments_no_dup_active）が最終防衛線（23P01 を文言に変換）。
 * メール通知は本スライスではチャット自動投稿のみ（メールは決済スライスで整備）。
 */

export type PlanActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function describeDbError(generic: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/does not exist/i.test(msg)) {
    return `${generic}（DB スキーマが未適用の可能性があります: manual/0083_companion_plans.sql を適用してください）`;
  }
  if (process.env.NODE_ENV !== 'production') {
    return `${generic}（開発時詳細: ${msg}）`;
  }
  return generic;
}

function isExclusionViolation(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  return (
    e?.code === '23P01' || /plan_enrollments_no_dup_active/.test(e?.message ?? '')
  );
}

/** 遷移成功後のチャット自動投稿（スレッド未設定・失敗は握りつぶす） */
async function postPlanChat(
  chatThreadId: string | null,
  senderId: string,
  body: string,
): Promise<void> {
  if (!chatThreadId) return;
  try {
    await postThreadMessage(chatThreadId, senderId, body);
    revalidatePath(`/chat/${chatThreadId}`);
  } catch (err) {
    console.warn('[plans] chat message failed:', err);
  }
}

// ---------------------------------------------------------------------------
// 申し込み
// ---------------------------------------------------------------------------

const applySchema = z.object({
  serviceId: z.string().uuid(),
  message: z.string().trim().min(1).max(2000),
});

/** 相談者が継続プランに申し込む（enrollment: requested） */
export async function applyToPlan(
  input: unknown,
): Promise<PlanActionResult<{ enrollmentId: string }>> {
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: '入力内容に誤りがあります（メッセージを確認してください）' };
  }
  const me = await requireUser();
  const db = getDb();

  // monthly の相談メニュー（consultation タグ・active）と所有者を引く
  const svcRows = await db
    .select({
      id: schema.userServices.id,
      userId: schema.userServices.userId,
      title: schema.userServices.title,
      priceJpy: schema.userServices.priceJpy,
      sessionsPerMonth: schema.userServices.sessionsPerMonth,
      durationMinutes: schema.userServices.durationMinutes,
      planKind: schema.userServices.planKind,
    })
    .from(schema.userServices)
    .where(
      and(
        eq(schema.userServices.id, parsed.data.serviceId),
        eq(schema.userServices.isActive, true),
        eq(schema.userServices.planKind, 'monthly'),
        sql`${schema.userServices.tags} && ARRAY[${CONSULTATION_TAG}]::text[]`,
      ),
    )
    .limit(1);
  const service = svcRows[0];
  if (!service) return { ok: false, error: '継続プランが見つかりません' };
  if (service.userId === me.id) {
    return { ok: false, error: '自分のプランには申し込めません' };
  }
  if (
    service.priceJpy == null ||
    service.sessionsPerMonth == null ||
    service.durationMinutes == null
  ) {
    return {
      ok: false,
      error: 'このプランは設定が未完了です。チャットでご相談ください',
    };
  }
  // 公開関門（0084）: 未公開エキスパートへの直 URL 申込を塞ぐ
  if (!(await isProfilePublished(service.userId))) {
    return { ok: false, error: 'このエキスパートは現在公開されていません' };
  }

  try {
    // 申込中 / 契約中の重複チェック（最終防衛線は EXCLUDE 制約）
    const dup = await db
      .select({ id: schema.planEnrollments.id })
      .from(schema.planEnrollments)
      .where(
        and(
          eq(schema.planEnrollments.serviceId, service.id),
          eq(schema.planEnrollments.memberId, me.id),
          inArray(schema.planEnrollments.status, ['requested', 'active']),
        ),
      )
      .limit(1);
    if (dup.length > 0) {
      return {
        ok: false,
        error: 'このプランにはすでに申し込み済みです（マイ相談をご確認ください）',
      };
    }

    const inserted = await db
      .insert(schema.planEnrollments)
      .values({
        serviceId: service.id,
        expertId: service.userId,
        memberId: me.id,
        status: 'requested',
        planTitle: service.title,
        monthlyPriceJpy: service.priceJpy,
        sessionsPerMonth: service.sessionsPerMonth,
        durationMinutes: service.durationMinutes,
        commissionRate: PLATFORM_FEE_RATE.toFixed(2),
        platformFeeJpy: Math.round(service.priceJpy * PLATFORM_FEE_RATE),
        requestMessage: parsed.data.message,
      })
      .returning({ id: schema.planEnrollments.id });
    const enrollmentId = inserted[0]!.id;

    // チャット連携: 1:1 スレッドを確保して自動メッセージを投稿
    try {
      const threadId = await findOrCreateDirectThread(me.id, service.userId);
      await db
        .update(schema.planEnrollments)
        .set({ chatThreadId: threadId })
        .where(eq(schema.planEnrollments.id, enrollmentId));
      await postThreadMessage(
        threadId,
        me.id,
        `【伴走プラン申し込み】${service.title}（月${service.sessionsPerMonth}回・¥${service.priceJpy.toLocaleString('ja-JP')}/月）\n${parsed.data.message}`,
        service.id,
      );
      revalidatePath(`/chat/${threadId}`);
    } catch (err) {
      console.warn('[applyToPlan] chat linkage failed:', err);
    }

    revalidatePath('/bookings');
    revalidatePath('/chat');
    return { ok: true, data: { enrollmentId } };
  } catch (err) {
    if (isExclusionViolation(err)) {
      return {
        ok: false,
        error: 'このプランにはすでに申し込み済みです（マイ相談をご確認ください）',
      };
    }
    console.error('[applyToPlan] failed:', err);
    return {
      ok: false,
      error: describeDbError('申し込みの送信に失敗しました', err),
    };
  }
}

// ---------------------------------------------------------------------------
// 承諾 / 辞退 / 取り下げ
// ---------------------------------------------------------------------------

const idSchema = z.object({ enrollmentId: z.string().uuid() });

/** 契約 1 件をロード（当事者チェックは呼び出し側で行う） */
async function loadEnrollment(enrollmentId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.planEnrollments)
    .where(eq(schema.planEnrollments.id, enrollmentId))
    .limit(1);
  return rows[0] ?? null;
}

/** guarded UPDATE（bookings の transitionBooking と同じ要領） */
async function transitionEnrollment(
  enrollmentId: string,
  fromStatuses: readonly string[],
  set: Partial<typeof schema.planEnrollments.$inferInsert>,
): Promise<boolean> {
  const db = getDb();
  const updated = await db
    .update(schema.planEnrollments)
    .set(set)
    .where(
      and(
        eq(schema.planEnrollments.id, enrollmentId),
        inArray(schema.planEnrollments.status, [...fromStatuses]),
      ),
    )
    .returning({ id: schema.planEnrollments.id });
  return updated.length > 0;
}

/** エキスパートが申し込みを承諾する（active = 伴走開始） */
export async function acceptEnrollment(
  input: unknown,
): Promise<PlanActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const me = await requireUser();

  const e = await loadEnrollment(parsed.data.enrollmentId);
  if (!e || e.expertId !== me.id) {
    return { ok: false, error: '申し込みが見つかりません' };
  }
  if (e.status !== 'requested') {
    return { ok: false, error: 'この申し込みはすでに処理済みです' };
  }

  try {
    const accepted = await transitionEnrollment(e.id, ['requested'], {
      status: 'active',
      respondedAt: new Date(),
    });
    if (!accepted) {
      revalidatePath('/bookings');
      return {
        ok: false,
        error: 'この申し込みは取り下げ済みか、すでに処理されています',
      };
    }
  } catch (err) {
    console.error('[acceptEnrollment] failed:', err);
    return { ok: false, error: describeDbError('承諾に失敗しました', err) };
  }

  await postPlanChat(
    e.chatThreadId,
    me.id,
    `【伴走プラン開始】${e.planTitle}（月${e.sessionsPerMonth}回・${e.durationMinutes}分/回）を承諾しました。マイ相談の「セッションを予約」から、今月分のセッションを予約できます。`,
  );
  revalidatePath('/bookings');
  return { ok: true };
}

/** エキスパートが申し込みを辞退する */
export async function declineEnrollment(
  input: unknown,
): Promise<PlanActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const me = await requireUser();

  const e = await loadEnrollment(parsed.data.enrollmentId);
  if (!e || e.expertId !== me.id) {
    return { ok: false, error: '申し込みが見つかりません' };
  }
  if (e.status !== 'requested') {
    return { ok: false, error: 'この申し込みはすでに処理済みです' };
  }

  const declined = await transitionEnrollment(e.id, ['requested'], {
    status: 'declined',
    respondedAt: new Date(),
  });
  if (!declined) {
    revalidatePath('/bookings');
    return {
      ok: false,
      error: 'この申し込みは取り下げ済みか、すでに処理されています',
    };
  }

  await postPlanChat(
    e.chatThreadId,
    me.id,
    `【伴走プラン辞退】${e.planTitle}のお申し込みは、今回お受けできませんでした。単発セッションのご利用もご検討ください。`,
  );
  revalidatePath('/bookings');
  return { ok: true };
}

/** 申込側の取り下げ（requested）/ 解約（active）。予約済みセッションはそのまま残る */
export async function cancelEnrollment(
  input: unknown,
): Promise<PlanActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const me = await requireUser();

  const e = await loadEnrollment(parsed.data.enrollmentId);
  if (!e || e.memberId !== me.id) {
    return { ok: false, error: '契約が見つかりません' };
  }
  if (e.status !== 'requested' && e.status !== 'active') {
    return { ok: false, error: 'この契約は取り下げ・解約できません' };
  }
  const wasActive = e.status === 'active';

  const cancelled = await transitionEnrollment(e.id, ['requested', 'active'], {
    status: 'cancelled',
    endedAt: wasActive ? new Date() : null,
  });
  if (!cancelled) {
    revalidatePath('/bookings');
    return {
      ok: false,
      error: 'この契約はすでに処理されています。最新の状態を確認してください',
    };
  }

  await postPlanChat(
    e.chatThreadId,
    me.id,
    wasActive
      ? `【伴走プラン解約】${e.planTitle}を解約しました。確定済みのセッションは予定どおり実施されます。`
      : `【伴走プラン取り下げ】${e.planTitle}の申し込みを取り下げました。`,
  );
  revalidatePath('/bookings');
  return { ok: true };
}
