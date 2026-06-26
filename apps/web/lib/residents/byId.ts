import 'server-only';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import type { FeaturedService } from '@/lib/services/featured';
import type { LanguageLevel } from '@/lib/resident/constants';

/**
 * /residents/[id] 駐在員ハブ用に、ユーザー本体 + writer_profile + 公開記事 +
 * 出品サービス + レビュー集計 を 1 つにまとめて取得する。
 *
 * - スキーマ追加なし: 既存の users / writer_profiles / residency_verifications /
 *   articles / user_services / cities / purchases / reviews だけを使う
 * - 0038 / 0046 / 0050 マイグレーション未適用な開発環境でも落ちないよう
 *   各セクションを try/catch で守る (失敗 → 空 or false にフォールバック)
 */

export type ResidentArticleCard = {
  id: string;
  title: string;
  coverImageUrl: string | null;
  articleType: 'spot_guide' | 'itinerary' | 'expat_info' | string;
  priceJpy: number;
  publishedAt: string;
};

export type ResidentReviewItem = {
  id: string;
  satisfactionStars: number;
  localScore: number;
  body: string | null;
  createdAt: string;
  reviewerName: string;
  reviewerAvatarUrl: string | null;
  articleId: string;
  articleTitle: string;
};

export type ResidentReviewSummary = {
  avgStars: number | null;
  count: number;
  recent: ResidentReviewItem[];
};

export type ResidentProfileBundle = {
  /** 基本ユーザー情報 */
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  /** ISO string */
  createdAt: string;
  homeRegion: string | null;
  residencyCountry: string | null;
  residencyCity: string | null;
  arrivalYear: number | null;
  occupation: string | null;
  /** プロフィールのヒーロー背景画像 URL。NULL = ネットワーク演出のみ */
  coverImageUrl: string | null;
  /** 「こんな相談に乗れます」= 提供できることの箇条書き */
  offerings: string[];
  /** ソーシャルリンク（sns_links）。登録があるものだけ表示 */
  socialLinks: Array<{ platform: string; url: string }>;
  languages: Array<{ code: string; level: LanguageLevel }>;
  interests: string[];
  /** writer_profiles.tier (S/A/B) — 一般住人は null */
  tier: 'S' | 'A' | 'B' | null;
  /** writer_profiles.residency_years — 値があれば arrivalYear より優先表示可能 */
  writerResidencyYears: number | null;
  /** residency_verifications の最新申請が approved */
  isVerified: boolean;
  /** 公開中の記事 (全件)。tab 表示で 1 度に出すが多くなければ問題ない */
  articles: ResidentArticleCard[];
  /** is_active=true の出品サービス */
  services: FeaturedService[];
  /** 取り扱いカテゴリ — articles.articleType の distinct */
  articleCategories: string[];
  reviewSummary: ResidentReviewSummary;
};

