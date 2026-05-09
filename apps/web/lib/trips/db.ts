import 'server-only';
import { eq, asc, inArray, sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import type { Trip, TripDay, TripItem, Spot } from '@/lib/mock';

/**
 * 公開（is_sample=true）の trips を全件取得し、mock の Trip 互換形式に整形して返す。
 * 個人の trips は RLS で owner にしか見えない。
 */
export async function listSampleTrips(): Promise<Trip[]> {
  try {
    const db = getDb();
    const tripRows = await db
      .select({
        id: schema.trips.id,
        name: schema.trips.name,
        cityId: schema.trips.cityId,
        startDate: schema.trips.startDate,
        endDate: schema.trips.endDate,
        partySize: schema.trips.partySize,
      })
      .from(schema.trips)
      .where(eq(schema.trips.isSample, true))
      .orderBy(asc(schema.trips.startDate));

    if (tripRows.length === 0) return [];

    const tripIds = tripRows.map((t) => t.id);
    const dayRows = await db
      .select({
        id: schema.tripDays.id,
        tripId: schema.tripDays.tripId,
        dayNumber: schema.tripDays.dayNumber,
        date: schema.tripDays.date,
      })
      .from(schema.tripDays)
      .where(inArray(schema.tripDays.tripId, tripIds))
      .orderBy(asc(schema.tripDays.tripId), asc(schema.tripDays.dayNumber));

    const dayIds = dayRows.map((d) => d.id);
    const itemRows =
      dayIds.length > 0
        ? await db
            .select({
              id: schema.tripItems.id,
              tripDayId: schema.tripItems.tripDayId,
              spotId: schema.tripItems.spotId,
              customName: schema.tripItems.customName,
              scheduledTime: schema.tripItems.scheduledTime,
              position: schema.tripItems.position,
              notes: schema.tripItems.notes,
              budgetJpy: schema.tripItems.budgetJpy,
            })
            .from(schema.tripItems)
            .where(inArray(schema.tripItems.tripDayId, dayIds))
            .orderBy(
              asc(schema.tripItems.tripDayId),
              asc(schema.tripItems.position),
            )
        : [];

    // 行の組み立て
    const itemsByDay = new Map<string, typeof itemRows>();
    for (const it of itemRows) {
      const list = itemsByDay.get(it.tripDayId) ?? [];
      list.push(it);
      itemsByDay.set(it.tripDayId, list);
    }
    const daysByTrip = new Map<string, TripDay[]>();
    for (const d of dayRows) {
      const items: TripItem[] = (itemsByDay.get(d.id) ?? []).map((it, idx) => ({
        id: it.id,
        startTime: it.scheduledTime ?? '09:00',
        endTime: '',
        spotId: it.spotId ?? undefined,
        freeSpotName: it.customName ?? undefined,
        notes: it.notes ?? undefined,
        budgetJpy: it.budgetJpy ?? undefined,
        travelMinutesAfter: undefined,
      }));
      const list = daysByTrip.get(d.tripId) ?? [];
      list.push({
        id: d.id,
        date: typeof d.date === 'string' ? d.date : (d.date as Date).toISOString().slice(0, 10),
        label: `Day ${d.dayNumber}`,
        items,
      });
      daysByTrip.set(d.tripId, list);
    }

    return tripRows.map(
      (t): Trip => ({
        id: t.id,
        name: t.name,
        startDate:
          typeof t.startDate === 'string'
            ? t.startDate
            : (t.startDate as Date).toISOString().slice(0, 10),
        endDate:
          typeof t.endDate === 'string'
            ? t.endDate
            : (t.endDate as Date).toISOString().slice(0, 10),
        travelers: t.partySize,
        cityId: 'paris',
        days: daysByTrip.get(t.id) ?? [],
      }),
    );
  } catch {
    return [];
  }
}

/** id 指定で 1 つの sample trip を取得 */
export async function getSampleTrip(id: string): Promise<Trip | null> {
  const all = await listSampleTrips();
  return all.find((t) => t.id === id) ?? null;
}

/**
 * 旅程内の spotId 群から spots テーブルを引いて、id → Spot マップで返す。
 * /trips/[id] の表示で trip_items.spot_id → スポット名/座標を解決する用途。
 */
export async function getSpotsByIds(ids: string[]): Promise<Map<string, Spot>> {
  const out = new Map<string, Spot>();
  if (ids.length === 0) return out;
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
      })
      .from(schema.spots)
      .where(inArray(schema.spots.id, ids));

    // PostGIS lat/lng
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbAny = db as unknown as { execute: (q: any) => Promise<any> };
    const result = await dbAny.execute(
      sql`select id::text as id, ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng from spots where id IN (${sql.join(
        ids.map((i) => sql`${i}::uuid`),
        sql`, `,
      )})`,
    );
    const coords = (Array.isArray(result) ? result : result.rows) as Array<{
      id: string;
      lat: number;
      lng: number;
    }>;
    const cm = new Map(
      coords.map((c) => [c.id, { lat: Number(c.lat), lng: Number(c.lng) }]),
    );

    for (const r of rows) {
      const c = cm.get(r.id) ?? { lat: 0, lng: 0 };
      const oh = r.openingHours;
      const openingHoursText =
        oh == null
          ? ''
          : typeof oh === 'object' && 'note' in oh && Object.keys(oh).length === 1
            ? (oh as { note?: string }).note ?? ''
            : JSON.stringify(oh);
      out.set(r.id, {
        id: r.id,
        articleId: r.articleId,
        name: r.name,
        address: r.address ?? '',
        lat: c.lat,
        lng: c.lng,
        category: r.category ?? 'other',
        priceEstimate: r.priceEstimate ?? '',
        openingHours: openingHoursText,
        tags: r.tags ?? [],
      });
    }
  } catch {
    // fallthrough
  }
  return out;
}
