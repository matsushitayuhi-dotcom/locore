import 'server-only';
import { and, desc, eq, ilike, isNull, ne, or } from 'drizzle-orm';
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
): Promise<SearchArticleHit[]> {
  const query = q.trim();
  if (!query) return [];
  const pat = toPattern(query);

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
      .where(
        and(
          eq(schema.articles.status, 'published'),
          isNull(schema.articles.deletedAt),
          or(
            ilike(schema.articles.title, pat),
            ilike(schema.articles.body, pat),
          )!,
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
): Promise<SearchCommunityHit[]> {
  const query = q.trim();
  if (!query) return [];
  const pat = toPattern(query);

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

export async function searchUsers(
  q: string,
  limit = 30,
): Promise<SearchUserHit[]> {
  const query = q.trim();
  if (!query) return [];
  const pat = toPattern(query);

  try {
    const db = getDb();
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
