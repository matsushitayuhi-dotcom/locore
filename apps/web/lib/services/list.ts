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
  /** ISO alpha-2 lowercase (例: 'fr')。指定すると cities→countries 経由で国で絞る。 */
  countryCode?: string;
  category?: string;
  /** 複数タグ。指定された場合は tags && {tag1,tag2,...} (overlap) でフィルタ。
   *  空配列 / undefined はノーフィルタ。 */
  tags?: string[];
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
    countryCode,
    category,
    tags,
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
  const filteredTags = (tags ?? [])
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  try {
    const where = and(
      eq(schema.userServices.isActive, true),
      isNull(schema.users.deletedAt),
      matchAudience,
      citySlug ? eq(schema.cities.slug, citySlug) : undefined,
      countryCode ? eq(schema.countries.code, countryCode) : undefined,
      category ? eq(schema.userServices.category, category) : undefined,
      // tags && ARRAY[...] (overlap) — どれか 1 つでもマッチすれば true。
      // 注意: `${jsArray}::text[]` だと postgres-js が配列を単一スカラーとして
      // バインドし "malformed array literal" になる。各要素を個別パラメータに
      // 展開した ARRAY[$1, $2, ...]::text[] を組み立てて回避する。
      filteredTags.length > 0
        ? sql`${schema.userServices.tags} && ARRAY[${sql.join(
            filteredTags.map((t) => sql`${t}`),
            sql`, `,
          )}]::text[]`
        : undefined,
      trimmedQ
        ? or(
            ilike(schema.userServices.title, `%${trimmedQ}%`),
            ilike(schema.userServices.description, `%${trimmedQ}%`),
            // tags 配列も検索対象に。array_to_string で空白結合してから ILIKE。
            // 0055 でタグ複数化したのに検索 q がタグを見ていなくて
            // 「ワイン」「駐妻」等のキーワードがヒットしなくなる問題への対処。
            sql`array_to_string(${schema.userServices.tags}, ' ') ILIKE ${'%' + trimmedQ + '%'}`,
            ilike(schema.userServices.category, `%${trimmedQ}%`),
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
        tags: schema.userServices.tags,
        createdAt: schema.userServices.createdAt,
        cityNameJa: schema.cities.nameJa,
        citySlug: schema.cities.slug,
        countryCode: schema.countries.code,
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
      .leftJoin(
        schema.countries,
        eq(schema.countries.id, schema.cities.countryId),
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
      .leftJoin(
        schema.countries,
        eq(schema.countries.id, schema.cities.countryId),
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
      countryCode: r.countryCode ?? null,
      audience: (r.audience as FeaturedService['audience']) ?? null,
      coverImageUrl: r.coverImageUrl ?? null,
      tags: Array.isArray(r.tags) ? r.tags : [],
      createdAt:
        r.createdAt instanceof Date
          ? r.createdAt.toISOString()
          : (r.createdAt as string | null) ?? null,
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
        tags: schema.userServices.tags,
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
      .leftJoin(
        schema.countries,
        eq(schema.countries.id, schema.cities.countryId),
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
      tags: Array.isArray(r.tags) ? r.tags : [],
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
 * フィルタ UI 用に、is_active=true な user_services から tags を unnest して
 * 出現回数の多い順に返す。0055 マイグレーション (tags 列追加) が未適用の環境では
 * 空配列にフォールバック。
 *
 * 戻り値: `{ tag, count }` の配列 (count 降順)。同 count は tag 昇順。
 */
export type TagWithCount = { tag: string; count: number };

export async function listAllTagsForServices(): Promise<TagWithCount[]> {
  try {
    const db = getDb();
    // unnest(tags) を sql テンプレートで打つ。is_active=true / owner 未削除に限定。
    const result = await db.execute(sql`
      SELECT t.tag AS tag, COUNT(*)::int AS count
        FROM user_services us
        INNER JOIN users u ON u.id = us.user_id
        CROSS JOIN LATERAL unnest(us.tags) AS t(tag)
       WHERE us.is_active = true
         AND u.deleted_at IS NULL
         AND t.tag IS NOT NULL
         AND t.tag <> ''
       GROUP BY t.tag
       ORDER BY count DESC, tag ASC
    `);
    // postgres-js は配列を直接返す / pg は { rows: [...] }。両対応。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any = result;
    const list: Array<{ tag?: unknown; count?: unknown }> = Array.isArray(rows)
      ? rows
      : rows?.rows ?? [];
    const out: TagWithCount[] = [];
    for (const r of list) {
      if (!r || typeof r.tag !== 'string') continue;
      const tag = r.tag.trim();
      if (!tag) continue;
      const count = typeof r.count === 'number' ? r.count : Number(r.count);
      if (!Number.isFinite(count)) continue;
      out.push({ tag, count });
    }
    return out;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist/i.test(msg)) {
      console.warn(
        '[listAllTagsForServices] user_services.tags 列が未適用です。manual/0055_user_services_tags.sql を適用してください。',
      );
      return [];
    }
    console.warn('[listAllTagsForServices] failed:', err);
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
