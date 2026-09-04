import 'server-only';
import { createDbClient, type DbClient } from '@locore/db';

/**
 * Drizzle クライアント（Server Actions / Route Handlers 用）。
 *
 * キャッシュは globalThis に持つ（Next.js 定番パターン）。モジュール変数だと
 * dev のホットリロードのたびに新しいモジュールインスタンス = 新しい接続プールが
 * 生成されて古いプールが漏れ、時間とともに Supabase pooler の接続上限に達して
 * 「dev サーバーだけ全クエリが失敗する（再起動で直る）」状態になるため。
 */
const globalForDb = globalThis as unknown as { __locoreDb?: DbClient };

export function getDb(): DbClient {
  if (globalForDb.__locoreDb) return globalForDb.__locoreDb;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Add it to apps/web/.env.local. ' +
        'See packages/db/.env for the value.',
    );
  }

  globalForDb.__locoreDb = createDbClient(url);
  return globalForDb.__locoreDb;
}
