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
  /** 都市の国コード（ISO alpha-2 lowercase）。一覧の国フィルタ用。任意。 */
  countryCode?: string | null;
  audience: 'traveler' | 'resident' | 'both' | null;
  /** カバー画像 URL。NULL = 未設定 (カード側でプレースホルダーを描く) */
  coverImageUrl: string | null;
  /** 0055 で追加。複数指定可のタグ。空配列もあり得る (カード/詳細で考慮)。 */
  tags: string[];
  /** ===== 0058 で追加: 体験詳細ページ用フィールド群 =====
   *  一覧/カード系クエリでは取得しないため、すべて任意 (undefined あり得る)。
   *  詳細ページ (getServiceById) のみ実値を返す。未適用カラムは null/空配列。 */
  galleryImages?: string[];
  durationLabel?: string | null;
  minParticipants?: number | null;
  maxParticipants?: number | null;
  languages?: string[];
  highlights?: string[];
  inclusions?: string[];
  meetingPointName?: string | null;
  meetingPointLat?: number | null;
  meetingPointLng?: number | null;
  cancellationPolicy?: string | null;
  /**
   * 出品作成日時の ISO 文字列。/services の「新着」棚でクライアント側ソートに使う。
   * 取得元クエリによっては未設定 (undefined) のことがあるため任意フィールド。
   */
  createdAt?: string | null;
  ownerId: string;
  ownerDisplayName: string;
  ownerAvatarUrl: string | null;
};

type Options = {
  audience: 'traveler' | 'resident';
  limit?: number;
  /** 都市 slug で絞り込みたい場合（将来用） */
  citySlug?: string;
  /** 国コード (ISO alpha-2 lowercase) で絞り込み。国別ランディング用。
   *  指定すると city_id NULL のサービスは除外される（国が確定できないため）。 */
  countryCode?: string;
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
      opts.countryCode ? eq(schema.countries.code, opts.countryCode) : undefined,
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
        coverImageUrl: schema.userServices.coverImageUrl,
        tags: schema.userServices.tags,
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
      .leftJoin(
        schema.countries,
        eq(schema.countries.id, schema.cities.countryId),
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
        '[getFeaturedServices] user_services.city_id/audience/cover_image_url/tags missing — ' +
          'Supabase Studio で manual/0046_user_services_city_audience.sql / 0050_user_services_cover_image.sql / 0055_user_services_tags.sql を実行してください。',
      );
      return [];
    }
    console.error('[getFeaturedServices] failed:', msg);
    return [];
  }
}
