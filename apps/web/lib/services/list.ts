import 'server-only';
import { and, asc, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import type { FeaturedService } from './featured';

/**
 * /services ブラウズページ用のクエリヘルパ。
 *
 * featured.ts の audience フィルタロジックを踏襲しつつ、
 *   - 検索 (title/description ILIKE)
 *   - 都市 slug
 *   - カテゴリ
 *   - 価格レンジ
 *   - ソート
 *   - ページング (limit/offset)
 * を扱う。
 *
 * 注意:
 *   - audience が NULL の旧データは「指定なし」とみなして、特定 audience 指定時も
 *     フォールバックで含める (featured.ts と同じ思想)。
 *   - is_active=true のみ。
 *   - city_id が NULL のサービスは citySlug 指定時には除外。指定なしのときは出す。
 *   - 0046 / 0050 マイグレーション未適用環境では try/catch で空配列フォールバック。
 */

export type ServiceAudienceFilter = 'all' | 'traveler' | 'resident';
export type ServiceSort = 'newest' | 'price_asc' | 'price_desc';

export type ListServicesOptions = {
  audience?: ServiceAudienceFilter;
  citySlug?: string;
  category?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
  sort?: ServiceSort;
};

export type ListServicesResult = {
  services: FeaturedService[];
  total: number;
};

export async function listServices(
  opts: ListServicesOptions = {},
): Promise<ListServicesResult> {
  const {
    audience = 'all',
    citySlug,
    category,
    q,
    minPrice,
    maxPrice,
    limit = 24,
    offset = 0,
    sort = 'newest',
  } = opts;

  const db = getDb();

  // featured.ts と同じ audience フィルタ
  let matchAudience = undefined;
  if (audience === 'traveler') {
    matchAudience = or(
      eq(schema.userServices.audience, 'traveler'),
      eq(schema.userServices.audience, 'both'),
      isNull(schema.userServices.audience),
    );
  } else if (audience === 'resident') {
    matchAudience = or(
      eq(schema.userServices.audience, 'resident'),
      eq(schema.userServices.audience, 'both'),
      isNull(schema.userServices.audience),
    );
  }

  const trimmedQ = q?.trim();

  try {
    const where = and(
      eq(schema.userServices.isActive, true),
      isNull(schema.users.deletedAt),
      matchAudience,
      citySlug ? eq(schema.cities.slug, citySlug) : undefined,
      category ? eq(schema.userServices.category, category) : undefined,
      trimmedQ
        ? or(
            ilike(schema.userServices.title, `%${trimmedQ}%`),
            ilike(schema.userServices.description, `%${trimmedQ}%`),
          )
        : undefined,
      minPrice != null
        ? sql`${schema.userServices.priceJpy} >= ${minPrice}`
        : undefined,
      maxPrice != null
        ? sql`${schema.userServices.priceJpy} <= ${maxPrice}`
        : undefined,
    );

    const orderBy =
      sort === 'price_asc'
        ? [asc(schema.userServices.priceJpy), desc(schema.userServices.createdAt)]
        : sort === 'price_desc'
          ? [desc(schema.userServices.priceJpy), desc(schema.userServices.createdAt)]
          : [
              asc(schema.userServices.position),
              desc(schema.userServices.createdAt),
            ];

    const rows = await db
      .select({
        id: schema.userServices.id,
        title: schema.userServices.title,
        description: schema.userServices.description,
        category: schema.userServices.category,
        priceJpy: schema.userServices.priceJpy,
        priceUnit: schema.userServices.priceUnit,
        contactMethod: schema.userServices.contactMethod,
        externalUrl: schema.userServices.externalUrl,
        audience: schema.userServices.audience,
        coverImageUrl: schema.userServices.coverImageUrl,
        cityNameJa: schema.cities.nameJa,
        citySlug: schema.cities.slug,
        ownerId: schema.users.id,
        ownerDisplayName: schema.users.displayName,
        ownerAvatarUrl: schema.users.avatarUrl,
      })
      .from(schema.userServices)
      .innerJoin(
        schema.users,
        eq(schema.users.id, schema.userServices.userId),
      )
      .leftJoin(
        schema.cities,
        eq(schema.cities.id, schema.userServices.cityId),
      )
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    // total 件数 (フィルタ込み)。シンプルに別クエリ。
    const totalRows = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(schema.userServices)
      .innerJoin(
        schema.users,
        eq(schema.users.id, schema.userServices.userId),
      )
      .leftJoin(
        schema.cities,
        eq(schema.cities.id, schema.userServices.cityId),
      )
      .where(where);

    const total = totalRows[0]?.cnt ?? 0;

    const services: FeaturedService[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      priceJpy: r.priceJpy,
      priceUnit: r.priceUnit,
      contactMethod: (r.contactMethod ?? 'chat') as 'chat' | 'external_url',
      externalUrl: r.externalUrl,
      cityNameJa: r.cityNameJa ?? null,
      citySlug: r.citySlug ?? null,
      audience: (r.audience as FeaturedService['audience']) ?? null,
      coverImageUrl: r.coverImageUrl ?? null,
      ownerId: r.ownerId,
      ownerDisplayName: r.ownerDisplayName,
      ownerAvatarUrl: r.ownerAvatarUrl,
    }));

    return { services, total };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist/i.test(msg)) {
      console.warn(
        '[listServices] user_services.city_id/audience/cover_image_url missing — ' +
          'manual/0046_user_services_city_audience.sql / 0050_user_services_cover_image.sql を適用してください。',
      );
      return { services: [], total: 0 };
    }
    console.error('[listServices] failed:', msg);
    return { services: [], total: 0 };
  }
}

