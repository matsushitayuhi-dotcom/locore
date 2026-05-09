import 'server-only';
import { eq, desc, isNull, and, asc, sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import type { Article, Writer, Spot } from '@/lib/mock';

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

/**
 * UUID 形式の ID から DB 上の記事と関連データを引いて、
 * mock 互換の形に変換する。詳細ページのフォールバック用。
 *
 * @param id article UUID
 * @returns null（未検出 or 失敗）/ または記事＋著者＋スポット
 */
export async function getDbArticleBundle(id: string): Promise<{
  article: Article;
  writer: Writer | null;
  spots: Spot[];
} | null> {
  // UUID v4 形式のみ DB を引く（mock の "art_001" などは早期 return）
  const uuidPat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPat.test(id)) return null;

  try {
    const db = getDb();
    const articleRows = await db
      .select({
        id: schema.articles.id,
        title: schema.articles.title,
        body: schema.articles.body,
        bodyPaid: schema.articles.bodyPaid,
        itineraryBlocks: schema.articles.itineraryBlocks,
        coverImageUrl: schema.articles.coverImageUrl,
        writerId: schema.articles.writerId,
        cityId: schema.articles.cityId,
        priceJpy: schema.articles.priceJpy,
        tags: schema.articles.tags,
        durationType: schema.articles.durationType,
        articleType: schema.articles.articleType,
        createdAt: schema.articles.createdAt,
        publishedAt: schema.articles.publishedAt,
        status: schema.articles.status,
        deletedAt: schema.articles.deletedAt,
        cityNameJa: schema.cities.nameJa,
      })
      .from(schema.articles)
      .leftJoin(schema.cities, eq(schema.articles.cityId, schema.cities.id))
      .where(eq(schema.articles.id, id))
      .limit(1);

    if (articleRows.length === 0) return null;
    const a = articleRows[0]!;
    if (a.status !== 'published' || a.deletedAt) return null;

    // 著者情報
    const writerRows = await db
      .select({
        id: schema.users.id,
        name: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
        bio: schema.users.bio,
        tier: schema.writerProfiles.tier,
        residencyYears: schema.writerProfiles.residencyYears,
        residencyCountry: schema.writerProfiles.residencyCountry,
        foundingMember: schema.writerProfiles.foundingMember,
      })
      .from(schema.users)
      .leftJoin(
        schema.writerProfiles,
        eq(schema.writerProfiles.userId, schema.users.id),
      )
      .where(eq(schema.users.id, a.writerId))
      .limit(1);

    const w = writerRows[0];
    const writer: Writer | null = w
      ? {
          id: w.id,
          name: w.name ?? '匿名',
          city: a.cityNameJa ?? 'パリ',
          cityId: a.cityId,
          tier: (w.tier ?? 'B') as 'S' | 'A' | 'B',
          residencyYears: w.residencyYears ?? 1,
          bio: w.bio ?? '',
          avatarUrl: w.avatarUrl ?? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(w.name ?? 'L')}`,
          isFounding: w.foundingMember ?? false,
          isVerifiedCreator: false,
          social: {},
          followerCount: 0,
        }
      : null;

    // スポット（PostGIS lat/lng）
    const spotRows = await db
      .select({
        id: schema.spots.id,
        articleId: schema.spots.articleId,
        name: schema.spots.name,
        address: schema.spots.address,
        category: schema.spots.category,
        priceEstimate: schema.spots.priceEstimate,
        openingHours: schema.spots.openingHours,
        tags: schema.spots.tags,
        position: schema.spots.position,
      })
      .from(schema.spots)
      .where(eq(schema.spots.articleId, id))
      .orderBy(asc(schema.spots.position));

    const coordsMap = new Map<string, { lat: number; lng: number }>();
    if (spotRows.length > 0) {
      const dbAny = db as unknown as {
        execute: (q: ReturnType<typeof sql>) => Promise<unknown>;
      };
      const result = (await dbAny.execute(
        sql`select id::text as id, ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng from spots where id IN (${sql.join(
          spotRows.map((s) => sql`${s.id}::uuid`),
          sql`, `,
        )})`,
      )) as
        | Array<{ id: string; lat: number; lng: number }>
        | { rows: Array<{ id: string; lat: number; lng: number }> };
      const rows = Array.isArray(result) ? result : result.rows;
      for (const r of rows) {
        coordsMap.set(r.id, { lat: Number(r.lat), lng: Number(r.lng) });
      }
    }

    // mock の DurationType に正規化
    const durationMap: Record<string, '1h' | '半日' | '1日' | '数時間'> = {
      half_day: '半日',
      full_day: '1日',
      few_hours: '数時間',
      other: '半日',
    };

    const spots: Spot[] = spotRows.map((s) => {
      const coords = coordsMap.get(s.id) ?? { lat: 0, lng: 0 };
      return {
        id: s.id,
        articleId: s.articleId,
        name: s.name,
        address: s.address ?? '',
        lat: coords.lat,
        lng: coords.lng,
        category: (s.category ?? 'other') as Spot['category'],
        priceEstimate: s.priceEstimate ?? '',
        openingHours: s.openingHours as Spot['openingHours'],
        tags: s.tags ?? [],
      };
    });

    const article: Article = {
      id: a.id,
      title: a.title,
      body: a.body ?? '',
      bodyPaid: a.bodyPaid ?? null,
      itineraryBlocks: (a.itineraryBlocks as Article['itineraryBlocks']) ?? null,
      coverImageUrl: a.coverImageUrl ?? `https://picsum.photos/seed/${a.id}/960/640`,
      writerId: a.writerId,
      cityId: a.cityId,
      area: a.cityNameJa ?? 'パリ',
      priceJpy: a.priceJpy,
      tags: a.tags ?? [],
      durationType: durationMap[a.durationType ?? 'other'] ?? '半日',
      articleType: a.articleType,
      createdAt: a.createdAt.toISOString(),
      publishedAt: (a.publishedAt ?? a.createdAt).toISOString(),
      localScoreAverage: 70,
      satisfactionAverage: 4.5,
      reviewCount: 0,
      purchaseCount: 0,
      spotIds: spots.map((s) => s.id),
    };

    return { article, writer, spots };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[getDbArticleBundle] failed:', err);
    return null;
  }
}
