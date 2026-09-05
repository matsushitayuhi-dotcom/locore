'use server';

import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
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

  // users: role + residencyCountry + education[0] を 1 回の UPDATE に統合
  // （SELECT→UPDATE の競合窓を排除）。education は既存があれば触らない
  // （CASE WHEN jsonb_array_length = 0 のときだけ自動作成）。
  const initialEducation = JSON.stringify([
    {
      school: p.universityName,
      current: isEnrolled,
      universityWikidataId: p.universityWikidataId ?? null,
    },
  ]);
  const baseSet = {
    role: 'resident_writer' as const,
    ...(p.universityCountryCode
      ? { residencyCountry: p.universityCountryCode.toUpperCase() }
      : {}),
    updatedAt: now,
  };
  try {
    await db
      .update(schema.users)
      .set({
        ...baseSet,
        education: sql`CASE WHEN jsonb_array_length(${schema.users.education}) = 0 THEN ${initialEducation}::jsonb ELSE ${schema.users.education} END`,
      })
      .where(eq(schema.users.id, user.id));
  } catch (err) {
    // 0062（education）未適用環境: role 等だけ更新して登録自体は成立させる
    console.warn('[becomeWriter] education 自動作成に失敗（0062 未適用?）:', err);
    await db
      .update(schema.users)
      .set(baseSet)
      .where(eq(schema.users.id, user.id));
  }

  // writer_profiles を Tier B で INSERT（重複は無視）。
  // residency_status は既存 enum に写像（在学中=current_resident / 卒=past_resident）。
  await db
    .insert(schema.writerProfiles)
    .values({
      userId: user.id,
      tier: 'B',
      residencyStatus: isEnrolled ? 'current_resident' : 'past_resident',
      // 国コード不明（自由入力の大学）のとき大学名で国フィールドを汚染しない。
      // 列は NOT NULL のため空文字（表示側は未記入扱い）
      residencyCountry: p.universityCountryCode?.toUpperCase() ?? '',
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
