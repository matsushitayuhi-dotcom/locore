import 'server-only';
import { and, asc, desc, eq, isNull, or } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';

/**
 * /explore と /expat のカルーセル用に user_services を引くヘルパー。
 *
 * 設計上の判断:
 *   - audience が NULL の旧データは「指定なし」とみなして両ホームに出す
 *     （= 機能追加で既存の出品が見えなくなるのを防ぐ）
 *   - city_id が NULL のサービスも一覧には出す（都市カラムは "—" 表示）
 *   - is_active=true のみ
 *   - 0046_user_services_city_audience.sql が未適用な環境では
 *     cityId / audience の SELECT に失敗するため、try/catch で空配列にフォールバック
 */

export type FeaturedService = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priceJpy: number | null;
  priceUnit: string | null;
  contactMethod: 'chat' | 'external_url';
  externalUrl: string | null;
  cityNameJa: string | null;
  citySlug: string | null;
  audience: 'traveler' | 'resident' | 'both' | null;
  ownerId: string;
  ownerDisplayName: string;
  ownerAvatarUrl: string | null;
};

type Options = {
  audience: 'traveler' | 'resident';
  limit?: number;
  /** 都市 slug で絞り込みたい場合（将来用） */
  citySlug?: string;
};

export async function getFeaturedServices(
  opts: Options,
): Promise<FeaturedService[]> {
  const limit = opts.limit ?? 12;
  const db = getDb();

  // audience フィルタ:
  //   traveler ホーム → audience = 'traveler' or 'both' or NULL
  //   resident ホーム → audience = 'resident' or 'both' or NULL
  const matchAudience =
    opts.audience === 'traveler'
      ? or(
          eq(schema.userServices.audience, 'traveler'),
          eq(schema.userServices.audience, 'both'),
          isNull(schema.userServices.audience),
        )
      : or(
          eq(schema.userServices.audience, 'resident'),
          eq(schema.userServices.audience, 'both'),
          isNull(schema.userServices.audience),
        );

  try {
    const baseWhere = and(
      eq(schema.userServices.isActive, true),
      isNull(schema.users.deletedAt),
      matchAudience,
      opts.citySlug ? eq(schema.cities.slug, opts.citySlug) : undefined,
    );

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
        position: schema.userServices.position,
        createdAt: schema.userServices.createdAt,
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
      .where(baseWhere)
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
      ownerId: r.ownerId,
      ownerDisplayName: r.ownerDisplayName,
      ownerAvatarUrl: r.ownerAvatarUrl,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist/i.test(msg)) {
      console.warn(
        '[getFeaturedServices] user_services.city_id/audience missing — ' +
          'Supabase Studio で manual/0046_user_services_city_audience.sql を実行してください。',
      );
      return [];
    }
    console.error('[getFeaturedServices] failed:', msg);
    return [];
  }
}
