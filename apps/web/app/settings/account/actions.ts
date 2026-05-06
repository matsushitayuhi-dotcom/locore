'use server';

import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getCurrentUser, clearCurrentUserCache } from '@/lib/auth/current-user';

const deleteAccountSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
  confirmText: z.literal('退会する', {
    errorMap: () => ({ message: '確認文字列が一致しません' }),
  }),
});

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * アカウント退会（soft delete）。
 *
 * - users.deleted_at に NOW をセット（論理削除）
 * - 書き手の場合、自分の published 記事を archived へ（販売停止）
 *   既存購入者は引き続き閲覧可能（articles 自体は残す）
 * - 退会理由を audit_logs に記録
 *
 * confirmText が「退会する」と完全一致しない場合は拒否。
 *
 * 月次精算未完の残高チェックは別途 payouts/purchases の集計が必要だが、
 * 現状は警告のみ UI 側で出している。実際の DB ロックは未実装（TODO）。
 */
export async function deleteAccount(input: unknown): Promise<DeleteAccountResult> {
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      error: flat.confirmText?.[0] ?? '入力内容に誤りがあります',
    };
  }
  const { reason } = parsed.data;
  const user = await getCurrentUser();
  const db = getDb();

  const now = new Date();

  // 1) users.deleted_at をセット
  await db
    .update(schema.users)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(schema.users.id, user.id));

  // 2) 書き手なら published 記事を archived に
  if (user.role === 'resident_writer' || user.role === 'editor') {
    await db
      .update(schema.articles)
      .set({ status: 'archived', updatedAt: now })
      .where(
        and(
          eq(schema.articles.writerId, user.id),
          eq(schema.articles.status, 'published'),
          isNull(schema.articles.deletedAt),
        ),
      );
  }

  // 3) audit_logs に記録
  await db.insert(schema.auditLogs).values({
    actorId: user.id,
    action: 'user.deleted',
    targetType: 'user',
    targetId: user.id,
    metadata: reason ? { reason } : null,
  });

  clearCurrentUserCache();
  revalidatePath('/settings/account');
  return { ok: true };
}
