import 'server-only';
import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';

/**
 * /explore ホーム用の「駐在員ピックアップ」カルーセル。
 *
 * 抽出ルール:
 *   - users.deletedAt IS NULL
 *   - role = 'resident_writer' (記事を書く / サービスを売る駐在員)
 *   - avatarUrl IS NOT NULL (顔出しが揃っている)
 *   - bio IS NOT NULL (説明がある)
 *   - 最新 created_at 順 (新しい駐在員から)
 *
 * 1 件あたりに記事数 / サービス数 などのバッジを出したいので、副問い合わせは
 * 後段で必要に応じて重ねる。ここでは軽量に基本情報だけ返す。
 */

export type FeaturedResident = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  residencyCity: string | null;
  residencyCountry: string | null;
  arrivalYear: number | null;
  occupation: string | null;
  /** writer_profiles.tier (S/A/B) または null */
  tier: 'S' | 'A' | 'B' | null;
  /** 在住確認 (residency_verifications.status='approved' があるか) */
  isVerified: boolean;
};

export async function listFeaturedResidents(
  limit = 10,
): Promise<FeaturedResident[]> {
  const db = getDb();
  try {
    const rows = await db
      .select({
        id: schema.users.id,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
        bio: schema.users.bio,
        residencyCity: schema.users.residencyCity,
        residencyCountry: schema.users.residencyCountry,
        arrivalYear: schema.users.arrivalYear,
        occupation: schema.users.occupation,
        tier: schema.writerProfiles.tier,
      })
      .from(schema.users)
      .leftJoin(
        schema.writerProfiles,
        eq(schema.writerProfiles.userId, schema.users.id),
      )
      .where(
        and(
          isNull(schema.users.deletedAt),
          eq(schema.users.role, 'resident_writer'),
          isNotNull(schema.users.avatarUrl),
          isNotNull(schema.users.bio),
        ),
      )
      .orderBy(desc(schema.users.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl,
      bio: r.bio,
      residencyCity: r.residencyCity,
      residencyCountry: r.residencyCountry,
      arrivalYear: r.arrivalYear,
      occupation: r.occupation,
      tier: (r.tier as 'S' | 'A' | 'B' | null) ?? null,
      // 個別の本人確認まで取りに行くと N+1 になるので、ここでは false 固定。
      // 必要なら separate fetch で集約する。
      isVerified: false,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // 0038 など resident profile 列が未適用な開発 DB ではフォールバック。
    if (/does not exist/i.test(msg)) {
      console.warn('[listFeaturedResidents] resident columns missing — returning []');
      return [];
    }
    console.error('[listFeaturedResidents] failed:', msg);
    return [];
  }
}
