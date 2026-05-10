'use server';

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';

const becomeWriterSchema = z.object({
  residencyCountry: z.string().trim().min(1, '居住国を入力してください').max(80),
  residencyYears: z.coerce.number().int().min(0).max(80),
  agreeTerms: z
    .union([z.literal('on'), z.literal('true'), z.boolean()])
    .refine((v) => v === true || v === 'on' || v === 'true', {
      message: 'クリエイター規約に同意してください',
    }),
});

/**
 * クリエイター登録（Tier B 自己申告）。
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
    // 既にクリエイター → ダッシュボードへ
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
  await db
    .insert(schema.writerProfiles)
    .values({
      userId: user.id,
      tier: 'B',
      residencyCountry: parsed.data.residencyCountry,
      residencyYears: parsed.data.residencyYears,
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
      residencyCountry: parsed.data.residencyCountry,
      residencyYears: parsed.data.residencyYears,
    },
  });

  revalidatePath('/', 'layout');
  redirect('/writer/articles');
}
