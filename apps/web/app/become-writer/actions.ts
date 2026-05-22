'use server';

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';

const becomeWriterSchema = z.object({
  /**
   * 居住状況:
   *   current_resident: 現地に住んでいる（後から認証申請可能）
   *   past_resident   : 過去に住んでいた（思い出として書ける）
   *   traveler        : 旅行者として書く（観光客視点）
   */
  residencyStatus: z.enum(['current_resident', 'past_resident', 'traveler']),
  /** 関わっている国（例 'fr' or 'France'）。旅行者でも訪れた国を任意で */
  residencyCountry: z.string().trim().min(1, '対象の国を入力してください').max(80),
  /**
   * 居住年数。current_resident のみ意味を持つ。past_resident でも参考値として
   * 入れられる。traveler は 0 で OK。
   */
  residencyYears: z.coerce.number().int().min(0).max(80),
  agreeTerms: z
    .union([z.literal('on'), z.literal('true'), z.boolean()])
    .refine((v) => v === true || v === 'on' || v === 'true', {
      message: '駐在員規約に同意してください',
    }),
});

/**
 * 駐在員登録（Tier B 自己申告）。
 *
 * - users.role を 'resident_writer' に更新
 * - writer_profiles を Tier B で INSERT（既存があれば何もしない）
 * - audit_logs に `writer.registered` を記録
 *
 * Tier S/A への昇格（居住認証）は別フロー。
 *
 * フォームから直接呼ばれる前提のため、戻り値は void。
 * 入力エラーは Error をスロー（フォームは required 属性で client-side validation する）。
 */
export async function becomeWriter(formData: FormData): Promise<void> {
  const user = await requireUser('/become-writer');

  if (user.role === 'resident_writer' || user.role === 'editor') {
    // 既に駐在員 → ダッシュボードへ
    redirect('/writer/articles');
  }

  const data = Object.fromEntries(formData.entries());
  const parsed = becomeWriterSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? '入力内容に誤りがあります');
  }

  const db = getDb();
  const now = new Date();

  // users.role 更新
  await db
    .update(schema.users)
    .set({ role: 'resident_writer', updatedAt: now })
    .where(eq(schema.users.id, user.id));

  // writer_profiles を Tier B で INSERT（重複は無視）
  // residency_status を保存。commission は B の既定 (25%) のまま、後で
  // cron が販売実績で再評価する。
  await db
    .insert(schema.writerProfiles)
    .values({
      userId: user.id,
      tier: 'B',
      residencyStatus: parsed.data.residencyStatus,
      residencyCountry: parsed.data.residencyCountry,
      residencyYears: parsed.data.residencyYears,
      commissionRatePct: 25,
    })
    .onConflictDoNothing({ target: schema.writerProfiles.userId });

  // 監査ログ
  await db.insert(schema.auditLogs).values({
    actorId: user.id,
    action: 'writer.registered',
    targetType: 'user',
    targetId: user.id,
    metadata: {
      tier: 'B',
      residencyStatus: parsed.data.residencyStatus,
      residencyCountry: parsed.data.residencyCountry,
      residencyYears: parsed.data.residencyYears,
    },
  });

  revalidatePath('/', 'layout');
  redirect('/writer/articles');
}
