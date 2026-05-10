'use server';

import 'server-only';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';

/**
 * 記事の（モック）購入。プロト段階では Stripe を呼ばずに、purchases テーブルに
 * `status='completed'` で 1 行入れる。
 *
 * 既に同じ buyer × article で完了済みの行があれば何もしない（再購入は許可しない）。
 */

const inputSchema = z.object({
  articleId: z.string().uuid(),
});

export type PurchaseActionResult =
  | { ok: true; alreadyOwned: boolean }
  | { ok: false; error: string };

export async function purchaseArticleMock(
  input: unknown,
): Promise<PurchaseActionResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const me = await requireUser();
  const db = getDb();

  // 価格を articles から引く
  const articleRows = await db
    .select({
      id: schema.articles.id,
      writerId: schema.articles.writerId,
      priceJpy: schema.articles.priceJpy,
    })
    .from(schema.articles)
    .where(eq(schema.articles.id, parsed.data.articleId))
    .limit(1);
  const article = articleRows[0];
  if (!article) return { ok: false, error: '記事が見つかりません' };

  if (article.writerId === me.id) {
    return { ok: false, error: '自分の記事は購入できません' };
  }

  // 既存購入チェック
  const existing = await db
    .select({ id: schema.purchases.id })
    .from(schema.purchases)
    .where(
      and(
        eq(schema.purchases.buyerId, me.id),
        eq(schema.purchases.articleId, parsed.data.articleId),
        eq(schema.purchases.status, 'completed'),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    return { ok: true, alreadyOwned: true };
  }

  try {
    await db.insert(schema.purchases).values({
      buyerId: me.id,
      articleId: parsed.data.articleId,
      amountJpy: article.priceJpy,
      feeJpy: Math.round(article.priceJpy * 0.2),
      payoutJpy: Math.round(article.priceJpy * 0.7),
      status: 'completed',
      purchasedAt: new Date(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `購入記録の保存に失敗しました: ${msg}` };
  }

  revalidatePath('/purchases');
  revalidatePath(`/articles/${parsed.data.articleId}`);
  return { ok: true, alreadyOwned: false };
}
