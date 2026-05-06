'use server';

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import type { NotificationPreferences } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/current-user';

const channelSchema = z.object({
  article_published: z.boolean(),
  trip_reminder: z.boolean(),
  crisis_alert: z.boolean(),
  purchase_completed: z.boolean(),
});

const prefsSchema = z.object({
  web_push: channelSchema,
  email: channelSchema,
});

export type UpdatePrefsResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateNotificationPreferences(
  input: unknown,
): Promise<UpdatePrefsResult> {
  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: '入力内容に誤りがあります' };
  }
  const prefs: NotificationPreferences = parsed.data;
  const user = await getCurrentUser();
  const db = getDb();

  await db
    .update(schema.users)
    .set({ notificationPreferences: prefs, updatedAt: new Date() })
    .where(eq(schema.users.id, user.id));

  revalidatePath('/settings/notifications');
  return { ok: true };
}

/**
 * Web Push 購読登録（モック）。VAPID 連携は今回スコープ外。
 * TODO: ServiceWorker 経由の `pushManager.subscribe()` 結果を受け取って
 *       push_subscriptions に upsert する。
 */
export async function registerPushSubscriptionMock(): Promise<UpdatePrefsResult> {
  // 何もしない（UI 側のフィードバックのみ）
  return { ok: true };
}
