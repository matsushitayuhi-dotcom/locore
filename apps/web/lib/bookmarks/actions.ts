'use server';

import { z } from 'zod';
import { and, eq, desc } from 'drizzle-orm';
import { schema } from '@locore/db';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/current-user';

const bookmarkInputSchema = z.object({
  articleId: z.string().uuid(),
});

export type BookmarkActionResult =
  | { ok: true }
  | { ok: false; reason: 'unauthenticated' | 'invalid_input' | 'unknown'; message?: string };

/**
 * 現在ユーザーを取得。Agent A の書き換え後は `null` 許容になるため、
 * 例外で投げる旧実装と null を返す新実装の両方に対応する。
 */
async function tryGetCurrentUser() {
  try {
    const user = await getCurrentUser();
    return user ?? null;
  } catch {
    return null;
  }
}

export async function addBookmark(input: unknown): Promise<BookmarkActionResult> {
  const parsed = bookmarkInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: 'invalid_input',
      message: parsed.error.errors[0]?.message ?? 'invalid input',
    };
  }

  const user = await tryGetCurrentUser();
  if (!user) return { ok: false, reason: 'unauthenticated' };

  const db = getDb();
  await db
    .insert(schema.bookmarks)
    .values({ userId: user.id, articleId: parsed.data.articleId })
    .onConflictDoNothing();

  revalidatePath('/library');
  return { ok: true };
}

export async function removeBookmark(input: unknown): Promise<BookmarkActionResult> {
  const parsed = bookmarkInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: 'invalid_input',
      message: parsed.error.errors[0]?.message ?? 'invalid input',
    };
  }

  const user = await tryGetCurrentUser();
  if (!user) return { ok: false, reason: 'unauthenticated' };

  const db = getDb();
  await db
    .delete(schema.bookmarks)
    .where(
      and(
        eq(schema.bookmarks.userId, user.id),
        eq(schema.bookmarks.articleId, parsed.data.articleId),
      ),
    );

  revalidatePath('/library');
  return { ok: true };
}

/**
 * 自分のブックマークを記事メタ込みで取得。
 * 並びは bookmarks.created_at DESC（保存日が新しい順）。
 *
 * RLS により他人の bookmark は読めないが、サーバ側で auth.uid() を立てる前
 * （= 現状のモック認証）は drizzle 側で WHERE で絞っている。
 */
export async function listMyBookmarks() {
  const user = await tryGetCurrentUser();
  if (!user) return [] as Array<{ articleId: string; createdAt: Date }>;

  const db = getDb();
  const rows = await db
    .select({
      articleId: schema.bookmarks.articleId,
      createdAt: schema.bookmarks.createdAt,
    })
    .from(schema.bookmarks)
    .where(eq(schema.bookmarks.userId, user.id))
    .orderBy(desc(schema.bookmarks.createdAt));
  return rows;
}

/**
 * 自分のブックマーク済み記事 ID の Set。
 * 既ブックマーク表示の判定に使う（ArticleGrid の `bookmarkedIds` プロップ向け）。
 */
export async function getMyBookmarkedIdSet(): Promise<Set<string>> {
  const rows = await listMyBookmarks();
  return new Set(rows.map((r) => r.articleId));
}
