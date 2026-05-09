/**
 * フルモックデータを Supabase に投入するシード（is_sample=true）。
 *
 * 使い方:
 *   DATABASE_URL=postgres://... pnpm --filter @locore/db db:seed-mock
 *
 * 投入内容（apps/web/lib/mock 配下の全データ）：
 *   - cities: paris (active), london/nyc (inactive)
 *   - users: 8 writers + 5 light_diary authors（mock の writers / lightDiaries 由来）
 *   - writer_profiles: 8 writers
 *   - articles: 25
 *   - spots: 95（PostGIS lat/lng 入り）
 *   - light_diaries: 5
 *   - editor_collections: 3
 *   - collection_articles: コレクション ↔ 記事の紐付け
 *
 * クリーンアップ:
 *   `migrations/manual/0011_cleanup_samples.sql` を実行 or
 *   `DELETE FROM users WHERE is_sample = true;` 等を直接叩く。
 *   FK は cascade されるので writer_profiles / articles / spots / collection_articles
 *   は users / articles の削除で連鎖削除される。
 *
 * 冪等性:
 *   mock の文字列 ID（'wr_junko' / 'art_001' 等）から決定論的に UUIDv5 風の値を生成。
 *   再実行時は ON CONFLICT DO UPDATE で内容を最新の mock に同期する。
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { sql } from 'drizzle-orm';
import { createDbClient } from '../src/client';
import {
  cities,
  users,
  writerProfiles,
  articles,
  spots,
  lightDiaries,
  editorCollections,
  collectionArticles,
  purchases,
  reviews,
  trips,
  tripDays,
  tripItems,
  crisisEvents,
  type NewUser,
  type NewWriterProfile,
  type NewArticle,
  type NewSpot,
  type NewLightDiary,
  type NewEditorCollection,
  type NewCollectionArticle,
  type NewPurchase,
  type NewReview,
  type NewTrip,
  type NewTripDay,
  type NewTripItem,
  type NewCrisisEvent,
} from '../src/schema';

// mock データは apps/web 側（CommonJS パッケージ）に存在する。
//
// Node 24 + tsx 環境では `import` 文で apps/web 側の TS を読むと
// ESM/CJS 境界で named export が見えなくなることがあるため、
// `createRequire` で CJS 解決に切り替えて読み込む。
//
// 型は `import type` で取れば実行時には消えるので副作用なし。
import type {
  Writer as MockWriter,
  Article as MockArticle,
  Spot as MockSpot,
  DurationType as MockDurationType,
} from '../../../apps/web/lib/mock/types';

const require = createRequire(import.meta.url);
const mockWritersMod = require('../../../apps/web/lib/mock/writers') as {
  writers: MockWriter[];
};
const mockArticlesMod = require('../../../apps/web/lib/mock/articles') as {
  articles: MockArticle[];
};
const mockSpotsMod = require('../../../apps/web/lib/mock/spots') as {
  spots: MockSpot[];
};
const mockLightDiariesMod = require('../../../apps/web/lib/mock/lightDiaries') as {
  lightDiaries: Array<{
    id: string;
    authorName: string;
    avatarUrl: string;
    title: string;
    body: string;
    cityId: string;
    visitedAt: string;
    likes: number;
  }>;
};
const mockCollectionsMod = require('../../../apps/web/lib/mock/collections') as {
  collections: Array<{
    id: string;
    title: string;
    subtitle: string;
    intro: string;
    coverImageUrl: string;
    curatorName: string;
    curatorRole: string;
    articleIds: string[];
    publishedAt: string;
  }>;
};
const mockReviewsMod = require('../../../apps/web/lib/mock/reviews') as {
  reviews: Array<{
    id: string;
    articleId: string;
    authorName: string;
    localScore: number;
    satisfaction: number;
    tags: string[];
    body: string;
    visitedAt: string;
  }>;
};
const mockTripsMod = require('../../../apps/web/lib/mock/trips') as {
  trips: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    travelers: number;
    cityId: string;
    days: Array<{
      id: string;
      date: string;
      label: string;
      items: Array<{
        id: string;
        startTime: string;
        endTime: string;
        spotId?: string;
        freeSpotName?: string;
        notes?: string;
        budgetJpy?: number;
        travelMinutesAfter?: number;
      }>;
    }>;
  }>;
};
const mockCrisisMod = require('../../../apps/web/lib/mock/crisisEvents') as {
  crisisEvents: Array<{
    id: string;
    cityId: string;
    severity: 1 | 2 | 3 | 4 | 5;
    title: string;
    summary: string;
    affectedRoutes?: string[];
    startsAt: string;
    endsAt: string;
  }>;
};

const mockWriters = mockWritersMod.writers;
const mockArticles = mockArticlesMod.articles;
const mockSpots = mockSpotsMod.spots;
const mockLightDiaries = mockLightDiariesMod.lightDiaries;
const mockCollections = mockCollectionsMod.collections;
const mockReviews = mockReviewsMod.reviews;
const mockTrips = mockTripsMod.trips;
const mockCrisisEvents = mockCrisisMod.crisisEvents;

import { seedCities } from './data/cities';

// =============================================================================
// 決定論的 UUID
// =============================================================================

/**
 * 文字列から UUIDv5 風の安定した UUID を生成。
 * （標準の UUIDv5 とは厳密に同一ではないが、SHA-1 ベースの 16byte → UUID 形式で安定）
 *
 * ネームスペース：'locore-mock' をプレフィックスして衝突を避ける。
 * 結果：同じ string を渡せば常に同じ UUID を返す。
 */
