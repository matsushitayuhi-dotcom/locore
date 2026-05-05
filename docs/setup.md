# ローカル開発セットアップ

スプリント1（M0前半）の Definition of Done を満たすための手順。

## 1. ツール

| ツール | バージョン | 用途 |
|------|----------|------|
| Node.js | 20.x | ランタイム |
| pnpm | 9.x | パッケージマネージャ |
| Docker | latest | Postgres + Redis ローカル |
| Supabase CLI | latest | ローカル Supabase スタック |

```bash
corepack enable
corepack prepare pnpm@9.12.3 --activate
brew install supabase/tap/supabase   # macOS
# Windows は scoop install supabase
```

## 2. リポジトリ取得 & 依存解決

```bash
git clone <repo>
cd locore
nvm use
pnpm install
```

## 3. 環境変数

各アプリの `.env.example` を `.env`（API/Workers）または `.env.local`（Next.js）にコピー：

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp apps/workers/.env.example apps/workers/.env
cp packages/db/.env.example packages/db/.env 2>/dev/null || true
```

主な値：

- `DATABASE_URL` — Supabase ローカルの場合 `postgres://postgres:postgres@localhost:54322/postgres`
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — `supabase status` で確認
- `STRIPE_*` — Stripe ダッシュボードの test モードのキー
- `GOOGLE_MAPS_API_KEY` — GCP コンソール（請求情報必須）

## 4. ローカル Supabase 起動

```bash
supabase start
# 起動後に supabase status で URL とキーを確認
```

PostGIS 拡張は手動で有効化（初回のみ）：

```sql
-- supabase/sql/init.sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

## 5. 初回マイグレーション

```bash
# Drizzle スキーマから SQL を生成
pnpm --filter @locore/db db:generate

# DB に適用
pnpm --filter @locore/db db:migrate
```

シードは Phase 1 で整備予定：

```bash
# pnpm --filter @locore/db tsx seed/index.ts   # 後続スプリントで実装
```

## 6. アプリ起動

```bash
# 並列起動
pnpm dev

# 個別
pnpm --filter @locore/web dev      # http://localhost:3000
pnpm --filter @locore/api dev      # http://localhost:3001
pnpm --filter @locore/workers dev
```

ヘルスチェック：

```bash
curl http://localhost:3001/health
# {"status":"ok","timestamp":"...","version":"0.0.0"}
```

## 7. テスト & チェック

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## トラブルシュート

- **`@locore/ui` not found** — UI パッケージは別エージェントが構築中。まだ存在しない場合、
  `apps/web/package.json` から該当依存を一時的に外す（手順は README 末尾参照）。
- **PostGIS が認識されない** — Supabase CLI のローカル DB に拡張を作成し直す（手順 4）。
- **pnpm install が遅い** — `pnpm install --prefer-offline` を試す。
