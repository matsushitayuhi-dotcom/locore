-- 0001_enable_extensions.sql
-- 必要な Postgres 拡張を有効化。
-- このマイグレーションは最初に必ず適用すること（drizzle-kit 生成 SQL より前）。

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- gen_random_uuid() 用（Postgres 13+ なら build-in）
CREATE EXTENSION IF NOT EXISTS pgcrypto;
