import 'server-only';
import { eq, inArray, sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import type { Spot } from '@/lib/mock';

/**
 * 指定された記事 ID 群に紐づく spots を DB から取得し、mock 互換の Spot 型に
 * 整形して返す。PostGIS の location は ST_X / ST_Y で lat/lng に展開する。
 */
export async function getSpotsForArticles(
  articleIds: string[],
): Promise<Spot[]> {
  if (articleIds.length === 0) return [];
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.spots.id,
        articleId: schema.spots.articleId,
        name: schema.spots.name,
        address: schema.spots.address,
        category: schema.spots.category,
        priceEstimate: schema.spots.priceEstimate,
        openingHours: schema.spots.openingHours,
        tags: schema.spots.tags,
        position: schema.spots.position,
        googlePlaceId: schema.spots.googlePlaceId,
      })
      .from(schema.spots)
      .where(inArray(schema.spots.articleId, articleIds));
    if (rows.length === 0) return [];

    // PostGIS の lat/lng は別 SELECT
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbAny = db as unknown as { execute: (q: any) => Promise<any> };
    const result = await dbAny.execute(
      sql`select id::text as id, ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng from spots where id IN (${sql.join(
        rows.map((r) => sql`${r.id}::uuid`),
        sql`, `,
      )})`,
    );
    const coordRows = (Array.isArray(result) ? result : result.rows) as Array<{
      id: string;
      lat: number;
      lng: number;
    }>;
    const coordsMap = new Map<string, { lat: number; lng: number }>();
    for (const r of coordRows) {
      coordsMap.set(r.id, { lat: Number(r.lat), lng: Number(r.lng) });
    }

    return rows.map((s): Spot => {
      const coords = coordsMap.get(s.id) ?? { lat: 0, lng: 0 };
      const oh = s.openingHours;
      const openingHoursText =
        oh == null
          ? ''
          : typeof oh === 'object' && 'note' in oh && Object.keys(oh).length === 1
            ? (oh as { note?: string }).note ?? ''
            : JSON.stringify(oh);
      return {
        id: s.id,
        articleId: s.articleId,
        name: s.name,
        address: s.address ?? '',
        lat: coords.lat,
        lng: coords.lng,
        category: s.category ?? 'other',
        priceEstimate: s.priceEstimate ?? '',
        openingHours: openingHoursText,
        tags: s.tags ?? [],
      };
    });
  } catch {
    return [];
  }
}

export async function getSpotsForArticle(articleId: string): Promise<Spot[]> {
  return getSpotsForArticles([articleId]);
}
