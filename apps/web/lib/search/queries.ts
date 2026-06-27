import 'server-only';
import { and, asc, desc, eq, ilike, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import type { CommunityKind, CommunityStatus } from '@/lib/community/constants';

/**
 * /search ページのモード別検索クエリ。
 *
 * - searchArticles … 公開済み記事の title / body 部分一致（旅行者モード）
 * - searchCommunityPosts … community_posts (6 kind 全部) の title / body 部分一致（駐在員モード）
 * - searchUsers … users.displayName / bio / occupation 部分一致（両モード共通の「住人」セクション）
 *
 * 2026-05 IA リファクタで国 / 地域フィルタを追加:
 *   - countryCode: 'fr' のような ISO code（cities.country → countries.code で絞る）
 *   - regionSlug: 'paris' のような cities.slug
 *   - 両方未指定なら全件、指定された方だけ AND で絞り込む
 *
 * 既存の `lib/articles/search.ts` は SearchBox の `in=title|body` トグル経由で
 * 引き続き利用しているため、ここでは別系統として整理。
 *
 * is_sample=true のユーザーやサンプル投稿も結果に混ぜる（/residents の挙動に揃える）。
 */

/** SQL ワイルドカード対策（簡易）。% _ \\ をエスケープして ILIKE 用のパターンに包む */
function toPattern(q: string): string {
  const escaped = q.replace(/[\\%_]/g, (m) => '\\' + m);
  return `%${escaped}%`;
}

/** 共通: 国 / 地域絞り込みオプション */
export type GeoScope = {
  countryCode?: string;
  regionSlug?: string;
};

// ============================================================================
// 記事
// ============================================================================

export type SearchArticleHit = {
  id: string;
  title: string;
  bodyExcerpt: string;
  coverImageUrl: string | null;
  writerName: string | null;
  cityNameJa: string | null;
  publishedAt: string;
};

export async function searchArticles(
  q: string,
  limit = 30,
  scope: GeoScope = {},
): Promise<SearchArticleHit[]> {
  const query = q.trim();
  if (!query) return [];
  const pat = toPattern(query);
  const code = scope.countryCode?.trim().toLowerCase();
  const region = scope.regionSlug?.trim();

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.articles.id,
        title: schema.articles.title,
        body: schema.articles.body,
        coverImageUrl: schema.articles.coverImageUrl,
        writerName: schema.users.displayName,
        cityNameJa: schema.cities.nameJa,
        publishedAt: schema.articles.publishedAt,
        createdAt: schema.articles.createdAt,
      })
      .from(schema.articles)
      .leftJoin(schema.users, eq(schema.articles.writerId, schema.users.id))
      .leftJoin(schema.cities, eq(schema.articles.cityId, schema.cities.id))
      .leftJoin(
        schema.countries,
        eq(schema.countries.id, schema.cities.countryId),
      )
      .where(
        and(
          eq(schema.articles.status, 'published'),
          isNull(schema.articles.deletedAt),
          or(
            ilike(schema.articles.title, pat),
            ilike(schema.articles.body, pat),
          )!,
          code ? eq(schema.countries.code, code) : undefined,
          region ? eq(schema.cities.slug, region) : undefined,
        ),
      )
      .orderBy(desc(schema.articles.publishedAt))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      bodyExcerpt: (r.body ?? '').slice(0, 120),
      coverImageUrl: r.coverImageUrl,
      writerName: r.writerName,
      cityNameJa: r.cityNameJa,
      publishedAt: (r.publishedAt ?? r.createdAt).toISOString(),
    }));
  } catch (err) {
    console.warn('[searchArticles] failed:', err);
    return [];
  }
}

// ============================================================================
// コミュニティ投稿（6 kind 全部）
// ============================================================================

export type SearchCommunityHit = {
  id: string;
  kind: CommunityKind;
  title: string;
  bodyExcerpt: string;
  authorName: string | null;
  locationText: string | null;
  status: CommunityStatus;
  createdAt: string;
};

