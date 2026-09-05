'use server';

import 'server-only';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { getProfileCompleteness } from './completeness';

/**
 * プロフィール公開 / 非公開の Server Actions（公開関門・0084）。
 * 公開は必須要件をサーバーで再検証してから立てる（UI の無効化はすり抜け得る）。
 */

export type PublishActionResult =
  | { ok: true }
  | { ok: false; error: string };

function isWriterRole(role: string): boolean {
  return role === 'resident_writer' || role === 'editor';
}

function revalidateProfilePaths(userId: string): void {
  revalidatePath('/settings');
  revalidatePath('/experts');
  revalidatePath(`/experts/${userId}`);
  revalidatePath('/');
}

/** 必須要件を再検証してプロフィールを公開する */
export async function publishProfile(): Promise<PublishActionResult> {
  const me = await requireUser();
  if (!isWriterRole(me.role)) {
    return { ok: false, error: 'エキスパートのみ公開できます' };
  }
  const c = await getProfileCompleteness(me.id);
  if (!c.canPublish) {
    return {
      ok: false,
      error: `公開には次の項目が必要です: ${c.missingLabels.join('・')}`,
    };
  }
  try {
    const db = getDb();
    await db
      .update(schema.users)
      .set({ profilePublished: true, profilePublishedAt: new Date() })
      .where(eq(schema.users.id, me.id));
    revalidateProfilePaths(me.id);
    return { ok: true };
  } catch (err) {
    console.error('[publishProfile] failed:', err);
    return {
      ok: false,
      error:
        '公開に失敗しました（0084 マイグレーション未適用の可能性があります）',
    };
  }
}

/** プロフィールを非公開（下書き）に戻す。無条件で可 */
export async function unpublishProfile(): Promise<PublishActionResult> {
  const me = await requireUser();
  if (!isWriterRole(me.role)) {
    return { ok: false, error: 'エキスパートのみ操作できます' };
  }
  try {
    const db = getDb();
    await db
      .update(schema.users)
      .set({ profilePublished: false })
      .where(eq(schema.users.id, me.id));
    revalidateProfilePaths(me.id);
    return { ok: true };
  } catch (err) {
    console.error('[unpublishProfile] failed:', err);
    return { ok: false, error: '公開停止に失敗しました' };
  }
}
