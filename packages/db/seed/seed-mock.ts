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
  type NewUser,
  type NewWriterProfile,
  type NewArticle,
  type NewSpot,
  type NewLightDiary,
  type NewEditorCollection,
  type NewCollectionArticle,
} from '../src/schema';

// mock データは apps/web 側に存在する。tsx は相対パスで TS を直接読めるので
// そのまま型と値を import する。
import {
  writers as mockWriters,
  articles as mockArticles,
  spots as mockSpots,
  lightDiaries as mockLightDiaries,
  collections as mockCollections,
  type Writer as MockWriter,
  type Article as MockArticle,
  type Spot as MockSpot,
  type DurationType as MockDurationType,
} from '../../../apps/web/lib/mock';

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
