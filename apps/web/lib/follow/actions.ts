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

  revalidatePath(`/users/${parsed.data.targetUserId}`);
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

  revalidatePath(`/users/${parsed.data.targetUserId}`);
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

/**
 * フォロワー一覧（userId をフォローしている人たち）。
 * 自分自身のリストを取得する用途を想定（RLS で他人のリストは見えない）。
 */
export type FollowEntry = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  residencyCity: string | null;
  residencyCountry: string | null;
  followedAt: string;
};

export async function listFollowers(userId: string): Promise<FollowEntry[]> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.users.id,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
        bio: schema.users.bio,
        residencyCity: schema.users.residencyCity,
        residencyCountry: schema.users.residencyCountry,
        followedAt: schema.userFollows.createdAt,
      })
      .from(schema.userFollows)
      .innerJoin(schema.users, eq(schema.users.id, schema.userFollows.followerId))
      .where(eq(schema.userFollows.followeeId, userId))
      .orderBy(sql`${schema.userFollows.createdAt} desc`)
      .limit(200);
    return rows.map((r) => ({
      ...r,
      followedAt: r.followedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function listFollowing(userId: string): Promise<FollowEntry[]> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.users.id,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
        bio: schema.users.bio,
        residencyCity: schema.users.residencyCity,
        residencyCountry: schema.users.residencyCountry,
        followedAt: schema.userFollows.createdAt,
      })
      .from(schema.userFollows)
      .innerJoin(schema.users, eq(schema.users.id, schema.userFollows.followeeId))
      .where(eq(schema.userFollows.followerId, userId))
      .orderBy(sql`${schema.userFollows.createdAt} desc`)
      .limit(200);
    return rows.map((r) => ({
      ...r,
      followedAt: r.followedAt.toISOString(),
    }));
  } catch {
    return [];
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
