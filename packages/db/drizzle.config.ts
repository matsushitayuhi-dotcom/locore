import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit 設定。
 * ARCHITECTURE-DECISIONS.md §3 に従い、schema-first（introspection はしない）。
 */
export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/locore',
  },
  strict: true,
  verbose: true,
});