/**
 * 特定ユーザーが出品している有償サービスを最大 `limit` 件まで返す。
 * /articles/[id] の著者カード末尾「この駐在員の他のサービス」セクションで使う。
 *
 * - is_active=true のみ
 * - position 昇順 → createdAt 降順
 * - city / audience カラムが無い古い環境では空配列にフォールバック
 */
export async function listServicesByUserId(
  userId: string,
  limit = 3,
): Promise<FeaturedService[]> {
  if (!userId) return [];
  const db = getDb();
  try {
    const rows = await db
      .select({
        id: schema.userServices.id,
        title: schema.userServices.title,
        description: schema.userServices.description,
        category: schema.userServices.category,
        priceJpy: schema.userServices.priceJpy,
        priceUnit: schema.userServices.priceUnit,
        contactMethod: schema.userServices.contactMethod,
        externalUrl: schema.userServices.externalUrl,
        audience: schema.userServices.audience,
        coverImageUrl: schema.userServices.coverImageUrl,
        cityNameJa: schema.cities.nameJa,
        citySlug: schema.cities.slug,
        ownerId: schema.users.id,
        ownerDisplayName: schema.users.displayName,
        ownerAvatarUrl: schema.users.avatarUrl,
      })
      .from(schema.userServices)
      .innerJoin(
        schema.users,
        eq(schema.users.id, schema.userServices.userId),
      )
      .leftJoin(
        schema.cities,
        eq(schema.cities.id, schema.userServices.cityId),
      )
      .where(
        and(
          eq(schema.userServices.userId, userId),
          eq(schema.userServices.isActive, true),
          isNull(schema.users.deletedAt),
        ),
      )
      .orderBy(
        asc(schema.userServices.position),
        desc(schema.userServices.createdAt),
      )
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      priceJpy: r.priceJpy,
      priceUnit: r.priceUnit,
      contactMethod: (r.contactMethod ?? 'chat') as 'chat' | 'external_url',
      externalUrl: r.externalUrl,
      cityNameJa: r.cityNameJa ?? null,
      citySlug: r.citySlug ?? null,
      audience: (r.audience as FeaturedService['audience']) ?? null,
      coverImageUrl: r.coverImageUrl ?? null,
      ownerId: r.ownerId,
      ownerDisplayName: r.ownerDisplayName,
      ownerAvatarUrl: r.ownerAvatarUrl,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist/i.test(msg)) {
      console.warn(
        '[listServicesByUserId] user_services 拡張カラム未適用。0046 / 0050 を適用してください。',
      );
      return [];
    }
    console.error('[listServicesByUserId] failed:', msg);
    return [];
  }
}

/**
 * フィルタ UI 用に、user_services.category で使われている値の一覧を distinct で取る。
 * 空のとき / 失敗時は空配列。
 */
export async function listServiceCategories(): Promise<string[]> {
  try {
    const db = getDb();
    const rows = await db
      .selectDistinct({ category: schema.userServices.category })
      .from(schema.userServices)
      .where(eq(schema.userServices.isActive, true));
    return rows
      .map((r) => r.category)
      .filter((c): c is string => !!c)
      .sort();
  } catch (err) {
    console.warn('[listServiceCategories] failed:', err);
    return [];
  }
}
