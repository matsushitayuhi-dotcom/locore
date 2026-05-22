import 'server-only';
import { and, desc, eq, ilike, isNull } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getArticleReviewStats } from '@/lib/articles/published';
import type { Article } from '@/lib/mock';

/**
 * タイトル or 本文の単純な ILIKE 検索。
 *
 * - mode='title' → title ILIKE '%q%'
 * - mode='body'  → body  ILIKE '%q%'
 * - 公開済み（status='published'）かつ未削除のみ
 * - 並び順: publishedAt 降順
 *
 * 将来は to_tsvector + websearch_to_tsquery で FTS に置き換える前提。
 */
export async function searchPublishedArticles(
  q: string,
  mode: 'title' | 'body',
  limit = 50,
): Promise<Article[]> {
  const query = q.trim();
  if (!query) return [];

  // SQL ワイルドカード対策（簡易）。% _ \\ をエスケープ
  const escaped = query.replace(/[\\%_]/g, (m) => '\\' + m);
  const pat = `%${escaped}%`;

  try {
    const db = getDb();
    const col =
      mode === 'title' ? schema.articles.title : schema.articles.body;
    const rows = await db
      .select({
        id: schema.articles.id,
        title: schema.articles.title,
        body: schema.articles.body,
        coverImageUrl: schema.articles.coverImageUrl,
        writerId: schema.articles.writerId,
        cityId: schema.articles.cityId,
        priceJpy: schema.articles.priceJpy,
        tags: schema.articles.tags,
        durationType: schema.articles.durationType,
        articleType: schema.articles.articleType,
        createdAt: schema.articles.createdAt,
        publishedAt: schema.articles.publishedAt,
        writerName: schema.users.displayName,
        writerAvatar: schema.users.avatarUrl,
        writerTier: schema.writerProfiles.tier,
        writerYears: schema.writerProfiles.residencyYears,
        cityNameJa: schema.cities.nameJa,
      })
      .from(schema.articles)
      .leftJoin(schema.users, eq(schema.articles.writerId, schema.users.id))
      .leftJoin(
        schema.writerProfiles,
        eq(schema.writerProfiles.userId, schema.articles.writerId),
      )
      .leftJoin(schema.cities, eq(schema.articles.cityId, schema.cities.id))
      .where(
        and(
          eq(schema.articles.status, 'published'),
          isNull(schema.articles.deletedAt),
          ilike(col, pat),
        ),
      )
      .orderBy(desc(schema.articles.publishedAt))
      .limit(limit);

    const durationMap: Record<string, '1h' | '半日' | '1日' | '数時間'> = {
      half_day: '半日',
      full_day: '1日',
      few_hours: '数時間',
      other: '半日',
    };

    // localScore / satisfaction / reviewCount / purchaseCount を一括集計
    const stats = await getArticleReviewStats(rows.map((r) => r.id));

    return rows.map(
      (r): Article => ({
        id: r.id,
        title: r.title,
        body: r.body ?? '',
        coverImageUrl:
          r.coverImageUrl ?? `https://picsum.photos/seed/${r.id}/960/640`,
        writerId: r.writerId,
        writerName: r.writerName ?? '匿名',
        writerAvatarUrl: r.writerAvatar ?? null,
        writerTier: (r.writerTier ?? 'B') as 'S' | 'A' | 'B',
        writerYears: r.writerYears ?? 0,
        cityId: r.cityId,
        area: r.cityNameJa ?? 'パリ',
        priceJpy: r.priceJpy,
        tags: r.tags ?? [],
        durationType: durationMap[r.durationType ?? 'other'] ?? '半日',
        articleType: r.articleType,
        createdAt: r.createdAt.toISOString(),
        publishedAt: (r.publishedAt ?? r.createdAt).toISOString(),
        localScoreAverage: stats.get(r.id)?.localScoreAverage ?? 70,
        satisfactionAverage: stats.get(r.id)?.satisfactionAverage ?? 4.5,
        reviewCount: stats.get(r.id)?.reviewCount ?? 0,
        purchaseCount: stats.get(r.id)?.purchaseCount ?? 0,
        spotIds: [],
      }),
    );
  } catch (err) {
    console.warn('[searchPublishedArticles] failed:', err);
    return [];
  }
}