function stableUuid(seed: string): string {
  const hash = createHash('sha1').update(`locore-mock:${seed}`).digest('hex');
  // version (5) と variant ビットを合わせて 8-4-4-4-12 に整形
  const v = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)
  }${hash.slice(18, 20)}-${hash.slice(20, 32)}`;
  return v;
}

// =============================================================================
// マッピング
// =============================================================================

/** mock の duration → DB enum */
function mapDuration(d: MockDurationType): 'half_day' | 'full_day' | 'few_hours' | 'other' {
  if (d === '半日') return 'half_day';
  if (d === '1日') return 'full_day';
  if (d === '数時間' || d === '1h') return 'few_hours';
  return 'other';
}

/** mock の category 文字列 → DB enum (spot_category) */
function mapSpotCategory(
  c: string,
): 'food' | 'sight' | 'shopping' | 'lodging' | 'other' {
  // ざっくり分類。本番では Place API のタイプを使う想定。
  const food = [
    'カフェ', 'ビストロ', 'バー', 'ワインバー', 'ナチュールバー', 'パティスリー',
    'ブーランジェリー', 'シャンソニエ', 'ベトナム', 'ベトナム料理', 'カクテル',
    'カクテルバー', 'ネオビストロ', '北アフリカ', 'アフリカ料理', 'ストリートフード',
    'ベトナム屋台', '北アフリカ屋台', 'シュークリーム', 'カフェ・サロン', 'カフェ・焙煎所',
    'ブランチ', 'オーガニック', 'ハーブ', '乾物',
  ];
  const sight = [
    '美術館', '文学館', '公園', '市場', '書店', '本屋', '古書店', 'アート書店', 'レコード',
  ];
  const shopping = [
    'ライフスタイル', '雑貨', '古道具', 'アンティーク', '書店・ワイン',
  ];
  if (food.some((k) => c.includes(k))) return 'food';
  if (sight.some((k) => c.includes(k))) return 'sight';
  if (shopping.some((k) => c.includes(k))) return 'shopping';
  return 'other';
}

// =============================================================================
// メイン
// =============================================================================

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for seed-mock');
  }
  const db = createDbClient(databaseUrl);

  // ---- cities -------------------------------------------------------------
  console.log('[seed-mock] cities ...');
  const insertedCities = await db
    .insert(cities)
    .values(seedCities)
    .onConflictDoUpdate({
      target: cities.slug,
      set: {
        nameJa: sql`excluded.name_ja`,
        country: sql`excluded.country`,
        lat: sql`excluded.lat`,
        lng: sql`excluded.lng`,
        timezone: sql`excluded.timezone`,
        isActive: sql`excluded.is_active`,
      },
    })
    .returning();
  const paris = insertedCities.find((c) => c.slug === 'paris');
  if (!paris) throw new Error('Paris city not seeded');

  // mock の cityId（'paris'）→ DB の city UUID
  const cityIdByMock: Record<string, string> = { paris: paris.id };

  // ---- users (writers + light_diary authors) -----------------------------
  console.log('[seed-mock] users (writers + diary authors) ...');

  const writerUserUuids: Record<string, string> = {};
  for (const w of mockWriters) {
    writerUserUuids[w.id] = stableUuid(`writer:${w.id}`);
  }

  const diaryAuthorUuids: Record<string, string> = {};
  for (const d of mockLightDiaries) {
    // authorName ベースで一意にする（複数記事で同じ著者なら同じ user）
    const key = `diary-author:${d.authorName}`;
    diaryAuthorUuids[d.authorName] = stableUuid(key);
  }

  const userRows: NewUser[] = [
    ...mockWriters.map(
      (w: MockWriter): NewUser => ({
        id: writerUserUuids[w.id]!,
        email: `${w.id.replace('wr_', '')}@sample.locore.test`,
        displayName: w.name,
        avatarUrl: w.avatarUrl,
        bio: w.bio,
        role: 'resident_writer',
        isSample: true,
      }),
    ),
    ...mockLightDiaries.map(
      (d): NewUser => ({
        id: diaryAuthorUuids[d.authorName]!,
        email: `${d.authorName.toLowerCase()}@sample.locore.test`,
        displayName: d.authorName,
        avatarUrl: d.avatarUrl,
        bio: null as unknown as string,
        role: 'reader',
        isSample: true,
      }),
    ),
  ];

  // 同じ authorName が複数 diary にあると重複するので id でユニーク化
  const uniqueUsers = Array.from(
    new Map(userRows.map((u) => [u.id, u])).values(),
  );

  await db
    .insert(users)
    .values(uniqueUsers)
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: sql`excluded.email`,
        displayName: sql`excluded.display_name`,
        avatarUrl: sql`excluded.avatar_url`,
        bio: sql`excluded.bio`,
        role: sql`excluded.role`,
        isSample: sql`excluded.is_sample`,
      },
    });

  // ---- writer_profiles ----------------------------------------------------
  console.log('[seed-mock] writer_profiles ...');
  const wpRows: NewWriterProfile[] = mockWriters.map((w) => ({
    userId: writerUserUuids[w.id]!,
    tier: w.tier,
    residencyCountry: 'FR',
    residencyYears: w.residencyYears,
    residencyVerifiedAt: w.isVerifiedCreator ? new Date('2025-08-01T00:00:00Z') : null,
    foundingMember: w.isFounding,
    foundingJoinedAt: w.isFounding ? new Date('2025-09-01T00:00:00Z') : null,
    foundingFeeWaiverUntil: w.isFounding ? new Date('2027-09-01T00:00:00Z') : null,
    foundingStatus: w.isFounding ? 'active' : null,
    bio: w.bio,
    isSample: true,
  }));

  await db
    .insert(writerProfiles)
    .values(wpRows)
    .onConflictDoUpdate({
      target: writerProfiles.userId,
      set: {
        tier: sql`excluded.tier`,
        residencyCountry: sql`excluded.residency_country`,
        residencyYears: sql`excluded.residency_years`,
        residencyVerifiedAt: sql`excluded.residency_verified_at`,
        foundingMember: sql`excluded.founding_member`,
        foundingJoinedAt: sql`excluded.founding_joined_at`,
        foundingFeeWaiverUntil: sql`excluded.founding_fee_waiver_until`,
        foundingStatus: sql`excluded.founding_status`,
        bio: sql`excluded.bio`,
        isSample: sql`excluded.is_sample`,
      },
    });

  // ---- articles -----------------------------------------------------------
  console.log(`[seed-mock] articles (${mockArticles.length}) ...`);

  const articleUuids: Record<string, string> = {};
  for (const a of mockArticles) {
    articleUuids[a.id] = stableUuid(`article:${a.id}`);
  }

  const articleRows: NewArticle[] = mockArticles.map((a: MockArticle): NewArticle => ({
    id: articleUuids[a.id]!,
    writerId: writerUserUuids[a.writerId]!,
    cityId: cityIdByMock[a.cityId] ?? paris.id,
    title: a.title,
    body: a.body,
    coverImageUrl: a.coverImageUrl,
    priceJpy: a.priceJpy,
    status: 'published',
    tags: a.tags,
    durationType: mapDuration(a.durationType),
    articleType: a.articleType,
    publishedAt: new Date(a.publishedAt),
    createdAt: new Date(a.createdAt),
    isSample: true,
  }));

  await db
    .insert(articles)
    .values(articleRows)
    .onConflictDoUpdate({
      target: articles.id,
      set: {
        title: sql`excluded.title`,
        body: sql`excluded.body`,
        coverImageUrl: sql`excluded.cover_image_url`,
        priceJpy: sql`excluded.price_jpy`,
        status: sql`excluded.status`,
        tags: sql`excluded.tags`,
        durationType: sql`excluded.duration_type`,
        articleType: sql`excluded.article_type`,
        publishedAt: sql`excluded.published_at`,
        isSample: sql`excluded.is_sample`,
      },
    });

  // ---- spots --------------------------------------------------------------
  console.log(`[seed-mock] spots (${mockSpots.length}) ...`);

  // PostGIS の location は customType (lng/lat) でハンドリングできる。
  const spotRows: NewSpot[] = mockSpots
    .filter((s: MockSpot) => articleUuids[s.articleId])
    .map((s: MockSpot, idx): NewSpot => ({
      id: stableUuid(`spot:${s.id}`),
      articleId: articleUuids[s.articleId]!,
      name: s.name,
      address: s.address,
      location: { lat: s.lat, lng: s.lng },
      category: mapSpotCategory(s.category),
      priceEstimate: s.priceEstimate,
      // mock の openingHours は文字列だが、DB は JSONB（OpeningHours 型）。
      // 既存スキーマ互換のため note フィールドに突っ込む。
      openingHours: s.openingHours ? { note: s.openingHours } : null,
      tags: s.tags,
      position: idx,
      isSample: true,
    }));

  await db
    .insert(spots)
    .values(spotRows)
    .onConflictDoUpdate({
      target: spots.id,
      set: {
        name: sql`excluded.name`,
        address: sql`excluded.address`,
        location: sql`excluded.location`,
        category: sql`excluded.category`,
        priceEstimate: sql`excluded.price_estimate`,
        openingHours: sql`excluded.opening_hours`,
        tags: sql`excluded.tags`,
        position: sql`excluded.position`,
        isSample: sql`excluded.is_sample`,
      },
    });

  // ---- light_diaries ------------------------------------------------------
  console.log(`[seed-mock] light_diaries (${mockLightDiaries.length}) ...`);
  const ldRows: NewLightDiary[] = mockLightDiaries.map((d): NewLightDiary => ({
    id: stableUuid(`light_diary:${d.id}`),
    authorId: diaryAuthorUuids[d.authorName]!,
    title: d.title,
    body: d.body,
    photos: [],
    cityId: cityIdByMock[d.cityId] ?? paris.id,
    visitedAt: new Date(d.visitedAt),
    status: 'published',
    isSample: true,
  }));

  await db
    .insert(lightDiaries)
    .values(ldRows)
    .onConflictDoUpdate({
      target: lightDiaries.id,
      set: {
        title: sql`excluded.title`,
        body: sql`excluded.body`,
        cityId: sql`excluded.city_id`,
        visitedAt: sql`excluded.visited_at`,
        status: sql`excluded.status`,
        isSample: sql`excluded.is_sample`,
      },
    });

  // ---- editor_collections + collection_articles --------------------------
  console.log(`[seed-mock] editor_collections (${mockCollections.length}) ...`);

  // editor 用の sample user を1人作る（コレクション編集者として）
  const editorUserId = stableUuid('editor:locore-team');
  await db
    .insert(users)
    .values([
      {
        id: editorUserId,
        email: 'editor@sample.locore.test',
        displayName: 'Locore 編集部（サンプル）',
        role: 'editor',
        bio: 'サンプル用の編集アカウント。',
        isSample: true,
      },
    ])
    .onConflictDoUpdate({
      target: users.id,
      set: { isSample: sql`excluded.is_sample` },
    });

  const collectionUuids: Record<string, string> = {};
  for (const c of mockCollections) {
    collectionUuids[c.id] = stableUuid(`collection:${c.id}`);
  }

  const colRows: NewEditorCollection[] = mockCollections.map(
    (c): NewEditorCollection => ({
      id: collectionUuids[c.id]!,
      title: c.title,
      body: c.intro,
      coverImageUrl: c.coverImageUrl,
      editorId: editorUserId,
      cityId: paris.id,
      publishedAt: new Date(c.publishedAt),
      isSample: true,
    }),
  );

  await db
    .insert(editorCollections)
    .values(colRows)
    .onConflictDoUpdate({
      target: editorCollections.id,
      set: {
        title: sql`excluded.title`,
        body: sql`excluded.body`,
        coverImageUrl: sql`excluded.cover_image_url`,
        publishedAt: sql`excluded.published_at`,
        isSample: sql`excluded.is_sample`,
      },
    });

  console.log('[seed-mock] collection_articles ...');
  const caRows: NewCollectionArticle[] = mockCollections.flatMap((c) =>
    c.articleIds
      .filter((aid) => articleUuids[aid]) // mock に実在する記事だけ
      .map(
        (aid, idx): NewCollectionArticle => ({
          collectionId: collectionUuids[c.id]!,
          articleId: articleUuids[aid]!,
          position: idx,
          revenueSharePct: 30,
        }),
      ),
  );
  if (caRows.length > 0) {
    await db.insert(collectionArticles).values(caRows).onConflictDoNothing();
  }

  // ---- sample readers + purchases + reviews ---------------------------------
  console.log('[seed-mock] sample readers ...');
  // 10 人のサンプル読者を作って、レビュー著者として共有する
  const READER_COUNT = 10;
  const readerIds: string[] = [];
  for (let i = 0; i < READER_COUNT; i++) {
    readerIds.push(stableUuid(`reader:${i}`));
  }
  const readerRows: NewUser[] = readerIds.map((id, i) => ({
    id,
    email: `reader${i}@sample.locore.test`,
    displayName: `読者サンプル ${i + 1}`,
    role: 'reader',
    isSample: true,
  }));
  await db
    .insert(users)
    .values(readerRows)
    .onConflictDoUpdate({
      target: users.id,
      set: {
        displayName: sql`excluded.display_name`,
        isSample: sql`excluded.is_sample`,
      },
    });

  console.log(`[seed-mock] purchases + reviews (${mockReviews.length}) ...`);
  // 1 review = 1 purchase + 1 review。reader は readerIds をラウンドロビン。
  const purchaseRows: NewPurchase[] = [];
  const reviewRows: NewReview[] = [];
  for (let i = 0; i < mockReviews.length; i++) {
    const r = mockReviews[i]!;
    const articleId = articleUuids[r.articleId];
    if (!articleId) continue;
    const buyerId = readerIds[i % readerIds.length]!;
    const purchaseId = stableUuid(`purchase:${r.id}`);
    const articleObj = mockArticles.find((a) => a.id === r.articleId);
    purchaseRows.push({
      id: purchaseId,
      buyerId,
      articleId,
      amountJpy: articleObj?.priceJpy ?? 800,
      feeJpy: Math.floor((articleObj?.priceJpy ?? 800) * 0.3),
      payoutJpy: Math.floor((articleObj?.priceJpy ?? 800) * 0.7),
      status: 'completed',
      purchasedAt: new Date(r.visitedAt),
      isSample: true,
    });
    reviewRows.push({
      id: stableUuid(`review:${r.id}`),
      purchaseId,
      localScore: r.localScore,
      satisfactionStars: Math.max(1, Math.min(5, Math.round(r.satisfaction))),
      tags: r.tags,
      body: r.body,
      visitedAt: new Date(r.visitedAt),
      isSample: true,
    });
  }
  if (purchaseRows.length > 0) {
    await db
      .insert(purchases)
      .values(purchaseRows)
      .onConflictDoUpdate({
        target: purchases.id,
        set: {
          status: sql`excluded.status`,
          isSample: sql`excluded.is_sample`,
        },
      });
  }
  if (reviewRows.length > 0) {
    await db
      .insert(reviews)
      .values(reviewRows)
      .onConflictDoUpdate({
        target: reviews.id,
        set: {
          localScore: sql`excluded.local_score`,
          satisfactionStars: sql`excluded.satisfaction_stars`,
          body: sql`excluded.body`,
          tags: sql`excluded.tags`,
          isSample: sql`excluded.is_sample`,
        },
      });
  }

  // ---- sample trips ---------------------------------------------------------
  console.log(`[seed-mock] trips (${mockTrips.length}) ...`);

  // 全 spots の mock id → DB UUID マップ（trip_items.spot_id に使う）
  const spotUuidByMockId: Record<string, string> = {};
  for (const s of mockSpots) {
    spotUuidByMockId[s.id] = stableUuid(`spot:${s.id}`);
  }

  // trips のオーナーは読者 0 番（共有公開）
  const sampleTripOwner = readerIds[0]!;

  const tripRows: NewTrip[] = [];
  const tripDayRows: NewTripDay[] = [];
  const tripItemRows: NewTripItem[] = [];
  for (const t of mockTrips) {
    const tripId = stableUuid(`trip:${t.id}`);
    tripRows.push({
      id: tripId,
      ownerId: sampleTripOwner,
      cityId: paris.id,
      name: t.name,
      startDate: t.startDate,
      endDate: t.endDate,
      partySize: t.travelers,
      isSample: true,
    });
    t.days.forEach((d, idx) => {
      const dayId = stableUuid(`trip_day:${t.id}:${d.id}`);
      tripDayRows.push({
        id: dayId,
        tripId,
        dayNumber: idx + 1,
        date: d.date,
        isSample: true,
      });
      d.items.forEach((it, j) => {
        const spotUuid = it.spotId ? spotUuidByMockId[it.spotId] : null;
        tripItemRows.push({
          id: stableUuid(`trip_item:${t.id}:${d.id}:${it.id}`),
          tripDayId: dayId,
          type: spotUuid ? 'spot' : 'free',
          spotId: spotUuid ?? null,
          customName: spotUuid ? null : it.freeSpotName ?? null,
          scheduledTime: it.startTime,
          position: j,
          notes: it.notes ?? null,
          budgetJpy: it.budgetJpy ?? null,
          isSample: true,
        });
      });
    });
  }
  if (tripRows.length > 0) {
    await db
      .insert(trips)
      .values(tripRows)
      .onConflictDoUpdate({
        target: trips.id,
        set: {
          name: sql`excluded.name`,
          startDate: sql`excluded.start_date`,
          endDate: sql`excluded.end_date`,
          partySize: sql`excluded.party_size`,
          isSample: sql`excluded.is_sample`,
        },
      });
  }
  if (tripDayRows.length > 0) {
    await db
      .insert(tripDays)
      .values(tripDayRows)
      .onConflictDoUpdate({
        target: tripDays.id,
        set: {
          dayNumber: sql`excluded.day_number`,
          date: sql`excluded.date`,
          isSample: sql`excluded.is_sample`,
        },
      });
  }
  if (tripItemRows.length > 0) {
    await db
      .insert(tripItems)
      .values(tripItemRows)
      .onConflictDoUpdate({
        target: tripItems.id,
        set: {
          spotId: sql`excluded.spot_id`,
          customName: sql`excluded.custom_name`,
          scheduledTime: sql`excluded.scheduled_time`,
          position: sql`excluded.position`,
          notes: sql`excluded.notes`,
          budgetJpy: sql`excluded.budget_jpy`,
          isSample: sql`excluded.is_sample`,
        },
      });
  }

  // ---- sample crisis_events --------------------------------------------------
  console.log(`[seed-mock] crisis_events (${mockCrisisEvents.length}) ...`);
  const crisisRows: NewCrisisEvent[] = mockCrisisEvents.map((c) => ({
    id: stableUuid(`crisis:${c.id}`),
    cityId: paris.id,
    type: 'other',
    severity: c.severity,
    title: c.title,
    description: c.summary,
    japaneseSummary: c.summary,
    affectedLines: c.affectedRoutes ?? null,
    startsAt: new Date(c.startsAt),
    endsAt: new Date(c.endsAt),
    status: 'published',
    publishedAt: new Date(c.startsAt),
    autoCollected: false,
    isSample: true,
  }));
  if (crisisRows.length > 0) {
    await db
      .insert(crisisEvents)
      .values(crisisRows)
      .onConflictDoUpdate({
        target: crisisEvents.id,
        set: {
          severity: sql`excluded.severity`,
          title: sql`excluded.title`,
          description: sql`excluded.description`,
          japaneseSummary: sql`excluded.japanese_summary`,
          affectedLines: sql`excluded.affected_lines`,
          startsAt: sql`excluded.starts_at`,
          endsAt: sql`excluded.ends_at`,
          status: sql`excluded.status`,
          publishedAt: sql`excluded.published_at`,
          isSample: sql`excluded.is_sample`,
        },
      });
  }

  console.log('[seed-mock] done.');
  console.log('  - sample 行を削除する場合は `DELETE FROM users WHERE is_sample = true;`');
  console.log('    で連鎖削除されます（writer_profiles / articles / spots /');
  console.log('    light_diaries / editor_collections / collection_articles）。');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
