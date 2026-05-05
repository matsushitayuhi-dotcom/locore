/**
 * シード雛形。
 * 実装は後続スプリント（パリの city + テストユーザー + サンプル記事）。
 *
 * 使い方（予定）:
 *   pnpm --filter @locore/db tsx seed/index.ts
 */
import { createDbClient } from '../src/client';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for seeding');
  }
  const _db = createDbClient(databaseUrl);
  // TODO: 実装する
  console.log('seed: not implemented yet');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
