import 'server-only';
import { and, asc, desc, eq, isNull, ne } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import type { FeaturedService } from './featured';

/**
 * /services/[id] 詳細ページ用の単一サービス + provider 情報バンドル。
 *
 * - サービス本体 (公開 / 削除されてないオーナー)
 * - provider プロフィール (bio / avatar / residencyYears / tier / 本人確認)
 * - provider の公開記事 (最大 5 件)
 * - 同じ provider が出している他のサービス (本ページ自身を除く、最大 3 件)
 *
 * UUID 形式でなければ早期 null。is_active=false / オーナー deleted_at != null は null。
 */

export type ServiceArticleCard = {
  id: string;
  title: string;
  coverImageUrl: string | null;
  localScoreAverage: number | null;
  publishedAt: string;
};

export type ServiceProvider = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  residencyYears: number | null;
  /** writer のみ / 一般住人は null */
  tier: 'S' | 'A' | 'B' | null;
  /** residency_verifications.status='approved' の最新申請があれば true */
  isVerified: boolean;
  articles: ServiceArticleCard[];
  otherServices: FeaturedService[];
};

export type ServiceBundle = {
  service: FeaturedService;
  provider: ServiceProvider;
};

const uuidPat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getServiceById(id: string): Promise<ServiceBundle | null> {
  if (!uuidPat.test(id)) return null;

  const db = getDb();

  let service: FeaturedService | null = null;
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
        isActive: schema.userServices.isActive,
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
          eq(schema.userServices.id, id),
          isNull(schema.users.deletedAt),
        ),
      )
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    if (!r.isActive) return null;
    service = {
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
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist/i.test(msg)) {
      console.warn(
        '[getServiceById] user_services 拡張カラム未適用。0046 / 0050 を適用してください。',
      );
      return null;
    }
    console.error('[getServiceById] failed:', msg);
    return null;
  }

  if (!service) return null;

  const ownerId = service.ownerId;

  // ----- provider info (bio + residencyYears + tier) -----
  let providerBio: string | null = null;
  let providerResidencyYears: number | null = null;
  let providerTier: 'S' | 'A' | 'B' | null = null;
  try {
    const rows = await db
      .select({
        bio: schema.users.bio,
        tier: schema.writerProfiles.tier,
        residencyYears: schema.writerProfiles.residencyYears,
      })
      .from(schema.users)
      .leftJoin(
        schema.writerProfiles,
        eq(schema.writerProfiles.userId, schema.users.id),
      )
      .where(eq(schema.users.id, ownerId))
      .limit(1);
    const p = rows[0];
    if (p) {
      providerBio = p.bio ?? null;
      providerTier = (p.tier as 'S' | 'A' | 'B' | null) ?? null;
      providerResidencyYears = p.residencyYears ?? null;
    }
  } catch {
    /* noop */
  }

  // 本人確認
  let isVerified = false;
  try {
    const rows = await db
      .select({ status: schema.residencyVerifications.status })
      .from(schema.residencyVerifications)
      .where(eq(schema.residencyVerifications.userId, ownerId))
      .orderBy(desc(schema.residencyVerifications.submittedAt))
      .limit(1);
    isVerified = rows[0]?.status === 'approved';
  } catch {
    /* noop */
  }

  // ----- provider の公開記事 (最大 5 件) -----
  let articles: ServiceArticleCard[] = [];
  try {
    const rows = await db
      .select({
        id: schema.articles.id,
        title: schema.articles.title,
        coverImageUrl: schema.articles.coverImageUrl,
        publishedAt: schema.articles.publishedAt,
        createdAt: schema.articles.createdAt,
      })
      .from(schema.articles)
      .where(
        and(
          eq(schema.articles.writerId, ownerId),
          eq(schema.articles.status, 'published'),
          isNull(schema.articles.deletedAt),
        ),
      )
      .orderBy(desc(schema.articles.publishedAt))
      .limit(5);
    articles = rows.map((a) => ({
      id: a.id,
      title: a.title,
      coverImageUrl: a.coverImageUrl ?? null,
      // localScore は集計してないので null。表示側で 70 にフォールバックでも OK
      localScoreAverage: null,
      publishedAt: (a.publishedAt ?? a.createdAt).toISOString(),
    }));
  } catch {
    articles = [];
  }

  // ----- 同じ provider の他サービス -----
  let otherServices: FeaturedService[] = [];
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
      })
      .from(schema.userServices)
      .leftJoin(
        schema.cities,
        eq(schema.cities.id, schema.userServices.cityId),
      )
      .where(
        and(
          eq(schema.userServices.userId, ownerId),
          eq(schema.userServices.isActive, true),
          ne(schema.userServices.id, service.id),
        ),
      )
      .orderBy(asc(schema.userServices.position))
      .limit(3);
    otherServices = rows.map((r) => ({
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
      ownerId: ownerId,
      ownerDisplayName: service.ownerDisplayName,
      ownerAvatarUrl: service.ownerAvatarUrl,
    }));
  } catch {
    otherServices = [];
  }

  return {
    service,
    provider: {
      id: ownerId,
      displayName: service.ownerDisplayName,
      avatarUrl: service.ownerAvatarUrl,
      bio: providerBio,
      residencyYears: providerResidencyYears,
      tier: providerTier,
      isVerified,
      articles,
      otherServices,
    },
  };
}
