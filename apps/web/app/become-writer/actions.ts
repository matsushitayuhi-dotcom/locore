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
   * 在学状況（留学特化・2択）。writer_profiles.residency_status の既存 enum に写像:
   *   current（在学中）→ current_resident / alumni（卒業）→ past_resident
   */
  enrollmentStatus: z.enum(['current', 'alumni']),
  /** 大学名（オートコンプリート or 自由入力）。education[0].school に入る */
  universityName: z
    .string()
    .trim()
    .min(1, '大学名を入力してください')
    .max(80),
  /** 大学マスタ（0081）の QID。自由入力時は空 */
  universityWikidataId: z
    .string()
    .trim()
    .regex(/^Q\d+$/)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null))
    .catch(null),
  /** 選択した大学の ISO2 国コード（residencyCountry に自動設定）。自由入力時は空 */
  universityCountryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null))
    .catch(null),
  agreeTerms: z
    .union([z.literal('on'), z.literal('true'), z.boolean()])
    .refine((v) => v === true || v === 'on' || v === 'true', {
      message: 'エキスパート規約に同意してください',
    }),
});

/**
 * エキスパート登録（留学特化・0084 で簡素化）。
 *
 * - users.role を 'resident_writer' に更新
 * - 選択した大学から users.education[0] を自動作成（公開要件①を登録時点で充足）
 * - 大学の国コードを users.residencyCountry に自動設定
 * - writer_profiles を Tier B で INSERT（既存があれば何もしない）
 * - 登録後は /settings ハブ（公開ステータス）へ — プロフィールは下書きで始まり、
 *   最低要件を満たして本人が公開するまで /experts には載らない
 */
export async function becomeWriter(formData: FormData): Promise<void> {
  const user = await requireUser('/become-writer');

  if (user.role === 'resident_writer' || user.role === 'editor') {
    // 既にエキスパート → 公開ステータスへ
    redirect('/settings');
  }

  const data = Object.fromEntries(formData.entries());
  const parsed = becomeWriterSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? '入力内容に誤りがあります');
  }
  const p = parsed.data;

  const db = getDb();
  const now = new Date();
  const isEnrolled = p.enrollmentStatus === 'current';

  // users: role + residencyCountry（大学の国から自動）。
  await db
    .update(schema.users)
    .set({
      role: 'resident_writer',
      ...(p.universityCountryCode
        ? { residencyCountry: p.universityCountryCode.toUpperCase() }
        : {}),
      updatedAt: now,
    })
    .where(eq(schema.users.id, user.id));

  // education[0] の自動作成（0062 JSONB）。既に学歴がある場合は触らない。
  // 未適用環境では警告のみ（登録自体は成立させる）。
  try {
    const rows = await db
      .select({ education: schema.users.education })
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1);
    const existing = Array.isArray(rows[0]?.education)
      ? rows[0]!.education
      : [];
    if (existing.length === 0) {
      await db
        .update(schema.users)
        .set({
          education: [
            {
              school: p.universityName,
              current: isEnrolled,
              universityWikidataId: p.universityWikidataId ?? null,
            },
          ],
        })
        .where(eq(schema.users.id, user.id));
    }
  } catch (err) {
    console.warn('[becomeWriter] education 自動作成に失敗（0062 未適用?）:', err);
  }

  // writer_profiles を Tier B で INSERT（重複は無視）。
  // residency_status は既存 enum に写像（在学中=current_resident / 卒=past_resident）。
  await db
    .insert(schema.writerProfiles)
    .values({
      userId: user.id,
      tier: 'B',
      residencyStatus: isEnrolled ? 'current_resident' : 'past_resident',
      residencyCountry:
        p.universityCountryCode?.toUpperCase() ?? p.universityName,
      residencyYears: 0,
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
      enrollmentStatus: p.enrollmentStatus,
      universityName: p.universityName,
      universityWikidataId: p.universityWikidataId ?? null,
      universityCountryCode: p.universityCountryCode ?? null,
    },
  });

  revalidatePath('/', 'layout');
  // 公開関門（0084）: 登録後は公開ステータスハブへ（下書きスタート）
  redirect('/settings');
}