export async function searchCommunityPosts(
  q: string,
  limit = 30,
  opts: { kinds?: CommunityKind[]; countryCode?: string } = {},
): Promise<SearchCommunityHit[]> {
  const query = q.trim();
  if (!query) return [];
  const pat = toPattern(query);
  const code = opts.countryCode?.trim().toLowerCase();
  const kinds =
    opts.kinds && opts.kinds.length > 0 ? opts.kinds : undefined;

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.communityPosts.id,
        kind: schema.communityPosts.kind,
        title: schema.communityPosts.title,
        body: schema.communityPosts.body,
        authorName: schema.users.displayName,
        locationText: schema.communityPosts.locationText,
        status: schema.communityPosts.status,
        createdAt: schema.communityPosts.createdAt,
      })
      .from(schema.communityPosts)
      .leftJoin(
        schema.users,
        eq(schema.users.id, schema.communityPosts.authorId),
      )
      .where(
        and(
          eq(schema.communityPosts.status, 'active'),
          or(
            ilike(schema.communityPosts.title, pat),
            ilike(schema.communityPosts.body, pat),
          )!,
          kinds ? inArray(schema.communityPosts.kind, kinds) : undefined,
          code
            ? sql`${schema.communityPosts.cityId} IN (
                SELECT ${schema.cities.id} FROM ${schema.cities}
                JOIN ${schema.countries}
                  ON ${schema.countries.id} = ${schema.cities.countryId}
                WHERE ${schema.countries.code} = ${code}
              )`
            : undefined,
        ),
      )
      .orderBy(desc(schema.communityPosts.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      kind: r.kind as CommunityKind,
      title: r.title,
      bodyExcerpt: (r.body ?? '').slice(0, 120),
      authorName: r.authorName,
      locationText: r.locationText,
      status: r.status as CommunityStatus,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (err) {
    console.warn('[searchCommunityPosts] failed:', err);
    return [];
  }
}

// ============================================================================
// ユーザー（住人）
// ============================================================================

export type SearchUserHit = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  residencyCity: string | null;
  residencyCountry: string | null;
  occupation: string | null;
};

/**
 * users テーブルは cities への FK を持たないため、country / region フィルタは
 * residencyCountry / residencyCity の自由入力文字列 ILIKE で絞る。
 *
 * 引数で渡される countryCode (e.g. 'fr') は ISO コードだが、ユーザー入力の
 * residencyCountry には「フランス」「France」のように国名が入っているため、
 * countries テーブルで code → nameJa / nameEn に解決してから ILIKE 比較する。
 */
export async function searchUsers(
  q: string,
  limit = 30,
  scope: GeoScope = {},
): Promise<SearchUserHit[]> {
  const query = q.trim();
  if (!query) return [];
  const pat = toPattern(query);
  const code = scope.countryCode?.trim().toLowerCase();
  const region = scope.regionSlug?.trim();

  try {
    const db = getDb();

    // country / region 名称解決（自由入力カラムに対する ILIKE 用）
    let countryNamePatterns: string[] = [];
    if (code) {
      const crows = await db
        .select({
          nameJa: schema.countries.nameJa,
          nameEn: schema.countries.nameEn,
        })
        .from(schema.countries)
        .where(eq(schema.countries.code, code))
        .limit(1);
      const c = crows[0];
      if (c) {
        countryNamePatterns = [toPattern(c.nameJa), toPattern(c.nameEn)];
      }
    }
    let regionNamePatterns: string[] = [];
    if (region) {
      const rrows = await db
        .select({
          nameJa: schema.cities.nameJa,
          nameEn: schema.cities.nameEn,
        })
        .from(schema.cities)
        .where(eq(schema.cities.slug, region))
        .limit(1);
      const r0 = rrows[0];
      if (r0) {
        regionNamePatterns = [toPattern(r0.nameJa)];
        if (r0.nameEn) regionNamePatterns.push(toPattern(r0.nameEn));
      }
    }

    const rows = await db
      .select({
        id: schema.users.id,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
        bio: schema.users.bio,
        residencyCity: schema.users.residencyCity,
        residencyCountry: schema.users.residencyCountry,
        occupation: schema.users.occupation,
      })
      .from(schema.users)
      .where(
        and(
          isNull(schema.users.deletedAt),
          ne(schema.users.displayName, ''),
          or(
            ilike(schema.users.displayName, pat),
            ilike(schema.users.bio, pat),
            ilike(schema.users.occupation, pat),
            ilike(schema.users.residencyCity, pat),
            ilike(schema.users.homeRegion, pat),
          )!,
          countryNamePatterns.length > 0
            ? or(
                ...countryNamePatterns.map((p) =>
                  ilike(schema.users.residencyCountry, p),
                ),
              )
            : undefined,
          regionNamePatterns.length > 0
            ? or(
                ...regionNamePatterns.map((p) =>
                  ilike(schema.users.residencyCity, p),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(desc(schema.users.openToMeetups), desc(schema.users.updatedAt))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl,
      bio: r.bio,
      residencyCity: r.residencyCity,
      residencyCountry: r.residencyCountry,
      occupation: r.occupation,
    }));
  } catch (err) {
    console.warn('[searchUsers] failed:', err);
    return [];
  }
}

// ============================================================================
// サービス (user_services)
// ============================================================================

export type SearchServiceHit = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priceJpy: number | null;
  priceUnit: string | null;
  coverImageUrl: string | null;
  /** 0055 で追加。サービスカードでチップ表示するためここでも返す。 */
  tags: string[];
  cityNameJa: string | null;
  ownerId: string;
  ownerDisplayName: string;
  ownerAvatarUrl: string | null;
};