const uuidPat =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getResidentProfile(
  userId: string,
): Promise<ResidentProfileBundle | null> {
  if (!uuidPat.test(userId)) return null;

  const db = getDb();

  // ----- 1. users + writer_profiles -----
  type UserRow = {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    role: string;
    createdAt: Date;
    homeRegion: string | null;
    residencyCountry: string | null;
    residencyCity: string | null;
    arrivalYear: number | null;
    occupation: string | null;
    coverImageUrl: string | null;
    offerings: unknown;
    languages: unknown;
    interests: unknown;
    tier: 'S' | 'A' | 'B' | null;
    writerResidencyYears: number | null;
  };

  let u: UserRow | null = null;
  try {
    const rows = await db
      .select({
        id: schema.users.id,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
        bio: schema.users.bio,
        role: schema.users.role,
        createdAt: schema.users.createdAt,
        homeRegion: schema.users.homeRegion,
        residencyCountry: schema.users.residencyCountry,
        residencyCity: schema.users.residencyCity,
        arrivalYear: schema.users.arrivalYear,
        occupation: schema.users.occupation,
        coverImageUrl: schema.users.coverImageUrl,
        offerings: schema.users.offerings,
        languages: schema.users.languages,
        interests: schema.users.interests,
        tier: schema.writerProfiles.tier,
        writerResidencyYears: schema.writerProfiles.residencyYears,
      })
      .from(schema.users)
      .leftJoin(
        schema.writerProfiles,
        eq(schema.writerProfiles.userId, schema.users.id),
      )
      .where(
        and(eq(schema.users.id, userId), isNull(schema.users.deletedAt)),
      )
      .limit(1);
    u = (rows[0] as UserRow | undefined) ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist/i.test(msg)) {
      // manual/0038 未適用 — 必須カラムだけで再 SELECT
      console.warn(
        '[getResidentProfile] resident profile columns missing — falling back.',
      );
      try {
        const rows = await db
          .select({
            id: schema.users.id,
            displayName: schema.users.displayName,
            avatarUrl: schema.users.avatarUrl,
            bio: schema.users.bio,
            role: schema.users.role,
            createdAt: schema.users.createdAt,
            tier: schema.writerProfiles.tier,
            writerResidencyYears: schema.writerProfiles.residencyYears,
          })
          .from(schema.users)
          .leftJoin(
            schema.writerProfiles,
            eq(schema.writerProfiles.userId, schema.users.id),
          )
          .where(
            and(eq(schema.users.id, userId), isNull(schema.users.deletedAt)),
          )
          .limit(1);
        const r = rows[0];
        if (!r) return null;
        u = {
          id: r.id,
          displayName: r.displayName,
          avatarUrl: r.avatarUrl,
          bio: r.bio,
          role: r.role,
          createdAt: r.createdAt,
          homeRegion: null,
          residencyCountry: null,
          residencyCity: null,
          arrivalYear: null,
          occupation: null,
          coverImageUrl: null,
          offerings: [],
          languages: [],
          interests: [],
          tier: (r.tier as 'S' | 'A' | 'B' | null) ?? null,
          writerResidencyYears: r.writerResidencyYears ?? null,
        };
      } catch {
        return null;
      }
    } else {
      console.error('[getResidentProfile] load failed:', msg);
      return null;
    }
  }

  if (!u) return null;

  // ----- 2. 本人確認 -----
  let isVerified = false;
  try {
    const rows = await db
      .select({ status: schema.residencyVerifications.status })
      .from(schema.residencyVerifications)
      .where(eq(schema.residencyVerifications.userId, userId))
      .orderBy(desc(schema.residencyVerifications.submittedAt))
      .limit(1);
    isVerified = rows[0]?.status === 'approved';
  } catch {
    isVerified = false;
  }

  // ----- 2.5 ソーシャルリンク (sns_links) -----
  let socialLinks: Array<{ platform: string; url: string }> = [];
  try {
    const rows = await db
      .select({
        platform: schema.snsLinks.platform,
        url: schema.snsLinks.url,
        createdAt: schema.snsLinks.createdAt,
      })
      .from(schema.snsLinks)
      .where(eq(schema.snsLinks.userId, userId))
      .orderBy(asc(schema.snsLinks.createdAt));
    socialLinks = rows
      .filter((r) => r.url)
      .map((r) => ({ platform: r.platform as string, url: r.url }));
  } catch {
    socialLinks = [];
  }

  // ----- 3. 公開記事 -----
  let articles: ResidentArticleCard[] = [];
  let articleCategories: string[] = [];
  try {
    const rows = await db
      .select({
        id: schema.articles.id,
        title: schema.articles.title,
        coverImageUrl: schema.articles.coverImageUrl,
        articleType: schema.articles.articleType,
        priceJpy: schema.articles.priceJpy,
        publishedAt: schema.articles.publishedAt,
        createdAt: schema.articles.createdAt,
      })
      .from(schema.articles)
      .where(
        and(
          eq(schema.articles.writerId, userId),
          eq(schema.articles.status, 'published'),
          isNull(schema.articles.deletedAt),
        ),
      )
      .orderBy(desc(schema.articles.publishedAt));
    articles = rows.map((a) => ({
      id: a.id,
      title: a.title,
      coverImageUrl: a.coverImageUrl ?? null,
      articleType: a.articleType,
      priceJpy: a.priceJpy ?? 0,
      publishedAt: (a.publishedAt ?? a.createdAt).toISOString(),
    }));
    articleCategories = Array.from(
      new Set(rows.map((a) => a.articleType as string).filter(Boolean)),
    );
  } catch {
    articles = [];
    articleCategories = [];
  }

  // ----- 4. 出品サービス -----
  let services: FeaturedService[] = [];
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
      })
      .from(schema.userServices)
      .leftJoin(
        schema.cities,
        eq(schema.cities.id, schema.userServices.cityId),
      )
      .where(
        and(
          eq(schema.userServices.userId, userId),
          eq(schema.userServices.isActive, true),
        ),
      )
      .orderBy(asc(schema.userServices.position));
    services = rows.map((r) => ({
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
      ownerId: userId,
      ownerDisplayName: u.displayName,
      ownerAvatarUrl: u.avatarUrl,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/does not exist/i.test(msg)) {
      console.warn('[getResidentProfile] services failed:', msg);
    }
    // 0046 / 0050 未適用環境では最小カラムで再試行
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
        })
        .from(schema.userServices)
        .where(
          and(
            eq(schema.userServices.userId, userId),
            eq(schema.userServices.isActive, true),
          ),
        )
        .orderBy(asc(schema.userServices.position));
      services = rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        priceJpy: r.priceJpy,
        priceUnit: r.priceUnit,
        contactMethod: (r.contactMethod ?? 'chat') as 'chat' | 'external_url',
        externalUrl: r.externalUrl,
        cityNameJa: null,
        citySlug: null,
        audience: null,
        coverImageUrl: null,
        tags: [],
        ownerId: userId,
        ownerDisplayName: u.displayName,
        ownerAvatarUrl: u.avatarUrl,
      }));
    } catch {
      services = [];
    }
  }

  // ----- 5. レビュー集計 (この駐在員の記事に紐づく) -----
  let reviewSummary: ResidentReviewSummary = {
    avgStars: null,
    count: 0,
    recent: [],
  };
  try {
    // 集計 (avg + count)
    const aggRows = await db
      .select({
        avg: sql<number>`AVG(${schema.reviews.satisfactionStars})::float`,
        cnt: sql<number>`COUNT(*)::int`,
      })
      .from(schema.reviews)
      .innerJoin(
        schema.purchases,
        eq(schema.purchases.id, schema.reviews.purchaseId),
      )
      .innerJoin(
        schema.articles,
        eq(schema.articles.id, schema.purchases.articleId),
      )
      .where(eq(schema.articles.writerId, userId));
    const avg = aggRows[0]?.avg ?? null;
    const cnt = aggRows[0]?.cnt ?? 0;

    // 直近 5 件
    const recentRows = await db
      .select({
        id: schema.reviews.id,
        satisfactionStars: schema.reviews.satisfactionStars,
        localScore: schema.reviews.localScore,
        body: schema.reviews.body,
        createdAt: schema.reviews.createdAt,
        reviewerName: schema.users.displayName,
        reviewerAvatarUrl: schema.users.avatarUrl,
        articleId: schema.articles.id,
        articleTitle: schema.articles.title,
      })
      .from(schema.reviews)
      .innerJoin(
        schema.purchases,
        eq(schema.purchases.id, schema.reviews.purchaseId),
      )
      .innerJoin(
        schema.articles,
        eq(schema.articles.id, schema.purchases.articleId),
      )
      .leftJoin(schema.users, eq(schema.users.id, schema.purchases.buyerId))
      .where(eq(schema.articles.writerId, userId))
      .orderBy(desc(schema.reviews.createdAt))
      .limit(5);

    reviewSummary = {
      avgStars:
        avg != null && Number.isFinite(avg) ? Math.round(avg * 10) / 10 : null,
      count: cnt,
      recent: recentRows.map((r) => ({
        id: r.id,
        satisfactionStars: r.satisfactionStars,
        localScore: r.localScore,
        body: r.body,
        createdAt: r.createdAt.toISOString(),
        reviewerName: r.reviewerName ?? '匿名',
        reviewerAvatarUrl: r.reviewerAvatarUrl,
        articleId: r.articleId,
        articleTitle: r.articleTitle,
      })),
    };
  } catch {
    reviewSummary = { avgStars: null, count: 0, recent: [] };
  }

  return {
    id: u.id,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    homeRegion: u.homeRegion,
    residencyCountry: u.residencyCountry,
    residencyCity: u.residencyCity,
    arrivalYear: u.arrivalYear,
    occupation: u.occupation,
    coverImageUrl: u.coverImageUrl ?? null,
    offerings: (u.offerings ?? []) as string[],
    socialLinks,
    languages: (u.languages ?? []) as Array<{
      code: string;
      level: LanguageLevel;
    }>,
    interests: (u.interests ?? []) as string[],
    tier: (u.tier as 'S' | 'A' | 'B' | null) ?? null,
    writerResidencyYears: u.writerResidencyYears ?? null,
    isVerified,
    articles,
    services,
    articleCategories,
    reviewSummary,
  };
}
