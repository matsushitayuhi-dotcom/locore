'use server';

import 'server-only';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { getCurrentUser } from '@/lib/auth/current-user';

/**
 * フォロー機能の Server Actions。
 *
 * - リスト自体は当事者にしか見えない（RLS）
 * - 件数だけは公開（サーバ側で COUNT(*) を取って返す）
 */

export type FollowActionResult =
  | { ok: true }
  | { ok: false; error: string };

const targetSchema = z.object({ targetUserId: z.string().uuid() });

export async function followUser(input: unknown): Promise<FollowActionResult> {
  const parsed = targetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };

  const me = await requireUser();
  if (me.id === parsed.data.targetUserId) {
    return { ok: false, error: '自分自身はフォローできません' };
  }
  const db = getDb();
  await db
    .insert(schema.userFollows)
    .values({
      followerId: me.id,
      followeeId: parsed.data.targetUserId,
    })
    .onConflictDoNothing();

  revalidatePath(`/writers/${parsed.data.targetUserId}`);
  return { ok: true };
}

export async function unfollowUser(
  input: unknown,
): Promise<FollowActionResult> {
  const parsed = targetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };

  const me = await requireUser();
  const db = getDb();
  await db
    .delete(schema.userFollows)
    .where(
      and(
        eq(schema.userFollows.followerId, me.id),
        eq(schema.userFollows.followeeId, parsed.data.targetUserId),
      ),
    );

  revalidatePath(`/writers/${parsed.data.targetUserId}`);
  return { ok: true };
}

/** あるユーザーのフォロワー数 / フォロー数 */
export type FollowCounts = {
  followers: number;
  following: number;
};

export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  try {
    const db = getDb();
    const [a, b] = await Promise.all([
      db
        .select({ cnt: sql<number>`count(*)::int` })
        .from(schema.userFollows)
        .where(eq(schema.userFollows.followeeId, userId)),
      db
        .select({ cnt: sql<number>`count(*)::int` })
        .from(schema.userFollows)
        .where(eq(schema.userFollows.followerId, userId)),
    ]);
    return {
      followers: a[0]?.cnt ?? 0,
      following: b[0]?.cnt ?? 0,
    };
  } catch {
    return { followers: 0, following: 0 };
  }
}

/** 現在のユーザーが target をフォロー中か */
export async function isFollowing(targetUserId: string): Promise<boolean> {
  const me = await getCurrentUser();
  if (!me) return false;
  try {
    const db = getDb();
    const rows = await db
      .select({ followerId: schema.userFollows.followerId })
      .from(schema.userFollows)
      .where(
        and(
          eq(schema.userFollows.followerId, me.id),
          eq(schema.userFollows.followeeId, targetUserId),
        ),
      )
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}
