/**
 * Locore シードスクリプト。
 *
 * 使い方:
 *   DATABASE_URL=postgres://... pnpm --filter @locore/db db:seed
 *
 * 投入内容（Phase 1 コア）：
 *   - cities: Paris (active), London/NYC (inactive)
 *   - users: reader 1, resident_writer 3, editor 1
 *   - writer_profiles: 3 (Tier S/A/B)
 *   - articles: パリ 5本
 *   - spots: 各記事 3-5
 *
 * 冪等性：固定 UUID + ON CONFLICT DO NOTHING/UPDATE で再実行可。
 */
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { createDbClient } from '../src/client';
import {
  cities,
  users,
  writerProfiles,
  articles,
  spots,
} from '../src/schema';
import { seedCities } from './data/cities';
import { seedUsers, seedWriterProfiles } from './data/users';
import { buildSeedArticles, buildSeedSpots } from './data/articles';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for seeding');
  }
  const db = createDbClient(databaseUrl);

  console.log('[seed] cities ...');
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

  console.log('[seed] users ...');
  await db
    .insert(users)
    .values(seedUsers)
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: sql`excluded.email`,
        displayName: sql`excluded.display_name`,
        role: sql`excluded.role`,
        bio: sql`excluded.bio`,
      },
    });

  console.log('[seed] writer_profiles ...');
  await db
    .insert(writerProfiles)
    .values(seedWriterProfiles)
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
      },
    });

  console.log('[seed] articles ...');
  await db
    .insert(articles)
    .values(buildSeedArticles(paris.id))
    .onConflictDoNothing();

  console.log('[seed] spots ...');
  // spots は固定 UUID を持っていないので、再実行時には記事ごとに一旦削除してから入れ直す
  for (const articleId of [
    '01000000-0000-0000-0000-000000000001',
    '01000000-0000-0000-0000-000000000002',
    '01000000-0000-0000-0000-000000000003',
    '01000000-0000-0000-0000-000000000004',
    '01000000-0000-0000-0000-000000000005',
  ]) {
    await db.execute(sql`DELETE FROM spots WHERE article_id = ${articleId}::uuid`);
  }
  await db.insert(spots).values(buildSeedSpots());

  console.log('[seed] done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
