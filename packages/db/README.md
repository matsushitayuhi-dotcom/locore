# @locore/db

Drizzle ORM で構築したデータベース層。Postgres + PostGIS 前提（Supabase）。

## 構成

- `src/schema/` — テーブル定義（schema-first、28 テーブル）
- `src/client.ts` — `createDbClient(url)` で Drizzle インスタンスを生成
- `drizzle.config.ts` — drizzle-kit 設定（`DATABASE_URL` / `DIRECT_URL` を参照）
- `migrations/` — `db:generate` で生成された SQL（drizzle-kit DSL から）
- `migrations/manual/` — 手書き SQL（拡張、GIST/GIN/部分インデックス、RLS、トリガ）
- `seed/` — シードスクリプト（パリ + テストユーザー + 5記事）

## テーブル一覧（28）

- **Identity**: users, writer_profiles, residency_verifications, sns_links
- **Catalog**: cities, articles, article_videos, spots
- **Commerce**: purchases, payouts
- **Reviews**: reviews
- **Trips**: trips, trip_days, trip_items, trip_collaborators
- **UGC**: light_diaries
- **Editorial**: editor_collections, collection_articles
- **Moderation・運営**: article_moderation_scores, founding_applications, reports
- **Crisis**: crisis_events, crisis_source_feeds, crisis_candidates
- **System**: push_subscriptions, notification_log, exchange_rates, audit_logs

## ローカル開発

### 1. 依存関係インストール

```bash
pnpm install
```

### 2. 環境変数設定

`packages/db/.env.example` をコピーして `.env` を作る：

```bash
cp packages/db/.env.example packages/db/.env
# DATABASE_URL / DIRECT_URL を編集
```

ローカル Postgres を Supabase CLI で起動する場合：

```bash
supabase init   # 初回のみ
supabase start  # ローカル DB を起動（PostGIS 入り）
# 出力された Connection string を DATABASE_URL に設定
```

### 3. マイグレーション

適用順序（重要）：

```bash
# 1) 拡張を有効化（手動）
psql $DIRECT_URL -f packages/db/migrations/manual/0001_enable_extensions.sql

# 2) drizzle-kit でスキーマを生成 → 適用
pnpm --filter @locore/db db:generate
pnpm --filter @locore/db db:migrate

# 3) インデックス・RLS・トリガを手動適用
psql $DIRECT_URL -f packages/db/migrations/manual/0002_indexes.sql
psql $DIRECT_URL -f packages/db/migrations/manual/0003_rls_policies.sql
psql $DIRECT_URL -f packages/db/migrations/manual/0004_triggers.sql
```

開発時の手早い反映なら `db:push`（マイグレーションファイルを介さずに直接スキーマを適用）：

```bash
pnpm --filter @locore/db db:push
```

### 4. シード投入

最小セット（5記事）：

```bash
pnpm --filter @locore/db db:seed
```

投入内容：
- cities: Paris (active) / London / NYC (inactive)
- users: reader 1 + resident_writer 3 (Tier S/A/B) + editor 1
- writer_profiles: 3
- articles: パリ 5本（status=published）
- spots: 各記事 3-5 個

固定 UUID + ON CONFLICT DO UPDATE で冪等。

### 4'. フルモック投入（is_sample フラグ付き）

`apps/web/lib/mock` の全データ（25 記事 / 95 スポット / 8 ライター / ライト旅行記 / コレクション）を `is_sample = true` で一括投入：

```bash
# 事前に 0010_is_sample.sql を流して列を追加しておく
psql $DIRECT_URL -f packages/db/migrations/manual/0010_is_sample.sql
pnpm --filter @locore/db db:seed-mock
```

`is_sample = true` の行だけまとめて削除する：

```bash
# SQL Editor で実行
psql $DIRECT_URL -f packages/db/migrations/manual/0011_cleanup_samples.sql

# または tsx で
pnpm --filter @locore/db db:clean-samples
```

投入は決定論的 UUID + ON CONFLICT DO UPDATE で冪等（mock を編集して再 seed すれば DB 上の値も追従）。

### 5. Drizzle Studio

```bash
pnpm --filter @locore/db db:studio
```

## スクリプト

| script | 用途 |
| --- | --- |
| `db:generate` | スキーマからマイグレーション SQL を生成 |
| `db:push` | マイグレーション介さず直接 DB に反映（開発のみ） |
| `db:migrate` | 生成済みマイグレーションを適用 |
| `db:check` | スキーマと DB の差分を確認 |
| `db:studio` | Drizzle Studio を起動 |
| `db:seed` | seed/index.ts を実行（最小 5 記事） |
| `db:seed-mock` | seed/seed-mock.ts を実行（フルモック・is_sample=true） |
| `db:clean-samples` | is_sample=true の行を全削除 |

## 注意

- PostGIS / pg_trgm は手書きマイグレーション（`0001_enable_extensions.sql`）で先に有効化する必要あり
- 部分インデックス（例 `WHERE status = 'published'`）と GIST/GIN は drizzle-kit のサポート外 → `0002_indexes.sql`
- RLS ポリシー（`0003_rls_policies.sql`）は Supabase の `auth.uid()` 前提
- `updated_at` は `0004_triggers.sql` の汎用トリガで自動更新
- enum 値は `@locore/shared` の `Tier`／`ArticleStatus`／`WriterRole`／`ReviewTag` と必ず同期させる
- 論理削除：`articles` と `users` のみ `deleted_at`、その他は hard delete
- 金額は JPY 基軸の `integer`（小数点なし）
