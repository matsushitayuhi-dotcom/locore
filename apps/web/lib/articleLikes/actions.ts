'use server';

import 'server-only';
import { z } from 'zod';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { getCurrentUser } from '@/lib/auth/current-user';

/**
 * 記事いいね機能の Server Actions。
 *
 * - 1 ユーザー × 1 記事 = 1 票
 * - 件数はサーバ側で COUNT(*) して公開、行自体は本人だけ閲覧可
 */

export type LikeActionResult =
  | { ok: true; data?: { liked: boolean } }
  | { ok: false; error: string };

const articleSchema = z.object({ articleId: z.string().uuid() });

/** トグル：未いいね → いいね、既いいね → 解除。返り値で最終状態を返す */
export async function toggleArticleLike(
  input: unknown,
): Promise<LikeActionResult> {
  const parsed = articleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const me = await requireUser();
  const db = getDb();

  const existing = await db
    .select({ articleId: schema.articleLikes.articleId })
    .from(schema.articleLikes)
    .where(
      and(
        eq(schema.articleLikes.userId, me.id),
        eq(schema.articleLikes.articleId, parsed.data.articleId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(schema.articleLikes)
      .where(
        and(
          eq(schema.articleLikes.userId, me.id),
          eq(schema.articleLikes.articleId, parsed.data.articleId),
        ),
      );
    revalidatePath(`/articles/${parsed.data.articleId}`);
    return { ok: true, data: { liked: false } };
  }

  await db
    .insert(schema.articleLikes)
    .values({
      userId: me.id,
      articleId: parsed.data.articleId,
    })
    .onConflictDoNothing();
  revalidatePath(`/articles/${parsed.data.articleId}`);
  return { ok: true, data: { liked: true } };
}

/** 記事 ID に対する like / bookmark 件数 */
export type ArticleSocialCounts = {
  likeCount: number;
  bookmarkCount: number;
};

export async function getArticleSocialCounts(
  articleIds: string[],
): Promise<Map<string, ArticleSocialCounts>> {
  const out = new Map<string, ArticleSocialCounts>();
  if (articleIds.length === 0) return out;
  try {
    const db = getDb();
    const [likes, bookmarks] = await Promise.all([
      db
        .select({
          articleId: schema.articleLikes.articleId,
          cnt: sql<number>`count(*)::int`,
        })
        .from(schema.articleLikes)
        .where(inArray(schema.articleLikes.articleId, articleIds))
        .groupBy(schema.articleLikes.articleId),
      db
        .select({
          articleId: schema.bookmarks.articleId,
          cnt: sql<number>`count(*)::int`,
        })
        .from(schema.bookmarks)
        .where(inArray(schema.bookmarks.articleId, articleIds))
        .groupBy(schema.bookmarks.articleId),
    ]);
    const likeMap = new Map(likes.map((l) => [l.articleId, l.cnt]));
    const bookmarkMap = new Map(bookmarks.map((b) => [b.articleId, b.cnt]));
    for (const id of articleIds) {
      out.set(id, {
        likeCount: likeMap.get(id) ?? 0,
        bookmarkCount: bookmarkMap.get(id) ?? 0,
      });
    }
  } catch {
    for (const id of articleIds) {
      out.set(id, { likeCount: 0, bookmarkCount: 0 });
    }
  }
  return out;
}

/** 自分がいいね済みの記事 ID 集合 */
export async function listMyLikedArticleIds(): Promise<Set<string>> {
  const me = await getCurrentUser();
  if (!me) return new Set();
  try {
    const db = getDb();
    const rows = await db
      .select({ articleId: schema.articleLikes.articleId })
      .from(schema.articleLikes)
      .where(eq(schema.articleLikes.userId, me.id));
    return new Set(rows.map((r) => r.articleId));
  } catch {
    return new Set();
  }
}
