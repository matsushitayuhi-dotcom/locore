import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * 起動時に1回だけ作る Drizzle クライアント。
 *
 * max はプロセスあたりの接続数。Supabase の session pooler (port 5432) は
 * クライアント上限が pool_size=15 しかなく、max=10 だと dev サーバー +
 * もう1プロセス（build 検証・seed 等）で即枯渇して EMAXCONNSESSION になる。
 * 既定を 5 に下げ、必要なら DB_POOL_MAX で調整できるようにする。
 * （恒久策は DATABASE_URL を transaction pooler = port 6543 に切り替えること）
 */
export const createDbClient = (databaseUrl: string) => {
  const client = postgres(databaseUrl, {
    prepare: false,
    max: Number(process.env.DB_POOL_MAX ?? 5),
  });
  return drizzle(client, { schema });
};

export type DbClient = ReturnType<typeof createDbClient>;

export { schema };
