import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

/**
 * Drizzle Kit 設定。
 * ARCHITECTURE-DECISIONS.md §3 に従い、schema-first（introspection はしない）。
 *
 * - DATABASE_URL: 通常のプール経由接続
 * - DIRECT_URL: マイグレーション実行時の direct connection（Supabase の場合 pooler 不可）
 *   優先順位: DIRECT_URL > DATABASE_URL > ローカル既定
 */
const url =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  'postgres://postgres:postgres@localhost:5432/locore';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
