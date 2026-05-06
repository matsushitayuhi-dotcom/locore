import 'server-only';
import { createDbClient, type DbClient } from '@locore/db';

/**
 * Drizzle クライアント（Server Actions / Route Handlers 用）。
 * モジュール初回 import 時に1度だけ生成される。
 */
let _client: DbClient | null = null;

export function getDb(): DbClient {
  if (_client) return _client;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Add it to apps/web/.env.local. ' +
        'See packages/db/.env for the value.',
    );
  }

  _client = createDbClient(url);
  return _client;
}
