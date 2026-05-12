'use server';

import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { getCurrentUser } from '@/lib/auth/current-user';

/**
 * 記事のレビュー（購入後に書ける）の Server Actions。
 *
 * - 1 購入 = 1 レビュー（reviews.purchase_id UNIQUE）
 * - local_score: 0-100
 * - satisfaction_stars: 1-5
 * - tags: 最大 3 個
 *
 * UI フロー:
 *   購入済み記事の詳細ページに ReviewForm を表示 → submitReview。
 *   既にレビュー済みなら自分のレビューを表示。
 */

export type ReviewActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const submitSchema = z.object({
  articleId: z.string().uuid(),
  satisfactionStars: z.number().int().min(1).max(5),
  localScore: z.number().int().min(0).max(100),
  body: z.string().trim().min(1).max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(3).optional(),
  visitedAt: z.string().optional(),
});

export async function submitReview(
  input: unknown,
): Promise<ReviewActionResult<{ reviewId: string }>> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? '入力内容に誤りがあります',
    };
  }
  const me = await requireUser();
  const db = getDb();

  // 1. 当該記事の自分の購入を引く
  const purchaseRows = await db
    .select({ id: schema.purchases.id })
    .from(schema.purchases)
    .where(
      and(
        eq(schema.purchases.articleId, parsed.data.articleId),
        eq(schema.purchases.buyerId, me.id),
      ),
    )
    .orderBy(desc(schema.purchases.purchasedAt))
    .limit(1);
  const purchase = purchaseRows[0];
  if (!purchase) {
    return { ok: false, error: '購入済みの記事のみレビューできます' };
  }

  // 2. UPSERT（既にあれば本文と評価だけ更新）
  const inserted = await db
    .insert(schema.reviews)
    .values({
      purchaseId: purchase.id,
      satisfactionStars: parsed.data.satisfactionStars,
      localScore: parsed.data.localScore,
      body: parsed.data.body ?? null,
      tags: parsed.data.tags ?? [],
      visitedAt: parsed.data.visitedAt ? new Date(parsed.data.visitedAt) : null,
    })
    .onConflictDoUpdate({
      target: schema.reviews.purchaseId,
      set: {
        satisfactionStars: parsed.data.satisfactionStars,
        localScore: parsed.data.localScore,
        body: parsed.data.body ?? null,
        tags: parsed.data.tags ?? [],
        visitedAt: parsed.data.visitedAt ? new Date(parsed.data.visitedAt) : null,
      },
    })
    .returning({ id: schema.reviews.id });

  revalidatePath(`/articles/${parsed.data.articleId}`);
  return { ok: true, data: { reviewId: inserted[0]!.id } };
}

/** ある記事の自分のレビューを取得（編集フォームの初期値用） */
export async function getMyReviewForArticle(articleId: string): Promise<{
  reviewId: string;
  satisfactionStars: number;
  localScore: number;
  body: string | null;
  tags: string[];
  visitedAt: string | null;
} | null> {
  const me = await getCurrentUser();
  if (!me) return null;
  try {
    const db = getDb();
    const rows = await db
      .select({
        reviewId: schema.reviews.id,
        satisfactionStars: schema.reviews.satisfactionStars,
        localScore: schema.reviews.localScore,
        body: schema.reviews.body,
        tags: schema.reviews.tags,
        visitedAt: schema.reviews.visitedAt,
      })
      .from(schema.reviews)
      .innerJoin(
        schema.purchases,
        eq(schema.purchases.id, schema.reviews.purchaseId),
      )
      .where(
        and(
          eq(schema.purchases.articleId, articleId),
          eq(schema.purchases.buyerId, me.id),
        ),
      )
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      reviewId: r.reviewId,
      satisfactionStars: r.satisfactionStars,
      localScore: r.localScore,
      body: r.body,
      tags: r.tags ?? [],
      visitedAt: r.visitedAt ? r.visitedAt.toISOString() : null,
    };
  } catch {
    return null;
  }
}

/** ある記事の最新レビュー一覧（公開表示用） */
export type ArticleReviewItem = {
  id: string;
  satisfactionStars: number;
  localScore: number;
  body: string | null;
  tags: string[];
  createdAt: string;
  reviewerName: string;
  reviewerAvatarUrl: string | null;
};

export async function listArticleReviews(
  articleId: string,
  limit = 20,
): Promise<ArticleReviewItem[]> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.reviews.id,
        satisfactionStars: schema.reviews.satisfactionStars,
        localScore: schema.reviews.localScore,
        body: schema.reviews.body,
        tags: schema.reviews.tags,
        createdAt: schema.reviews.createdAt,
        reviewerName: schema.users.displayName,
        reviewerAvatarUrl: schema.users.avatarUrl,
      })
      .from(schema.reviews)
      .innerJoin(
        schema.purchases,
        eq(schema.purchases.id, schema.reviews.purchaseId),
      )
      .leftJoin(schema.users, eq(schema.users.id, schema.purchases.buyerId))
      .where(eq(schema.purchases.articleId, articleId))
      .orderBy(desc(schema.reviews.createdAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      satisfactionStars: r.satisfactionStars,
      localScore: r.localScore,
      body: r.body,
      tags: r.tags ?? [],
      createdAt: r.createdAt.toISOString(),
      reviewerName: r.reviewerName ?? '匿名',
      reviewerAvatarUrl: r.reviewerAvatarUrl,
    }));
  } catch {
    return [];
  }
}
