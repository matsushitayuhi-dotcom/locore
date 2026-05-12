import 'server-only';
import { eq, asc } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';

export type CountryListItem = {
  code: string;
  nameJa: string;
  nameEn: string;
  continent: string;
  status: 'active' | 'coming_soon' | 'hidden' | string;
  emoji: string | null;
  heroImageUrl: string | null;
  shortDescription: string | null;
  /** その国の最初の region（active なら地域ホームへのリンクとして使う） */
  primaryRegionSlug: string | null;
};

export type RegionInfo = {
  id: string;
  slug: string;
  nameJa: string;
  nameEn: string | null;
  kind: 'metro' | 'area' | 'other' | 'city' | string;
  isActive: boolean;
  emoji: string | null;
  countryCode: string;
  countryNameJa: string;
};

/**
 * 世界ピッカー用に countries + 各国の代表 region を一括取得。
 *
 * - 並び順: continent → position
 * - status='hidden' は除外
 * - primaryRegionSlug: kind='metro' or kind='area' の中で position 最小のもの。
 *   無ければ '<code>-other'。
 */
export async function listCountriesForPicker(): Promise<CountryListItem[]> {
  try {
    const db = getDb();
    const countryRows = await db
      .select({
        id: schema.countries.id,
        code: schema.countries.code,
        nameJa: schema.countries.nameJa,
        nameEn: schema.countries.nameEn,
        continent: schema.countries.continent,
        status: schema.countries.status,
        emoji: schema.countries.emoji,
        heroImageUrl: schema.countries.heroImageUrl,
        shortDescription: schema.countries.shortDescription,
        position: schema.countries.position,
      })
      .from(schema.countries)
      .orderBy(asc(schema.countries.continent), asc(schema.countries.position));

    if (countryRows.length === 0) return [];

    const regionRows = await db
      .select({
        slug: schema.cities.slug,
        countryId: schema.cities.countryId,
        kind: schema.cities.kind,
        position: schema.cities.position,
      })
      .from(schema.cities)
      .orderBy(asc(schema.cities.position));

    const primaryByCountry = new Map<string, string>();
    for (const r of regionRows) {
      if (!r.countryId) continue;
      // 既に metro/area の代表が登録済みなら上書きしない
      if (primaryByCountry.has(r.countryId)) continue;
      if (r.kind === 'metro' || r.kind === 'area') {
        primaryByCountry.set(r.countryId, r.slug);
      }
    }
    // フォールバック: その他カテゴリ
    for (const r of regionRows) {
      if (!r.countryId) continue;
      if (primaryByCountry.has(r.countryId)) continue;
      primaryByCountry.set(r.countryId, r.slug);
    }

    return countryRows
      .filter((c) => c.status !== 'hidden')
      .map((c) => ({
        code: c.code,
        nameJa: c.nameJa,
        nameEn: c.nameEn,
        continent: c.continent,
        status: c.status,
        emoji: c.emoji,
        heroImageUrl: c.heroImageUrl,
        shortDescription: c.shortDescription,
        primaryRegionSlug: primaryByCountry.get(c.id) ?? null,
      }));
  } catch (err) {
    console.warn('[listCountriesForPicker] failed:', err);
    return [];
  }
}

/** region slug から region 情報 + 国情報を取得（/region/[slug] 用）。 */
export async function getRegionBySlug(slug: string): Promise<RegionInfo | null> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.cities.id,
        slug: schema.cities.slug,
        nameJa: schema.cities.nameJa,
        nameEn: schema.cities.nameEn,
        kind: schema.cities.kind,
        isActive: schema.cities.isActive,
        emoji: schema.cities.emoji,
        countryCode: schema.countries.code,
        countryNameJa: schema.countries.nameJa,
      })
      .from(schema.cities)
      .leftJoin(
        schema.countries,
        eq(schema.countries.id, schema.cities.countryId),
      )
      .where(eq(schema.cities.slug, slug))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      slug: r.slug,
      nameJa: r.nameJa,
      nameEn: r.nameEn,
      kind: r.kind,
      isActive: r.isActive,
      emoji: r.emoji,
      countryCode: r.countryCode ?? '',
      countryNameJa: r.countryNameJa ?? '',
    };
  } catch (err) {
    console.warn('[getRegionBySlug] failed:', err);
    return null;
  }
}
