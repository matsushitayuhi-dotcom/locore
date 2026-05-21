import 'server-only';
import { eq, desc, isNull, and, asc, sql, ne, or, inArray } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import type { Article, Writer, Spot, Review } from '@/lib/mock';

/**
 * DB に保存されている publish 済み記事を、フィード等で表示できる
 * `Article`（mock 型互換）の形に変換して返す。
 *
 * - 削除済み（`deleted_at IS NOT NULL`）は除外
 * - 著者プロフィール（writers/users）と JOIN
 * - 集計値（localScore/satisfaction/review/purchase）はまだ DB 集計してない
 *   ため、暫定で 0 / null 寄りのデフォルト
 *
 * @param limit       取得件数上限
 * @param regionSlug  指定すると cities.slug = regionSlug の記事だけ返す
 *                    （/region/[slug] ホーム用）
 *
 * 将来：reviews / purchases の集計をマテビュー化して反映
 */
export async function getPublishedDbArticles(
  limit = 50,
  regionSlug?: string,
): Promise<Article[]> {
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
    articleType: 'spot_guide' | 'itinerary' | 'expat_info' | 'photo_journal';
    createdAt: Date;
    publishedAt: Date | null;
    writerName: string | null;
    writerAvatar: string | null;
    writerTier: 'S' | 'A' | 'B' | null;
    writerYears: number | null;
    cityNameJa: string | null;
    citySlug: string | null;
    countryCode: string | null;
    countryNameJa: string | null;
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
        citySlug: schema.cities.slug,
        countryCode: schema.countries.code,
        countryNameJa: schema.countries.nameJa,
      })
      .from(schema.articles)
      .leftJoin(schema.users, eq(schema.articles.writerId, schema.users.id))
      .leftJoin(
        schema.writerProfiles,
        eq(schema.writerProfiles.userId, schema.articles.writerId),
      )
      .leftJoin(schema.cities, eq(schema.articles.cityId, schema.cities.id))
      .leftJoin(
        schema.countries,
        eq(schema.countries.id, schema.cities.countryId),
      )
      .where(
        and(
          eq(schema.articles.status, 'published'),
          isNull(schema.articles.deletedAt),
          // #16: 予約公開 (publishedAt > NOW()) は status='draft' 経路で除外されるが、
          //   将来 status='published' のまま予約日時を扱うケースのために二重で防御。
          //   publishedAt が NULL のときは（過去データ互換のため）通す。
          sql`(${schema.articles.publishedAt} IS NULL OR ${schema.articles.publishedAt} <= NOW())`,
          regionSlug ? eq(schema.cities.slug, regionSlug) : sql`true`,
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

  return rows.map((r) => {
    const country = r.countryNameJa ?? '';
    const region = r.cityNameJa ?? 'パリ';
    // 国・地域タグ。例: 「フランス・パリ＆近郊」
    const area = country && country !== region ? `${country}・${region}` : region;
    return {
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
      area,
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
    };
  });
}

/**
 * UUID 形式の ID から DB 上の記事と関連データを引いて、
 * mock 互換の形に変換する。詳細ページのフォールバック用。
 *
 * @param id article UUID
 * @returns null（未検出 or 失敗）/ または記事＋著者＋スポット
 */
export type ArticleBundleRegion = {
  id: string;
  slug: string | null;
  nameJa: string;
};

export type ArticleBundleCountry = {
  code: string | null;
  nameJa: string;
};

export async function getDbArticleBundle(
  id: string,
  opts: { allowUnpublished?: boolean } = {},
): Promise<{
  article: Article;
  writer: Writer | null;
  spots: Spot[];
  reviews: Review[];
  related: Article[];
  region: ArticleBundleRegion | null;
  country: ArticleBundleCountry | null;
} | null> {
  // UUID v4 形式のみ DB を引く（mock の "art_001" などは早期 return）
  const uuidPat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPat.test(id)) return null;
  const { allowUnpublished = false } = opts;

  try {
    const db = getDb();
    const articleRows = await db
      .select({
        id: schema.articles.id,
        title: schema.articles.title,
        body: schema.articles.body,
        bodyPaid: schema.articles.bodyPaid,
        itineraryBlocks: schema.articles.itineraryBlocks,
        photoEntries: schema.articles.photoEntries,
        bodyStyle: schema.articles.bodyStyle,
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
        citySlug: schema.cities.slug,
        countryCode: schema.countries.code,
        countryNameJa: schema.countries.nameJa,
      })
      .from(schema.articles)
      .leftJoin(schema.cities, eq(schema.articles.cityId, schema.cities.id))
      .leftJoin(
        schema.countries,
        eq(schema.countries.id, schema.cities.countryId),
      )
      .where(eq(schema.articles.id, id))
      .limit(1);

    if (articleRows.length === 0) return null;
    const a = articleRows[0]!;
    // プレビュー用途で allowUnpublished=true のときは draft/pending_review も返す。
    // 削除済み (deleted_at) は常に弾く。
    if (a.deletedAt) return null;
    if (!allowUnpublished && a.status !== 'published') return null;

    const region: ArticleBundleRegion | null = a.cityId
      ? {
          id: a.cityId,
          slug: a.citySlug ?? null,
          nameJa: a.cityNameJa ?? '',
        }
      : null;
    const country: ArticleBundleCountry | null = a.countryNameJa
      ? {
          code: a.countryCode ?? null,
          nameJa: a.countryNameJa,
        }
      : null;

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
    let spotRows: Array<{
      id: string;
      articleId: string;
      name: string;
      address: string | null;
      category: string | null;
      priceEstimate: string | null;
      openingHours: unknown;
      tags: string[];
      position: number;
      googlePhotoUrls: string[] | null;
    }> = [];
    try {
      spotRows = await db
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
          googlePhotoUrls: schema.spots.googlePhotoUrls,
        })
        .from(schema.spots)
        .where(eq(schema.spots.articleId, id))
        .orderBy(asc(schema.spots.position));
    } catch {
      // 0025 未適用 → google_photo_urls 列なしでフォールバック
      const fallback = await db
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
      spotRows = fallback.map((r) => ({ ...r, googlePhotoUrls: null }));
    }

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
      // DB は jsonb（{note:"..."} or {mon:[...]} など）。mock の Spot.openingHours は
      // string のため、ここで人間可読な文字列に潰す。
      const oh = s.openingHours;
      const openingHoursText: string =
        oh == null
          ? ''
          : typeof oh === 'object' &&
              'note' in oh &&
              Object.keys(oh as object).length === 1
            ? (oh as { note?: string }).note ?? ''
            : JSON.stringify(oh);
      return {
        id: s.id,
        articleId: s.articleId,
        name: s.name,
        address: s.address ?? '',
        lat: coords.lat,
        lng: coords.lng,
        category: (s.category ?? 'other') as Spot['category'],
        priceEstimate: s.priceEstimate ?? '',
        openingHours: openingHoursText,
        tags: s.tags ?? [],
        photoUrls: s.googlePhotoUrls ?? [],
      };
    });

    // ----- レビュー（purchases 経由で article に紐付ける） -----
    const reviewRows = await db
      .select({
        id: schema.reviews.id,
        localScore: schema.reviews.localScore,
        satisfactionStars: schema.reviews.satisfactionStars,
        tags: schema.reviews.tags,
        body: schema.reviews.body,
        visitedAt: schema.reviews.visitedAt,
        purchaseId: schema.reviews.purchaseId,
        buyerName: schema.users.displayName,
      })
      .from(schema.reviews)
      .innerJoin(
        schema.purchases,
        eq(schema.purchases.id, schema.reviews.purchaseId),
      )
      .leftJoin(schema.users, eq(schema.users.id, schema.purchases.buyerId))
      .where(eq(schema.purchases.articleId, a.id))
      .orderBy(desc(schema.reviews.createdAt))
      .limit(50);

    const reviews: Review[] = reviewRows.map((r) => ({
      id: r.id,
      articleId: a.id,
      authorName: r.buyerName ?? '匿名',
      localScore: r.localScore,
      satisfaction: r.satisfactionStars,
      tags: r.tags ?? [],
      body: r.body ?? '',
      visitedAt: (r.visitedAt ?? new Date()).toISOString(),
    }));

    // 集計（mock 互換のための average/count）
    const reviewCount = reviews.length;
    const localScoreAverage =
      reviews.length > 0
        ? Math.round(
            reviews.reduce((acc, r) => acc + r.localScore, 0) / reviews.length,
          )
        : 70;
    const satisfactionAverage =
      reviews.length > 0
        ? +(
            reviews.reduce((acc, r) => acc + r.satisfaction, 0) / reviews.length
          ).toFixed(1)
        : 4.5;

    // ----- 関連記事（同じクリエイター + 同じ街） -----
    const relatedRows = await db
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
        cityNameJa: schema.cities.nameJa,
      })
      .from(schema.articles)
      .leftJoin(schema.cities, eq(schema.articles.cityId, schema.cities.id))
      .where(
        and(
          ne(schema.articles.id, a.id),
          eq(schema.articles.status, 'published'),
          isNull(schema.articles.deletedAt),
          or(
            eq(schema.articles.writerId, a.writerId),
            eq(schema.articles.cityId, a.cityId),
          ),
        ),
      )
      .orderBy(desc(schema.articles.publishedAt))
      .limit(6);

    const related: Article[] = relatedRows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body ?? '',
      coverImageUrl:
        r.coverImageUrl ?? `https://picsum.photos/seed/${r.id}/960/640`,
      writerId: r.writerId,
      cityId: r.cityId,
      area: r.cityNameJa ?? 'パリ',
      priceJpy: r.priceJpy,
      tags: r.tags ?? [],
      durationType: durationMap[r.durationType ?? 'other'] ?? '半日',
      articleType: r.articleType,
      createdAt: r.createdAt.toISOString(),
      publishedAt: (r.publishedAt ?? r.createdAt).toISOString(),
      localScoreAverage: 70,
      satisfactionAverage: 4.5,
      reviewCount: 0,
      purchaseCount: 0,
      spotIds: [],
    }));

    const article: Article = {
      id: a.id,
      title: a.title,
      body: a.body ?? '',
      bodyPaid: a.bodyPaid ?? null,
      itineraryBlocks: (a.itineraryBlocks as Article['itineraryBlocks']) ?? null,
      photoEntries: (a.photoEntries as Article['photoEntries']) ?? null,
      bodyStyle: (a.bodyStyle as Article['bodyStyle']) ?? 'classic',
      coverImageUrl: a.coverImageUrl ?? `https://picsum.photos/seed/${a.id}/960/640`,
      writerId: a.writerId,
      writerName: writer?.name,
      writerAvatarUrl: writer?.avatarUrl ?? null,
      writerTier: writer?.tier,
      writerYears: writer?.residencyYears,
      cityId: a.cityId,
      area: a.cityNameJa ?? 'パリ',
      priceJpy: a.priceJpy,
      tags: a.tags ?? [],
      durationType: durationMap[a.durationType ?? 'other'] ?? '半日',
      articleType: a.articleType,
      createdAt: a.createdAt.toISOString(),
      publishedAt: (a.publishedAt ?? a.createdAt).toISOString(),
      localScoreAverage,
      satisfactionAverage,
      reviewCount,
      purchaseCount: 0, // 必要なら count(*) で集計
      spotIds: spots.map((s) => s.id),
    };

    return { article, writer, spots, reviews, related, region, country };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[getDbArticleBundle] failed:', err);
    return null;
  }
}
