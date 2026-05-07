/**
 * サンプルデータ（is_sample = true）の一括削除スクリプト。
 *
 * 使い方:
 *   DATABASE_URL=postgres://... pnpm --filter @locore/db db:clean-samples
 *
 * 内容は `migrations/manual/0011_cleanup_samples.sql` と同じ。
 * Supabase SQL Editor を開かずにコマンドで一発削除したい時に使う。
 */
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { createDbClient } from '../src/client';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for clean-samples');
  }
  const db = createDbClient(databaseUrl);

  console.log('[clean-samples] deleting sample rows ...');

  // トランザクション内で全部消す。
  // FK は cascade されるが、明示的に順序を指定（運営の安心感のため）。
  await db.execute(sql`BEGIN`);
  try {
    const counts: Record<string, number> = {};
    const queries = [
      ['collection_articles', sql`DELETE FROM collection_articles
        WHERE collection_id IN (SELECT id FROM editor_collections WHERE is_sample)`],
      ['editor_collections', sql`DELETE FROM editor_collections WHERE is_sample`],
      ['light_diaries', sql`DELETE FROM light_diaries WHERE is_sample`],
      ['spots', sql`DELETE FROM spots WHERE is_sample`],
      ['articles', sql`DELETE FROM articles WHERE is_sample`],
      ['writer_profiles', sql`DELETE FROM writer_profiles WHERE is_sample`],
      ['users', sql`DELETE FROM users WHERE is_sample`],
    ] as const;
    for (const [name, q] of queries) {
      const r = (await db.execute(q)) as unknown as { count?: number } | unknown[];
      const count = Array.isArray(r) ? r.length : (r as { count?: number }).count ?? 0;
      counts[name] = count;
      console.log(`  ${name}: ${count} rows`);
    }
    await db.execute(sql`COMMIT`);
    console.log('[clean-samples] done.');
  } catch (err) {
    await db.execute(sql`ROLLBACK`);
    throw err;
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