/**
 * user_services を title / description / category の ILIKE で横断検索。
 *
 * - is_active=true のみ
 * - 削除ユーザー (users.deleted_at IS NOT NULL) は除外
 * - 表示: position asc, createdAt desc。所属都市は cities.name_ja を leftJoin
 * - 旅行者モード /search でのみ呼び出す想定 (audience フィルタは掛けない。
 *   旧データの NULL audience も両モードに見せる方針 /lib/services/featured.ts
 *   と同様、検索結果でも幅広く拾う)
 * - 0046 / 0050 マイグレーション未適用環境では SELECT が失敗するため、
 *   "does not exist" エラーは空配列にフォールバック。
 */
export async function searchServices(
  q: string,
  limit = 30,
  scope: GeoScope = {},
): Promise<SearchServiceHit[]> {
  const query = q.trim();
  if (!query) return [];
  const pat = toPattern(query);
  const code = scope.countryCode?.trim().toLowerCase();
  const region = scope.regionSlug?.trim();

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.userServices.id,
        title: schema.userServices.title,
        description: schema.userServices.description,
        category: schema.userServices.category,
        priceJpy: schema.userServices.priceJpy,
        priceUnit: schema.userServices.priceUnit,
        coverImageUrl: schema.userServices.coverImageUrl,
        tags: schema.userServices.tags,
        position: schema.userServices.position,
        createdAt: schema.userServices.createdAt,
        cityNameJa: schema.cities.nameJa,
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
          eq(schema.userServices.isActive, true),
          isNull(schema.users.deletedAt),
          or(
            ilike(schema.userServices.title, pat),
            ilike(schema.userServices.description, pat),
            ilike(schema.userServices.category, pat),
            // 0055 のタグ複数化に伴い、tags 配列も検索対象に含める。
            // array_to_string で空白結合してから ILIKE。
            sql`array_to_string(${schema.userServices.tags}, ' ') ILIKE ${pat}`,
          )!,
          code ? eq(schema.countries.code, code) : undefined,
          region ? eq(schema.cities.slug, region) : undefined,
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
      coverImageUrl: r.coverImageUrl,
      tags: Array.isArray(r.tags) ? r.tags : [],
      cityNameJa: r.cityNameJa ?? null,
      ownerId: r.ownerId,
      ownerDisplayName: r.ownerDisplayName,
      ownerAvatarUrl: r.ownerAvatarUrl,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist/i.test(msg)) {
      console.warn(
        '[searchServices] user_services の追加カラム (city_id / audience / cover_image_url) が未適用です。',
      );
      return [];
    }
    console.warn('[searchServices] failed:', err);
    return [];
  }
}
