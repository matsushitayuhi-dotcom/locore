import { notFound } from 'next/navigation';
import { eq, asc } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { type SpotRow } from '@/components/writer/SpotList';
import { type VideoRow } from '@/components/writer/VideoEmbedEditor';
import { EditorShell } from './components/EditorShell';

export const metadata = {
  title: '記事を編集',
};

export const dynamic = 'force-dynamic';

export default async function EditArticlePage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const db = getDb();

  const articleRows = await db
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.id, params.id))
    .limit(1);

  if (articleRows.length === 0) return notFound();
  const article = articleRows[0]!;
  if (article.writerId !== user.id && user.role !== 'editor') {
    return notFound();
  }

  const [spotRowsRaw, videoRowsRaw, cityRows, writerProfileRows] = await Promise.all([
    db
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
      .where(eq(schema.spots.articleId, params.id))
      .orderBy(asc(schema.spots.position)),
    db
      .select()
      .from(schema.articleVideos)
      .where(eq(schema.articleVideos.articleId, params.id))
      .orderBy(asc(schema.articleVideos.position)),
    db
      .select({ id: schema.cities.id, nameJa: schema.cities.nameJa })
      .from(schema.cities)
      .where(eq(schema.cities.isActive, true)),
    db
      .select({ tier: schema.writerProfiles.tier })
      .from(schema.writerProfiles)
      .where(eq(schema.writerProfiles.userId, user.id))
      .limit(1),
  ]);

  const spotIds = spotRowsRaw.map((s) => s.id);
  const coordsMap = new Map<string, { lat: number; lng: number }>();
  if (spotIds.length > 0) {
    const dbAny = db as unknown as {
      execute: (q: ReturnType<typeof import('drizzle-orm').sql>) => Promise<unknown>;
    };
    const { sql } = await import('drizzle-orm');
    // postgres-js は drizzle の `${array}` を text[] にエンコードしてしまうため、
    // ANY(array) ではなく IN (val::uuid, ...) で個別バインドする。
    const result = (await dbAny.execute(
      sql`select id::text as id, ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng from spots where id IN (${sql.join(
        spotIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )})`,
    )) as unknown as
      | Array<{ id: string; lat: number; lng: number }>
      | { rows: Array<{ id: string; lat: number; lng: number }> };
    const rows = Array.isArray(result) ? result : result.rows;
    for (const r of rows) {
      coordsMap.set(r.id, { lat: Number(r.lat), lng: Number(r.lng) });
    }
  }

  const spots: SpotRow[] = spotRowsRaw.map((s) => {
    const coords = coordsMap.get(s.id) ?? { lat: 0, lng: 0 };
    const oh = s.openingHours;
    const openingHoursText =
      oh == null
        ? ''
        : typeof oh === 'object' && 'note' in oh && Object.keys(oh).length === 1
          ? (oh as { note?: string }).note ?? ''
          : JSON.stringify(oh, null, 2);
    return {
      id: s.id,
      articleId: s.articleId,
      name: s.name,
      address: s.address,
      lat: coords.lat,
      lng: coords.lng,
      category: s.category,
      priceEstimate: s.priceEstimate,
      openingHoursText,
      tags: s.tags ?? [],
      position: s.position,
      googlePlaceId: s.googlePlaceId,
    };
  });

  const videos: VideoRow[] = videoRowsRaw.map((v) => ({
    id: v.id,
    platform: v.platform,
    embedUrl: v.embedUrl,
    position: v.position,
  }));

  const tier = (writerProfileRows[0]?.tier ?? 'B') as 'S' | 'A' | 'B';

  // クライアントの Places Autocomplete 用に環境変数を渡す
  // NEXT_PUBLIC_ プレフィックスでブラウザにも露出される
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <EditorShell
      article={{
        id: article.id,
        title: article.title,
        body: article.body,
        priceJpy: article.priceJpy,
        durationType: article.durationType,
        articleType: article.articleType,
        tags: article.tags ?? [],
        cityId: article.cityId,
        coverImageUrl: article.coverImageUrl,
        status: article.status,
        warned: article.warned,
        moderationScore: article.moderationScore,
        updatedAt: article.updatedAt,
      }}
      spots={spots}
      videos={videos}
      cities={cityRows}
      tier={tier}
      googleMapsApiKey={googleMapsApiKey}
    />
  );
}
