# @locore/db

Drizzle ORM で構築したデータベース層。Postgres + PostGIS 前提。

## 構成

- `src/schema/` — テーブル定義（schema-first）
- `src/client.ts` — `createDbClient(url)` で Drizzle インスタンスを生成
- `drizzle.config.ts` — drizzle-kit 設定
- `migrations/` — `pnpm --filter @locore/db db:generate` で生成された SQL
- `seed/` — シードスクリプト（雛形のみ）

## ローカル開発

```bash
# 1. .env で DATABASE_URL を設定（例: Supabase ローカルの URL）
# 2. スキーマからマイグレーションを生成
pnpm --filter @locore/db db:generate

# 3. 適用
pnpm --filter @locore/db db:migrate
```

## 注意

- PostGIS 拡張は手書きマイグレーションで `CREATE EXTENSION postgis` する必要あり
- 部分インデックス（例 `WHERE status = 'published'`）は drizzle-kit のサポート外、
  生 SQL マイグレーションで追加する
- enum 値は `@locore/shared` の `Tier`／`ArticleStatus`／`WriterRole` と必ず同期させる
