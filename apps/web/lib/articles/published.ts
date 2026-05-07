import 'server-only';
import { eq, desc, isNull, and } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import type { Article } from '@/lib/mock';

/**
 * DB に保存されている publish 済み記事を、フィード等で表示できる
 * `Article`（mock 型互換）の形に変換して返す。
 *
 * - 削除済み（`deleted_at IS NOT NULL`）は除外
 * - 著者プロフィール（writers/users）と JOIN
 * - 集計値（localScore/satisfaction/review/purchase）はまだ DB 集計してない
 *   ため、暫定で 0 / null 寄りのデフォルト
 *
 * 将来：reviews / purchases の集計をマテビュー化して反映
 */
export async function getPublishedDbArticles(limit = 50): Promise<Article[]> {
  let rows: Array<{
    id: string;
    title: string;
    body: string | null;
    coverImageUrl: string | null;
    writerId: string;
    cityId: string;
    priceJpy: number;
    tags: string[];
    durationType: 'half_day' | 'full_day' | 'few_hours' | 'other' | null;
    articleType: 'spot_guide' | 'itinerary';
    createdAt: Date;
    publishedAt: Date | null;
    writerName: string | null;
    writerAvatar: string | null;
    writerTier: 'S' | 'A' | 'B' | null;
    writerYears: number | null;
    cityNameJa: string | null;
  }> = [];

  try {
    const db = getDb();
    rows = await db
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
        ),
      )
      .orderBy(desc(schema.articles.publishedAt))
      .limit(limit);
  } catch (err) {
    // DB 未接続 / マイグレーション未適用 / 認証なしで RLS に弾かれた等
    // フィード自体は壊さないため、ログだけ残して空配列を返す。
    // eslint-disable-next-line no-console
    console.warn('[getPublishedDbArticles] failed, returning []:', err);
    return [];
  }

  // DB enum (half_day/full_day/few_hours/other) を mock の DurationType に正規化
  const durationMap: Record<string, '1h' | '半日' | '1日' | '数時間'> = {
    half_day: '半日',
    full_day: '1日',
    few_hours: '数時間',
    other: '半日',
  };

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body ?? '',
    coverImageUrl: r.coverImageUrl ?? `https://picsum.photos/seed/${r.id}/960/640`,
    writerId: r.writerId,
    cityId: r.cityId,
    area: r.cityNameJa ?? 'パリ',
    priceJpy: r.priceJpy,
    tags: r.tags ?? [],
    durationType: durationMap[r.durationType ?? 'other'] ?? '半日',
    articleType: r.articleType,
    createdAt: r.createdAt.toISOString(),
    publishedAt: (r.publishedAt ?? r.createdAt).toISOString(),
    // DB 集計が未実装のため暫定デフォルト
    localScoreAverage: 70,
    satisfactionAverage: 4.5,
    reviewCount: 0,
    purchaseCount: 0,
    spotIds: [],
  }));
}
