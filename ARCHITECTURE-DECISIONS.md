両ドキュメントを把握しました。それでは ARCHITECTURE.md §12 のオープンクエスチョン全7項目について、Locore のコンテキスト（小〜中規模スタートアップ、フロント中心、SEO 重要、スケール初期、パリ単都市 → 国際展開）に即した技術設計を提案します。

---

# Locore — 技術アーキテクチャ補論：オープンクエスチョン解決

**バージョン**: 0.1
**最終更新**: 2026-05-05
**対象**: ARCHITECTURE.md v0.1 §12 の技術側オープンクエスチョン全7項目
**前提**: PRD.md v0.3、ARCHITECTURE.md v0.1

---

## 0. ドキュメント概要

本書は、`ARCHITECTURE.md` §12 に積み残されていた7つの技術判断について、Locore のコンテキスト（パリ単都市先行 → 国際展開、フロント中心の SEO 駆動グロース、小規模チーム、Phase 1 は MAU 1,000 → M12 で 30,000）に即した推奨案・代替案・実装スニペット・トレードオフを示す。

判断の基本方針：

1. **DX（書く速さ）と SEO 速度を最優先**。記事マーケットプレイスは「在庫＝記事数」に直結するためフロントの開発者体験を犠牲にしない
2. **ベンダーロックインは Postgres の外側だけ許容**。Supabase / Vercel / Algolia は剥がせるが、Postgres スキーマと SQL ロジックは将来も持ち運べる形にする
3. **二重メンテを増やさない**。Phase 1 は人手少、コードベース・スキーマ・型を1か所に集約する
4. **Phase 3（英語追加・多都市）の入口で構造を作り直さない**。i18n と検索のキー設計は今のうちに英語前提に整える

---

## 1. モノレポ vs マルチレポ

### 1.1 推奨：pnpm workspace + Turborepo によるモノレポ

`apps/` と `packages/` の2階層構成。リポジトリは1つ、デプロイ単位は分離。

### 1.2 推奨ディレクトリ構成

```
locore/
├── apps/
│   ├── web/                       # Next.js 14+ App Router (Vercel)
│   ├── api/                       # NestJS (Railway)
│   ├── workers/                   # BullMQ ワーカー (Railway, separate service)
│   └── admin/                     # 編集者・運営向け管理画面 (Vercel, sub-domain)
├── packages/
│   ├── db/                        # Drizzle スキーマ + マイグレーション + RLS DSL
│   │   ├── schema/
│   │   │   ├── users.ts
│   │   │   ├── articles.ts
│   │   │   ├── spots.ts          # PostGIS geometry を含む
│   │   │   └── index.ts
│   │   ├── migrations/            # drizzle-kit が生成
│   │   ├── seed/
│   │   └── drizzle.config.ts
│   ├── shared/                    # 純粋な型・定数・ドメインロジック
│   │   ├── enums.ts              # Tier, ArticleStatus, etc.
│   │   ├── pricing.ts            # 価格段階・手数料率の真実の源
│   │   └── geo.ts                # ヒュベニ式・距離計算
│   ├── api-contracts/             # OpenAPI スキーマ + zod スキーマ + 生成型
│   │   ├── openapi.yaml
│   │   ├── schemas/
│   │   │   ├── article.ts        # zod
│   │   │   ├── purchase.ts
│   │   │   └── trip.ts
│   │   └── generated/             # openapi-typescript の出力
│   ├── ui/                        # shadcn/ui ベース + 独自トークン
│   │   ├── primitives/            # Button, Input, Dialog 等
│   │   ├── compounds/             # ArticleCard, SpotPin 等
│   │   ├── tokens/                # CSS variables, Tailwind preset
│   │   └── tailwind.preset.ts
│   ├── i18n/                      # 翻訳キー型 + メッセージ
│   │   ├── locales/
│   │   │   ├── ja.json
│   │   │   └── en.json           # Phase 3 で投入
│   │   └── keys.ts                # 翻訳キーの型生成
│   ├── analytics/                 # PostHog イベント名・プロパティの型
│   ├── config/                    # eslint, tsconfig, prettier の共通プリセット
│   │   ├── eslint-preset.js
│   │   ├── tsconfig.base.json
│   │   └── tailwind.base.js
│   └── testing/                   # テスト用ファクトリ・MSW ハンドラ
├── tooling/
│   ├── scripts/                   # ローカル開発スクリプト
│   └── github-actions/            # 共通 composite actions
├── .changeset/                    # バージョン管理（packages のみ）
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── tsconfig.base.json
```

### 1.3 `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### 1.4 `turbo.json`（最小構成）

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local", "tsconfig.base.json"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"],
      "env": ["NODE_ENV", "VERCEL_ENV"]
    },
    "dev": { "cache": false, "persistent": true },
    "lint": { "outputs": [] },
    "typecheck": { "dependsOn": ["^build"], "outputs": [] },
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "test:e2e": { "dependsOn": ["^build"], "outputs": ["playwright-report/**"] },
    "db:generate": { "outputs": ["packages/db/migrations/**"] }
  }
}
```

### 1.5 共有パッケージの考え方

| パッケージ | 役割 | 重要原則 |
|----|----|----|
| `@locore/db` | Drizzle スキーマ・マイグレーション・RLS | Web からは直接 import せず API 経由でしか触らせない（誤って Supabase service key がフロントに混入する事故を防ぐ） |
| `@locore/shared` | フレームワーク非依存のドメインロジック | React・Nest を import しない。ブラウザでも Node でも動く |
| `@locore/api-contracts` | API の真実の源（OpenAPI + zod） | `apps/web` も `apps/api` もこれを import。単一の真実の源 |
| `@locore/ui` | デザインシステム | `apps/web` と `apps/admin` で共用。shadcn のコピーは UI パッケージ内に置く |
| `@locore/i18n` | 翻訳キーとメッセージ | 翻訳キーの存在しない参照はビルド時エラーに |
| `@locore/analytics` | イベント名の型定義 | PostHog `capture("event_name", props)` の `props` を型で縛る |
| `@locore/config` | tsconfig / eslint / tailwind プリセット | `extends` 専用、ロジックは持たない |

### 1.6 CI 設計（GitHub Actions）

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      affected: ${{ steps.affected.outputs.value }}
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - id: affected
        run: echo "value=$(pnpm turbo run build --dry=json --filter='...[origin/main]' | jq -c '.tasks | map(.package) | unique')" >> $GITHUB_OUTPUT

  lint:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run lint typecheck --cache-dir=.turbo
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}

  test-unit:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run test --cache-dir=.turbo

  test-e2e:
    needs: setup
    if: contains(needs.setup.outputs.affected, 'web')
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env: { POSTGRES_PASSWORD: postgres }
        ports: ['5432:5432']
        options: --health-cmd pg_isready
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @locore/db migrate
      - run: pnpm --filter @locore/db seed
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm turbo run test:e2e

  db-check:
    runs-on: ubuntu-latest
    if: contains(needs.setup.outputs.affected, 'db')
    steps:
      - run: pnpm --filter @locore/db drizzle-kit check
```

ポイント：

- **Turborepo Remote Cache** を有効化（Vercel が運営、無料枠で十分）。差分ビルドが効くので、`packages/ui` だけ変えた PR でも `apps/api` のビルドは走らない
- **`affected` 計算** で E2E は `apps/web` が変わった時だけ走らせる
- **DB ジョブは独立**：`packages/db` のスキーマ変更だけで走る `drizzle-kit check`（マイグレーションの一貫性チェック）

### 1.7 デプロイ単位の分離

| アプリ | デプロイ先 | トリガ |
|----|----|----|
| `apps/web` | Vercel | `main` への merge、Vercel が `apps/web` 配下と依存 packages の変更を検知 |
| `apps/api` | Railway | GitHub 連携、`apps/api` か `packages/{db,shared,api-contracts}` 変更時 |
| `apps/workers` | Railway（別サービス） | 同上、ただし別 service として別プロセス |
| `apps/admin` | Vercel（別プロジェクト） | サブドメイン `admin.locore.app` |

Vercel の Monorepo 設定は `Root Directory: apps/web`、`Ignored Build Step: pnpm dlx turbo-ignore` で「無関係な変更ではビルドしない」を実現。

### 1.8 代替案

| 案 | 評価 |
|----|----|
| **Nx** | 機能は強いが学習コスト・暗黙設定が多い。Locore の規模では Turbo の素朴さが勝る |
| **Bun workspace** | 速いが NestJS との相性検証コスト、Stripe SDK 等のネイティブ依存に懸念。Phase 1 は pnpm |
| **Yarn Berry (PnP)** | TS の `.d.ts` 解決でハマる事例が多い。Next.js とのトラブルを避け pnpm |
| **マルチレポ (web / api / shared)** | 型同期が手作業になり、API 変更時に Web 側更新が漏れる。少人数では事故源 |

### 1.9 トレードオフ

- **得るもの**：型・スキーマ・UIの単一の真実の源、原子的な PR（API 変更と Web 修正を1つの PR で）、リファクタの容易さ
- **失うもの**：リポジトリの肥大、初期セットアップの複雑さ、外部委託時の権限分割の難しさ（編集チーム向け管理画面は別リポにしたくなる時が来るかもしれないが、その時は `apps/admin` だけ切り出す）
- **Phase 3 で再検討**：MAU 30万を超えチーム10人以上になったら、`apps/api` のサブモジュール（payouts, moderation 等）を別サービスに切り出す可能性あり。その時もモノレポは維持

---

## 2. GraphQL vs REST vs tRPC

### 2.1 推奨：内部は tRPC、外部公開は REST（OpenAPI）のハイブリッド

「Web フロント ⇄ NestJS バックエンド」は **tRPC over HTTP**、「外部公開・将来のネイティブアプリ・Webhook」は **REST + OpenAPI**。

ただし重要な制約：**NestJS との統合は素朴な tRPC では摩擦がある**。NestJS の DI・Guard・Interceptor の恩恵を捨てたくないので、以下の構成にする。

### 2.2 構成

```
apps/api/src/
├── modules/
│   ├── articles/
│   │   ├── articles.service.ts        # ビジネスロジック（DI される）
│   │   ├── articles.controller.ts     # REST + OpenAPI（外部公開エンドポイントのみ）
│   │   └── articles.router.ts         # tRPC ルータ（内部 Web 用）
│   └── ...
├── trpc/
│   ├── trpc.ts                        # initTRPC, context
│   └── app-router.ts                  # 全 router を merge
└── main.ts
```

`articles.router.ts` の例：

```typescript
// apps/api/src/modules/articles/articles.router.ts
import { Inject, Injectable } from '@nestjs/common';
import { router, protectedProcedure, publicProcedure } from '../../trpc/trpc';
import { ArticlesService } from './articles.service';
import { articleListInput, articleDetailInput, articlePublishInput } from '@locore/api-contracts/schemas/article';

@Injectable()
export class ArticlesRouter {
  constructor(@Inject(ArticlesService) private readonly svc: ArticlesService) {}

  router = router({
    list: publicProcedure
      .input(articleListInput)
      .query(({ input }) => this.svc.list(input)),
    detail: publicProcedure
      .input(articleDetailInput)
      .query(({ input, ctx }) => this.svc.detail(input.id, ctx.user)),
    publish: protectedProcedure
      .input(articlePublishInput)
      .mutation(({ input, ctx }) => this.svc.publish(input, ctx.user)),
  });
}
```

`apps/web` 側：

```typescript
// apps/web/src/lib/trpc.ts
import { createTRPCNext } from '@trpc/next';
import type { AppRouter } from '@locore/api/trpc/app-router';

export const trpc = createTRPCNext<AppRouter>({
  config: () => ({
    links: [
      httpBatchLink({
        url: process.env.NEXT_PUBLIC_API_URL + '/trpc',
        headers: () => ({ authorization: getSupabaseToken() }),
      }),
    ],
  }),
});
```

### 2.3 REST + OpenAPI の役割

REST は以下のためだけに残す：

1. **Stripe / Wise / Supabase Auth Webhook 受信** — tRPC は使えない
2. **Service-to-service（workers ↔ api）** — シンプルさ優先
3. **Phase 3 のネイティブアプリ・公開 API** — tRPC は外部公開 API としては表現力が弱く、SDK 配布も難しい

OpenAPI スキーマは `packages/api-contracts/openapi.yaml` に手書きで真実の源として置き、NestJS には `@nestjs/swagger` の **デコレータではなく**、`openapi.yaml` から `openapi-zod-client` で zod スキーマと型を生成する：

```bash
# packages/api-contracts/package.json
"scripts": {
  "generate": "openapi-zod-client openapi.yaml -o ./generated/client.ts && openapi-typescript openapi.yaml -o ./generated/schema.d.ts"
}
```

これにより：

- フロントは `generated/schema.d.ts` を import して型安全に fetch
- NestJS Controller は `ZodValidationPipe` で `generated/client.ts` の zod スキーマを使う
- ドキュメントは `openapi.yaml` を Stoplight Elements で公開

### 2.4 tRPC を選ぶ理由（GraphQL を選ばない理由）

| 観点 | tRPC | GraphQL | REST |
|----|----|----|----|
| Web ⇄ API の型安全性 | 完全自動 | codegen 必要 | 手動 or codegen |
| 学習コスト | 低 | 中〜高 | 低 |
| N+1 問題 | 関数単位で書くので発生しにくい | DataLoader 必須 | エンドポイント設計次第 |
| キャッシュ戦略 | TanStack Query 経由 | Apollo / Relay | TanStack Query / SWR |
| 外部公開・SDK 配布 | 不向き | 向く | 向く |
| BFF パターン | 自然 | 過剰 | OK |
| Phase 1 のフィット | ◎ | △（オーバーキル） | ○ |

Locore は **N+1 を起こしやすいリッチなクエリ（記事 → スポット → レビュー）が少なく**、フィードはサーバ側でランキング計算済みのものを返す BFF 寄り設計。GraphQL の柔軟性はオーバーキル。

tRPC を選ぶ最大の理由は **API 変更時のフロント壊れを TS が検知すること**。少人数で動くため、`articles.publish` の引数を増やしたら Web 側のフォームコンポーネントもコンパイルエラーで知らせる体験が効く。

### 2.5 Public REST エンドポイントの境界

| 用途 | プロトコル | 例 |
|----|----|----|
| Web → API（読み取り・書き込み） | tRPC | `trpc.articles.list.query()` |
| 外部 Webhook 受信 | REST | `POST /webhooks/stripe`、`POST /webhooks/wise` |
| 公開 RSS / OGP | REST | `GET /feed.xml`, `GET /articles/{slug}/og.png` |
| Phase 3 公開 API | REST | `GET /v1/articles?city=paris` |
| 管理画面 → API | tRPC（別 router） | `trpc.admin.collections.create.mutate()` |

### 2.6 トレードオフ

- **得るもの**：内部 API の DX 最大化、型安全な BFF、外部公開の標準化
- **失うもの**：2系統メンテ、tRPC のサーバ側を NestJS に統合する初期セットアップコスト
- **将来の出口**：tRPC を捨てたくなったら、`*.router.ts` を `*.controller.ts` に書き換えて zod スキーマを REST 版にコピペすれば移行できる（zod スキーマが共通なので）

---

## 3. マイグレーションツール

### 3.1 推奨：Drizzle Kit

ARCHITECTURE.md §12 の暫定案を確定。Drizzle ORM とセットで採用。

### 3.2 ディレクトリ構成

```
packages/db/
├── schema/
│   ├── users.ts
│   ├── articles.ts
│   ├── spots.ts
│   ├── reviews.ts
│   └── index.ts                 # 全 export
├── migrations/                  # drizzle-kit が生成、PRに含める
│   ├── 0000_init.sql
│   ├── 0001_add_residency_verifications.sql
│   ├── meta/
│   │   ├── 0000_snapshot.json
│   │   ├── 0001_snapshot.json
│   │   └── _journal.json
│   └── README.md
├── manual/                      # Drizzle が生成しない手書き SQL
│   ├── 001_postgis_extensions.sql
│   ├── 002_rls_policies.sql
│   ├── 003_indexes_gist.sql
│   └── 004_triggers.sql
├── seed/
│   ├── cities.ts
│   ├── dev-articles.ts
│   └── index.ts
├── drizzle.config.ts
├── client.ts                    # postgres-js + drizzle インスタンス
└── package.json
```

### 3.3 `drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './schema/index.ts',
  out: './migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
  // PostGIS 関連の型は drizzle が知らないので introspection ではなく schema-first
  schemaFilter: ['public'],
});
```

### 3.4 PostGIS と RLS の扱い：手書き SQL との混在戦略

Drizzle Kit は `CREATE EXTENSION`、`CREATE POLICY`、`CREATE INDEX ... USING GIST` などを **生成しない**。これらは `manual/` 配下に SQL ファイルとして置き、独自 runner で順序保証する：

```typescript
// packages/db/scripts/migrate.ts
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, sql_client } from '../client';
import fs from 'node:fs';
import path from 'node:path';

async function run() {
  // 1. PostGIS 拡張など、Drizzle 管理外の前提条件
  await applyManualPhase('manual/001_postgis_extensions.sql');

  // 2. Drizzle のスキーマ反映
  await migrate(db, { migrationsFolder: './migrations' });

  // 3. RLS、独自 GIST インデックス、トリガ
  await applyManualPhase('manual/002_rls_policies.sql');
  await applyManualPhase('manual/003_indexes_gist.sql');
  await applyManualPhase('manual/004_triggers.sql');
}

async function applyManualPhase(file: string) {
  const sql = fs.readFileSync(path.resolve(file), 'utf-8');
  // _migrations_manual テーブルで適用済みかチェック
  const applied = await sql_client`SELECT 1 FROM _migrations_manual WHERE name = ${file}`;
  if (applied.length > 0) return;
  await sql_client.unsafe(sql);
  await sql_client`INSERT INTO _migrations_manual(name, applied_at) VALUES (${file}, NOW())`;
}

run().catch((e) => { console.error(e); process.exit(1); });
```

`manual/001_postgis_extensions.sql` の例：

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- _migrations_manual 自体のテーブル
CREATE TABLE IF NOT EXISTS _migrations_manual (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.5 ロールバック戦略

**原則：Drizzle に down マイグレーションは書かない**。理由：

- Drizzle Kit は down を自動生成しない
- 本番でロールバックを成功させるのは難しい（書き込みが進んでいる）
- スタートアップでは「forward fix」で前進する方が安全

代わりに以下のルールでデータ損失を防ぐ：

| 変更種別 | ルール |
|----|----|
| カラム追加 | NULL 許容で追加 → 後続 PR で必須化 |
| カラム削除 | まずアプリから参照を全削除 → 1 リリース寝かせる → 削除 PR |
| カラム型変更 | 新カラム追加 → 二重書き込み → バックフィル → 旧削除（Expand-Contract） |
| テーブルリネーム | View で旧名エイリアス作成 → アプリ更新 → View 削除 |

緊急時のロールバックは **Vercel の Instant Rollback でアプリを戻し、DB はそのまま**。スキーマが前進しているからこそ、過去のアプリは新スキーマでも動かないといけない。これが Expand-Contract を強制する力学。

### 3.6 ステージング適用フロー

```
[ローカル] 開発者が schema/articles.ts を編集
    │
    ▼
[ローカル] pnpm db:generate → migrations/00XX_*.sql が生成される
    │
    ▼
[ローカル] pnpm db:migrate でローカル PostgreSQL に適用、動作確認
    │
    ▼
[PR 作成] migrations/00XX_*.sql を PR に含める
    │
    ▼
[CI] drizzle-kit check で diff 検証（schema と migrations の不整合を検知）
    │
    ▼
[Staging] PR が staging にマージされた瞬間、Railway デプロイ前に
          GitHub Actions が staging DB で migrate を実行
    │
    ▼
[Staging] スモークテスト（Playwright の主要パスのみ）
    │
    ▼
[Production] main に merge → Production DB で migrate（GitHub Actions の手動承認ステップ）
    │
    ▼
[Production] Railway / Vercel デプロイ
```

`scripts/migrate-prod.yml`（手動承認）：

```yaml
name: Production DB Migrate
on:
  workflow_dispatch:
  push:
    branches: [main]
    paths: ['packages/db/migrations/**', 'packages/db/manual/**']

jobs:
  migrate:
    environment: production-db   # GitHub の Environment Protection で承認必須
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @locore/db migrate
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
```

### 3.7 代替案

| 案 | 評価 |
|----|----|
| **Prisma** | スキーマ DSL は強力、IDE 補完優秀。だが PostGIS の `geometry` 型のサポートが弱く、生 SQL での回避が必要。Drizzle ほど「TS = SQL」感がない |
| **Supabase Migration (CLI)** | Supabase の機能（RLS、Auth）と統合は良い。しかし Supabase CLI のマイグレーションは「diff ベース」で、開発者が手書き SQL に慣れている前提。Drizzle Kit の方が日常運用が楽 |
| **Sqitch** | 業界実績あり、Postgres ネイティブ。だが TS スキーマとの二重管理になり、型導出ができない |
| **node-pg-migrate / Knex Migrations** | 古典的だが TS 型連携が弱い |

### 3.8 トレードオフ

- **得るもの**：TS スキーマからマイグレーション自動生成、Drizzle ORM との一貫性、PostGIS との共存
- **失うもの**：ロールバック戦略を「Expand-Contract で吸収する」という規律をチームに敷く必要、`manual/` の SQL は人手レビュー必須
- **失敗のシグナル**：手書き SQL が増えすぎて Drizzle の存在意義が薄れたら Atlas や Sqitch への移行を検討

---

## 4. ORM vs Query Builder（Drizzle）

### 4.1 推奨：Drizzle ORM（Query Builder 寄りモード）

§3 と一体。Drizzle の魅力は「SQL に近い API + 完全な TS 型推論 + PostGIS の生 SQL 埋め込みが自然」の3点。

### 4.2 スキーマ定義例

```typescript
// packages/db/schema/articles.ts
import { pgTable, uuid, text, integer, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { customType, sql } from 'drizzle-orm';
import { users } from './users';
import { cities } from './cities';

export const articleStatus = pgEnum('article_status', ['draft', 'published', 'archived']);

export const articles = pgTable('articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  writerId: uuid('writer_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  cityId: uuid('city_id').notNull().references(() => cities.id),
  title: text('title').notNull(),
  body: text('body').notNull(),                  // markdown / 軽量 JSON
  coverImageUrl: text('cover_image_url'),
  priceJpy: integer('price_jpy').notNull(),
  status: articleStatus('status').notNull().default('draft'),
  tags: text('tags').array().notNull().default(sql`ARRAY[]::text[]`),
  durationType: text('duration_type'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byCityPublished: index('idx_articles_city_published').on(t.cityId, t.publishedAt),
  byWriter: index('idx_articles_writer').on(t.writerId, t.publishedAt),
}));

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
```

### 4.3 PostGIS 型のカスタム定義

```typescript
// packages/db/schema/_geometry.ts
import { customType } from 'drizzle-orm/pg-core';

export const point = customType<{ data: { lng: number; lat: number }; driverData: string }>({
  dataType() { return 'geometry(Point,4326)'; },
  toDriver(value) { return `SRID=4326;POINT(${value.lng} ${value.lat})`; },
  fromDriver(value) {
    // PostGIS は EWKB hex を返す。簡略化のためサーバ側で ST_AsGeoJSON にしてキャストする運用も可
    return parseEwkbPoint(value);
  },
});
```

### 4.4 PostGIS 生 SQL との共存パターン

「ビューポート内の記事」のような地理クエリは Drizzle の `sql` テンプレートで安全に書ける：

```typescript
// apps/api/src/modules/articles/articles.repository.ts
import { db } from '@locore/db/client';
import { articles, spots } from '@locore/db/schema';
import { sql, eq, and, inArray } from 'drizzle-orm';

export async function findArticlesInBoundingBox(
  bbox: { swLng: number; swLat: number; neLng: number; neLat: number },
  cityId: string
) {
  const articleIds = await db
    .select({ id: articles.id })
    .from(articles)
    .innerJoin(spots, eq(spots.articleId, articles.id))
    .where(and(
      eq(articles.cityId, cityId),
      eq(articles.status, 'published'),
      sql`ST_MakeEnvelope(${bbox.swLng}, ${bbox.swLat}, ${bbox.neLng}, ${bbox.neLat}, 4326)
          && ${spots.location}`,
    ))
    .groupBy(articles.id)
    .limit(200);

  return articleIds;
}

// 「半径500m以内のスポット」
export async function findSpotsNearby(lat: number, lng: number, radiusMeters: number) {
  return db.execute(sql`
    SELECT id, name, ST_X(location::geometry) AS lng, ST_Y(location::geometry) AS lat,
           ST_Distance(location::geography, ST_MakePoint(${lng}, ${lat})::geography) AS distance_m
    FROM spots
    WHERE ST_DWithin(
      location::geography,
      ST_MakePoint(${lng}, ${lat})::geography,
      ${radiusMeters}
    )
    ORDER BY distance_m ASC
    LIMIT 50
  `);
}
```

複雑な空間集計（観光客密度ヒートマップ）は **DB View** に押し込み、アプリ側は単純な SELECT にする：

```sql
-- packages/db/manual/005_views.sql
CREATE MATERIALIZED VIEW tourist_density_grid AS
SELECT
  ST_SnapToGrid(location::geometry, 0.001) AS cell,
  city_id,
  COUNT(*) FILTER (WHERE category = 'tourist_hot') AS hot_count,
  COUNT(*) FILTER (WHERE category = 'local') AS local_count
FROM spots
GROUP BY 1, 2;

CREATE INDEX idx_density_cell ON tourist_density_grid USING GIST (cell);

-- 1日1回 BullMQ で REFRESH MATERIALIZED VIEW
```

### 4.5 Repository パターンの是非

NestJS では Service にビジネスロジック、Repository に Drizzle クエリ。「Drizzle は薄いのでそのまま Service に書く」も可能だが、テスタビリティと PostGIS クエリの可読性のために **重要なクエリだけ Repository に切り出す**のが Locore の落としどころ：

```typescript
// apps/api/src/modules/articles/articles.service.ts
@Injectable()
export class ArticlesService {
  constructor(
    private readonly repo: ArticlesRepository,
    private readonly search: AlgoliaService,
    private readonly mod: ModerationService,
  ) {}

  async publish(input: PublishInput, user: User) {
    const article = await this.repo.markPublished(input.id, user.id);
    await this.search.index(article);
    await this.mod.evaluate(article);
    return article;
  }
}
```

### 4.6 Supabase RLS との整合

Drizzle のクライアントは **service role 用と anon 用を分ける**：

```typescript
// packages/db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Backend (NestJS) 用：service role、RLS バイパス
export const db = drizzle(postgres(process.env.DATABASE_URL!, { prepare: false }));

// Edge / RSC 用：anon、RLS 有効
export function dbForUser(jwt: string) {
  const client = postgres(process.env.SUPABASE_DB_URL!, {
    prepare: false,
    connection: {
      // PostgREST と同じ要領で JWT を session に注入する場合
      // 実運用では @supabase/supabase-js を使う方が無難
    },
  });
  return drizzle(client);
}
```

実装方針：**フロントから直接 DB を叩かない**。RLS は二重防御として残すが、アプリの主たる認可は API ゲートウェイで行う。これは「Supabase を将来別 Postgres に移しても壊れない」設計のため。

### 4.7 代替案

| 案 | 評価 |
|----|----|
| **Prisma** | DX は最高クラス。だが PostGIS / 配列 / カスタム型で `$queryRaw` 多用になり Drizzle と差別化されない。生成クライアントの起動オーバーヘッドも気になる |
| **Kysely** | 純 Query Builder、TS 型推論強力。Drizzle と非常に近いが、スキーマ定義から型を導出する仕組みが弱く、外部の型生成ツールを併用する必要がある |
| **生 SQL + node-postgres + zod** | 最大の柔軟性、ロックインゼロ。だが日常的な CRUD で boilerplate 多すぎ、少人数チームでは時間損失 |
| **TypeORM** | レガシー、メンテ熱量低下、TS 型推論が弱い。選ばない |
| **Supabase JS SDK 直接** | フロントからの利用は便利だが、バックエンドで使うには表現力が足りない |

### 4.8 トレードオフ

- **得るもの**：TS で完結する型安全 CRUD、PostGIS 生 SQL の自然な埋め込み、Postgres 中立性
- **失うもの**：Prisma の Studio や migrate UX には及ばない、`customType` の手書きが必要な場面あり
- **逃げ道**：Drizzle が嫌になっても、スキーマ定義を Kysely か生 SQL に置き換えるだけで Postgres 互換は保たれる

---

## 5. テスト戦略

### 5.1 ピラミッド全体像

```
                    [E2E: Playwright]              5%（ユーザー Critical Path のみ）
                  /                  \
              [Integration: Supertest + Vitest]    20%
            /                                       \
        [Component: Vitest + Testing Library + RTL]  30%
      /                                               \
  [Unit: Vitest（純関数 + Service ロジック）]         45%
```

### 5.2 ツール選定

| 層 | ツール | 採用理由 |
|----|----|----|
| Unit / Integration | **Vitest** | Jest より速い、ESM ネイティブ、Vite 共有設定、TS 型エラーがすぐ出る |
| Component | **Vitest + Testing Library + jsdom** | RSC を含むコンポーネントは E2E に寄せる、Client Component は jsdom |
| Backend HTTP | **Vitest + Supertest（NestJS Test Module）** | NestJS 標準、DI コンテナを丸ごと差し替えられる |
| E2E | **Playwright** | クロスブラウザ、Codegen、Trace Viewer、CI 安定性 |
| Component カタログ | **Storybook 8** | 視覚的レビュー、デザインシステムの真実の源 |
| 視覚回帰 | **Chromatic（Storybook 連携）** | M3 まで導入見送り、M3 以降に有償化 |
| API Mock | **MSW (Mock Service Worker)** | ブラウザ・Node・Storybook で同じハンドラを共有 |

### 5.3 カバレッジ目標

| 対象 | 目標 | 強制 |
|----|----|----|
| `packages/shared`（純粋ロジック：価格計算・手数料計算・距離計算） | 90%+ | CI でしきい値割れたら fail |
| `apps/api/src/modules/*/`*.service.ts* | 75%+ | しきい値割れは PR に警告コメント |
| `apps/web` 全体 | 数値目標なし | カバレッジ計測のみ |
| `packages/ui` | スナップショット + Storybook ストーリー必須 | ストーリーの無いコンポーネントはマージ拒否 |

カバレッジを **数値より「重要なロジックが落ちていないこと」** で運用する。`pricing.ts`（価格段階・手数料率）、`reviews/aggregation.ts`（レビューの外れ値検知）、`payouts/calculation.ts`（月次精算）は 100% 必須として明文化。

### 5.4 ディレクトリ規約

```
apps/api/src/modules/articles/
├── articles.service.ts
├── articles.service.spec.ts        # ユニットテスト、依存は手動モック or vi.mock
├── articles.controller.spec.ts     # NestJS Test Module + Supertest
└── __fixtures__/
    └── articles.fixtures.ts

apps/web/src/components/article-card/
├── article-card.tsx
├── article-card.test.tsx           # Testing Library、SSR-safe
└── article-card.stories.tsx        # Storybook

apps/web/e2e/
├── critical-paths/
│   ├── reader-purchase.spec.ts     # 旅行者：閲覧→購入→閲覧
│   ├── writer-publish.spec.ts      # 書き手：作成→公開→Algolia 反映
│   └── trip-export.spec.ts         # 旅程→Google Maps エクスポート
└── auth/
    └── signup.spec.ts
```

### 5.5 Critical Path E2E（ローンチに必須なものだけ）

E2E は **遅く・壊れやすい**ので、Locore では以下5本だけを Production blocking とする：

1. **新規ユーザー登録 → メール認証 → ログイン**
2. **記事一覧表示 → 記事詳細プレビュー → 購入（Stripe Test Mode）→ 全文表示**
3. **書き手：下書き作成 → スポット追加 → 公開申請 → 公開反映**
4. **旅程作成 → スポット追加 → 並べ替え → Google Maps URL 生成（クリックは検証しない、URL のクエリのみ assert）**
5. **検索（Algolia）→ フィルタ適用 → マップビュー切替**

副次パス（レビュー投稿、SNS 連携、編集者特集）は **Production blocking にしない**。Preview デプロイで自動実行、失敗しても merge できるが Slack に通知。

### 5.6 NestJS のテスト例

```typescript
// apps/api/src/modules/articles/articles.service.spec.ts
import { Test } from '@nestjs/testing';
import { ArticlesService } from './articles.service';
import { ArticlesRepository } from './articles.repository';
import { AlgoliaService } from '../search/algolia.service';

describe('ArticlesService.publish', () => {
  it('未認証ユーザーで他人の記事は公開できない', async () => {
    const module = await Test.createTestingModule({
      providers: [
        ArticlesService,
        { provide: ArticlesRepository, useValue: { markPublished: vi.fn() } },
        { provide: AlgoliaService, useValue: { index: vi.fn() } },
      ],
    }).compile();

    const svc = module.get(ArticlesService);
    await expect(
      svc.publish({ id: 'art_1' }, { id: 'user_other', tier: 'A' } as any)
    ).rejects.toThrow(/forbidden/i);
  });
});
```

```typescript
// apps/api/src/modules/articles/articles.controller.spec.ts (Supertest)
describe('POST /articles/:id/publish', () => {
  it('Tier B は ¥1,000 を超える価格で公開できない', async () => {
    await app.inject({
      method: 'POST',
      url: '/articles/art_1/publish',
      headers: authAs('writer_b'),
      payload: { priceJpy: 1500 },
    }).then((r) => {
      expect(r.statusCode).toBe(422);
      expect(r.json().code).toBe('TIER_PRICE_EXCEEDED');
    });
  });
});
```

### 5.7 Playwright 例

```typescript
// apps/web/e2e/critical-paths/reader-purchase.spec.ts
test('旅行者が記事を購入して全文を読める', async ({ page }) => {
  await loginAs(page, 'reader@e2e.locore.app');
  await page.goto('/articles/marais-hidden-3');

  await expect(page.getByTestId('preview-fade')).toBeVisible();
  await page.getByRole('button', { name: '購入する ¥800' }).click();

  // Stripe Checkout Test Mode
  const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
  await stripeFrame.locator('[name="cardnumber"]').fill('4242 4242 4242 4242');
  await stripeFrame.locator('[name="exp-date"]').fill('12 / 34');
  await stripeFrame.locator('[name="cvc"]').fill('123');
  await page.getByRole('button', { name: '支払う' }).click();

  await page.waitForURL('**/articles/marais-hidden-3?purchased=1');
  await expect(page.getByTestId('full-body')).toBeVisible();
  await expect(page.getByTestId('spot-pin').first()).toBeVisible();
});
```

### 5.8 CI 実行戦略

| トリガ | 走らせるテスト | 並列度 |
|----|----|----|
| PR open / push | lint + typecheck + unit + 影響パッケージの component | 4 shards |
| PR (`apps/web` 変更) | ↑ + Playwright Critical Path（Chromium のみ） | 2 shards |
| PR (`packages/db` 変更) | ↑ + drizzle-kit check + RLS ポリシーテスト | - |
| `main` push | 全テスト + Playwright（Chromium + WebKit） | 4 shards |
| 夜間 cron | Playwright（全ブラウザ + flaky 検出）+ Lighthouse + a11y axe | - |
| Release tag | E2E against staging | - |

`turbo.json` でキャッシュキー化し、無関係パッケージのテストはスキップ。

### 5.9 VRT（視覚回帰テスト）の導入タイミング

| Phase | VRT 導入度 |
|----|----|
| Phase 1（M0-6） | 導入しない。Storybook ストーリーは書くがスナップショット比較なし |
| M3-6（記事数 100→300） | Chromatic を `packages/ui` のみに導入。primitives と compound 30 components |
| M6-12（記事数 300→1,000） | Chromatic を `apps/web` の主要ページ（フィード・記事詳細・マップ）まで拡大 |
| Phase 3（英語追加） | i18n ロケール別 VRT を必須化。日英両方で崩れがないか自動検出 |

理由：VRT はメンテコストが大きく、デザイン変動の激しい初期は false-positive まみれになる。デザイントークンが固まる M3 以降が現実的。

### 5.10 トレードオフ

- **得るもの**：少人数でも回帰が起きにくい、デプロイ前の信頼性、Storybook をデザイン議論のキャンバスに
- **失うもの**：E2E のメンテに毎週数時間、Storybook 維持コスト、初期はテストを書くより機能を作る方が ROI 高い局面あり
- **失敗のシグナル**：Critical Path E2E が flaky で merge ブロックが日常化したら、retries や test impact analysis を入れる

---

## 6. デザインシステム実装

### 6.1 推奨：shadcn/ui ベース + 独自デザイントークン + Tailwind v3.4 preset

shadcn/ui を「コピペ起点」として `packages/ui/primitives/` 配下に取り込み、Locore のブランド（モダン・洗練・暗くなりすぎない・控えめなプレミアム感）に合わせて改修する。

### 6.2 デザイントークン構成

CSS Variables で OKLCH ベース、Tailwind preset 経由で参照：

```css
/* packages/ui/tokens/tokens.css */
:root {
  /* === Brand: Locore Sand & Forest === */
  /* 「現地民が語る土地の物語」を象徴する、紙とインク + 旅先の自然 */

  /* Neutral（紙とインク：明るめのオフホワイト） */
  --paper-50:  oklch(99% 0.005 80);   /* #FDFCF9  カード背景 */
  --paper-100: oklch(97% 0.008 80);   /* #F8F5EE  ベース背景 */
  --paper-200: oklch(94% 0.010 80);   /* #ECE7DA  分割線 */
  --paper-300: oklch(88% 0.012 80);   /* #DAD2BF  控えめ枠 */
  --paper-500: oklch(60% 0.015 80);   /* #948A75  サブテキスト */
  --paper-700: oklch(36% 0.018 80);   /* #4F4838  本文テキスト */
  --paper-900: oklch(20% 0.020 80);   /* #2A2618  見出し */

  /* Primary（Forest Green：旅・自然・落ち着き） */
  --forest-50:  oklch(96% 0.020 160);
  --forest-100: oklch(91% 0.040 160);
  --forest-300: oklch(75% 0.080 160);
  --forest-500: oklch(56% 0.110 160);  /* #3F8765  Primary */
  --forest-600: oklch(48% 0.115 160);  /* #2E6E51  Hover */
  --forest-700: oklch(40% 0.110 160);
  --forest-900: oklch(25% 0.080 160);

  /* Accent（Terracotta：パリ屋根・温度感） */
  --terracotta-300: oklch(80% 0.080 40);
  --terracotta-500: oklch(64% 0.140 40);  /* #C77757  購入CTA */
  --terracotta-700: oklch(48% 0.130 40);

  /* Semantic */
  --signal-positive: oklch(62% 0.130 150);  /* レビュー★ */
  --signal-warning:  oklch(75% 0.140 80);
  --signal-danger:   oklch(55% 0.180 25);
  --signal-info:     oklch(60% 0.110 230);

  /* Local Score Gradient（マップピンと連動） */
  --local-cool:   oklch(60% 0.120 230);  /* 青：ローカル */
  --local-mid:    oklch(60% 0.110 290);  /* 紫：中間 */
  --local-warm:   oklch(70% 0.140 50);   /* オレンジ：定番 */

  /* === Spacing scale (4px base, 一部 6/10) === */
  --space-0: 0;
  --space-1: 0.25rem;   /* 4 */
  --space-2: 0.5rem;    /* 8 */
  --space-3: 0.75rem;   /* 12 */
  --space-4: 1rem;      /* 16 */
  --space-5: 1.5rem;    /* 24 */
  --space-6: 2rem;      /* 32 */
  --space-7: 3rem;      /* 48 */
  --space-8: 4rem;      /* 64 */
  --space-9: 6rem;      /* 96 */

  /* === Radii === */
  --radius-sm: 0.375rem;
  --radius-md: 0.625rem;
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;
  --radius-pill: 999px;

  /* === Elevation（控えめ、影は柔らかく） === */
  --shadow-sm: 0 1px 2px 0 oklch(20% 0.020 80 / 0.05);
  --shadow-md: 0 4px 12px -4px oklch(20% 0.020 80 / 0.08);
  --shadow-lg: 0 12px 32px -8px oklch(20% 0.020 80 / 0.10);

  /* === Typography === */
  --font-jp-sans: "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif;
  --font-jp-serif: "Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", serif;
  --font-latin-sans: "Inter", "Helvetica Neue", system-ui, sans-serif;
  --font-latin-display: "Fraunces", "Times New Roman", serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* タイポスケール（perfect-fourth 1.333、最小14） */
  --text-xs:   0.75rem;    /* 12 caption */
  --text-sm:   0.875rem;   /* 14 sub */
  --text-base: 1rem;       /* 16 body */
  --text-md:   1.125rem;   /* 18 lead */
  --text-lg:   1.333rem;   /* 21 h4 */
  --text-xl:   1.777rem;   /* 28 h3 */
  --text-2xl:  2.369rem;   /* 38 h2 */
  --text-3xl:  3.157rem;   /* 51 h1 */

  --line-tight: 1.25;
  --line-snug:  1.4;
  --line-normal: 1.6;
  --line-relaxed: 1.75;   /* 日本語本文 */

  /* === Motion === */
  --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-slow: 360ms;
}

[data-theme='dark'] {
  /* Phase 2 で dark mode 検討、tokens の上書きのみで実現 */
}
```

### 6.3 Tailwind preset

```typescript
// packages/ui/tailwind.preset.ts
import type { Config } from 'tailwindcss';

export default {
  theme: {
    extend: {
      colors: {
        paper: {
          50: 'var(--paper-50)', 100: 'var(--paper-100)', 200: 'var(--paper-200)',
          300: 'var(--paper-300)', 500: 'var(--paper-500)', 700: 'var(--paper-700)', 900: 'var(--paper-900)',
        },
        forest: {
          50: 'var(--forest-50)', 100: 'var(--forest-100)', 300: 'var(--forest-300)',
          500: 'var(--forest-500)', 600: 'var(--forest-600)', 700: 'var(--forest-700)', 900: 'var(--forest-900)',
        },
        terracotta: {
          300: 'var(--terracotta-300)', 500: 'var(--terracotta-500)', 700: 'var(--terracotta-700)',
        },
        signal: {
          positive: 'var(--signal-positive)',
          warning: 'var(--signal-warning)',
          danger: 'var(--signal-danger)',
          info: 'var(--signal-info)',
        },
        local: {
          cool: 'var(--local-cool)', mid: 'var(--local-mid)', warm: 'var(--local-warm)',
        },
      },
      spacing: {
        1: 'var(--space-1)', 2: 'var(--space-2)', 3: 'var(--space-3)', 4: 'var(--space-4)',
        5: 'var(--space-5)', 6: 'var(--space-6)', 7: 'var(--space-7)', 8: 'var(--space-8)', 9: 'var(--space-9)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)', pill: 'var(--radius-pill)',
      },
      fontFamily: {
        sans: ['var(--font-jp-sans)', 'var(--font-latin-sans)'],
        serif: ['var(--font-jp-serif)', 'var(--font-latin-display)'],
        display: ['var(--font-latin-display)', 'var(--font-jp-serif)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        xs: ['var(--text-xs)',   { lineHeight: 'var(--line-snug)' }],
        sm: ['var(--text-sm)',   { lineHeight: 'var(--line-snug)' }],
        base: ['var(--text-base)', { lineHeight: 'var(--line-relaxed)' }],
        md: ['var(--text-md)',   { lineHeight: 'var(--line-relaxed)' }],
        lg: ['var(--text-lg)',   { lineHeight: 'var(--line-snug)' }],
        xl: ['var(--text-xl)',   { lineHeight: 'var(--line-snug)' }],
        '2xl': ['var(--text-2xl)', { lineHeight: 'var(--line-tight)', letterSpacing: '-0.01em' }],
        '3xl': ['var(--text-3xl)', { lineHeight: 'var(--line-tight)', letterSpacing: '-0.02em' }],
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)',
      },
    },
  },
} satisfies Partial<Config>;
```

### 6.4 タイポグラフィ：日本語＋欧文の組み合わせ

| 用途 | フォント | フォールバック | 理由 |
|----|----|----|----|
| 本文（日本語） | **Noto Sans JP** 400/500 | Hiragino Kaku Gothic ProN, Yu Gothic | 視認性、Google Fonts 配信、可変フォント |
| 見出し（プレミアム感） | **Shippori Mincho B1** 500/700 | Hiragino Mincho, Yu Mincho | 旅・上質メディア感、明朝で「映え反対」のトーン |
| 数字・欧文 | **Inter** 400/500/600 | Helvetica Neue, system-ui | 数字の表情が良い、tabular-nums 対応 |
| 装飾見出し（特集タイトルなど） | **Fraunces** italic 700 | Times New Roman | エディトリアルな雰囲気、可変フォントで太さ調整 |
| コード | **JetBrains Mono** | ui-monospace | ヘルプ・FAQ 等で使用 |

`next/font` でセルフホスト：

```typescript
// apps/web/src/app/fonts.ts
import { Noto_Sans_JP, Shippori_Mincho_B1, Inter, Fraunces } from 'next/font/google';

export const notoJp = Noto_Sans_JP({
  subsets: ['latin'], weight: ['400', '500', '700'],
  variable: '--font-jp-sans', display: 'swap',
});
export const shippori = Shippori_Mincho_B1({
  subsets: ['latin'], weight: ['500', '700'],
  variable: '--font-jp-serif', display: 'swap',
});
export const inter = Inter({
  subsets: ['latin'], variable: '--font-latin-sans', display: 'swap',
});
export const fraunces = Fraunces({
  subsets: ['latin'], style: ['normal', 'italic'],
  variable: '--font-latin-display', display: 'swap',
});
```

```tsx
// apps/web/src/app/layout.tsx
<html lang="ja" className={`${notoJp.variable} ${shippori.variable} ${inter.variable} ${fraunces.variable}`}>
```

日本語特有の組版調整：

```css
/* packages/ui/tokens/typography.css */
:lang(ja) {
  font-feature-settings: "palt" 1;   /* 詰め組 */
  text-spacing-trim: trim-start;
}
.body-prose {
  text-align: justify;
  text-justify: inter-character;
  word-break: keep-all;
  overflow-wrap: anywhere;
  line-height: var(--line-relaxed);
}
```

### 6.5 コンポーネント命名規則

| 階層 | 場所 | 命名 | 例 |
|----|----|----|----|
| **Primitive** | `packages/ui/primitives/` | shadcn 系の薄い wrap、汎用 | `Button`, `Input`, `Dialog`, `Tooltip`, `Badge` |
| **Compound** | `packages/ui/compounds/` | Locore ドメインに紐づく組合せ | `ArticleCard`, `LocalScoreBar`, `TierBadge`, `SpotPin`, `PriceTag` |
| **Pattern** | `apps/web/src/components/` | ページ寄り、再利用しない可能性あり | `ArticleEditorToolbar`, `TripDayPanel` |
| **Page** | `apps/web/src/app/**/page.tsx` | App Router 規約 | - |

ファイル名は `kebab-case`、コンポーネント名は `PascalCase`、props 型は `<Component>Props`：

```
packages/ui/compounds/article-card/
├── article-card.tsx
├── article-card.stories.tsx
├── article-card.test.tsx
├── article-card.types.ts        # ArticleCardProps 等
└── index.ts                      # re-export
```

`data-locore-*` プロパティを命名のヒントに：

```tsx
<button data-locore-component="Button" data-locore-variant="primary" data-locore-size="md">
```

E2E が `data-testid` ではなく `data-locore-component` で要素特定できる。

### 6.6 Storybook 構成

```
.storybook/
├── main.ts          # @storybook/react-vite
├── preview.tsx      # フォント・テーマ・i18n プロバイダ
└── decorators/
    ├── with-theme.tsx
    ├── with-i18n.tsx
    └── with-router.tsx
```

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../packages/ui/**/*.stories.@(ts|tsx)',
    '../apps/web/src/components/**/*.stories.@(ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
    'storybook-addon-pseudo-states',
    '@storybook/addon-viewport',
  ],
  framework: { name: '@storybook/react-vite', options: {} },
  docs: { autodocs: 'tag' },
};
export default config;
```

ストーリーのテンプレート：

```tsx
// packages/ui/compounds/article-card/article-card.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ArticleCard } from './article-card';

const meta: Meta<typeof ArticleCard> = {
  title: 'Compounds/ArticleCard',
  component: ArticleCard,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof ArticleCard>;

export const Default: Story = {
  args: {
    title: 'マレ地区で観光客がいない3軒',
    coverUrl: '/fixtures/marais.jpg',
    writer: { name: 'Junko', tier: 'S', residencyYears: 8 },
    localScore: 65,
    satisfaction: 4.7,
    reviewCount: 41,
    priceJpy: 800,
  },
};
export const Premium: Story = {
  args: { ...Default.args, priceJpy: 3000, writer: { ...Default.args!.writer!, tier: 'S' } },
};
export const LongTitle: Story = {
  args: { ...Default.args, title: '雨の日のパリで小さなビストロを5軒巡る半日コース' },
};
```

### 6.7 アクセシビリティ要件（WCAG 2.1 AA）

- すべての primitive に Radix UI ベース（shadcn/ui の標準）
- カラーコントラスト：本文 7:1 以上、UI 要素 4.5:1 以上 — トークン段階で `oklch` 計算済み
- フォーカスリング：`focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2`
- `prefers-reduced-motion` を全アニメーションで尊重
- Storybook の addon-a11y で CI に axe を組み込み、PR で違反検出

### 6.8 代替案

| 案 | 評価 |
|----|----|
| **MUI / Chakra UI** | 完成度高いがブランド独自性を出しにくい、バンドルサイズ大 |
| **Mantine** | Hooks も豊富で良いが、shadcn の「自前所有」モデルの方が長期的に強い |
| **Park UI / Ark UI** | 新興、shadcn と思想は近いが Radix のエコシステム強度に及ばない |
| **完全自作** | 数ヶ月遅れる、ROI 悪い |

### 6.9 トレードオフ

- **得るもの**：所有感のあるデザインシステム、剥がせない依存ゼロ、テーマ拡張容易
- **失うもの**：primitive のメンテをチームで持つ必要（shadcn は「コピペした瞬間あなたのコード」）
- **将来**：Phase 2 で dark mode 検討、Phase 3 で英語ロケール時のフォントスタック切替

---

## 7. i18n 初期準備

### 7.1 推奨：next-intl + JSON フラット構成 + 翻訳キーの型生成

Phase 1 は日本語のみだが、**ファイル構成・URL 設計・翻訳キーの型化**を最初から多言語前提で組む。Phase 3 で英語追加時に「構造を作り直す」を避ける。

### 7.2 next-intl を選ぶ理由

| 観点 | next-intl | next-i18next | i18next（直接） |
|----|----|----|----|
| App Router 対応 | ◎ ファーストクラス | △ Pages Router 中心 | ○ |
| RSC との親和性 | ◎ Server Component で `getTranslations()` | × | △ |
| 中間言語ファイル | JSON / 階層自由 | JSON | JSON |
| ICU MessageFormat | ◎ 標準サポート | ○ プラグイン | ○ プラグイン |
| Locale routing | `[locale]` セグメント自動 | 自動 | 手動 |
| バンドルサイズ | 小 | 中 | 中 |
| Phase 1 のフィット | ◎ | × | △ |

App Router を採用している以上、next-intl 一択。

### 7.3 URL 設計

| 状態 | URL 例 | 備考 |
|----|----|----|
| Phase 1（ja のみ） | `locore.app/articles/marais-3` | locale prefix なし、内部的には `ja` |
| Phase 3（en 追加） | `locore.app/articles/marais-3` (= ja, default) | デフォルトロケールはプレフィックスなし |
| | `locore.app/en/articles/marais-3` | 英語版は `/en` プレフィックス |
| | `locore.app/en/cities/paris` | |

next-intl の `localePrefix: 'as-needed'` 設定でこれを実現。Phase 1 から内部的に locale segment を持つことで、Phase 3 の追加が「設定変更1行 + 翻訳ファイル投入」で済む。

### 7.4 ディレクトリ構成

```
apps/web/
├── src/
│   ├── i18n/
│   │   ├── routing.ts            # locales, defaultLocale, pathnames
│   │   ├── request.ts            # getRequestConfig
│   │   └── messages-loader.ts    # split-by-namespace 動的 import
│   ├── middleware.ts             # next-intl middleware
│   └── app/
│       ├── [locale]/             # ※ Phase 1 から導入
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── articles/
│       │   ├── trips/
│       │   └── ...
│       └── api/                  # locale 不要のルート
│
packages/i18n/
├── locales/
│   ├── ja/
│   │   ├── common.json
│   │   ├── article.json
│   │   ├── purchase.json
│   │   ├── trip.json
│   │   ├── auth.json
│   │   └── errors.json
│   └── en/                       # Phase 3 で投入、空欄でも構造だけ用意
│       ├── common.json
│       └── ...
├── keys.ts                        # 翻訳キーの型自動生成
├── scripts/
│   ├── generate-keys.ts          # ja のキーから TS 型生成
│   └── check-missing.ts          # ja と en の差分検査
└── package.json
```

### 7.5 設定ファイル

```typescript
// apps/web/src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ja', 'en'],
  defaultLocale: 'ja',
  localePrefix: 'as-needed',         // ja は prefix なし、en は /en
  pathnames: {
    '/': '/',
    '/articles': '/articles',
    '/articles/[slug]': '/articles/[slug]',
    '/cities/[city]': '/cities/[city]',
    '/trips': '/trips',
    // Phase 3 で日本語と英語で URL slug を分けたい場合：
    // '/articles': { ja: '/kiji', en: '/articles' }
  },
});
```

```typescript
// apps/web/src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: {
      ...(await import(`@locore/i18n/locales/${locale}/common.json`)).default,
      article:  (await import(`@locore/i18n/locales/${locale}/article.json`)).default,
      purchase: (await import(`@locore/i18n/locales/${locale}/purchase.json`)).default,
      trip:     (await import(`@locore/i18n/locales/${locale}/trip.json`)).default,
      auth:     (await import(`@locore/i18n/locales/${locale}/auth.json`)).default,
      errors:   (await import(`@locore/i18n/locales/${locale}/errors.json`)).default,
    },
    timeZone: locale === 'ja' ? 'Asia/Tokyo' : 'Europe/Paris',
    now: new Date(),
  };
});
```

### 7.6 翻訳ファイルの粒度

ファイル分割は **画面単位ではなくドメイン単位**：

```json
// packages/i18n/locales/ja/article.json
{
  "card": {
    "localScore": "ローカル度",
    "satisfaction": "満足度",
    "reviewCount": "{count, plural, =0 {レビューなし} one {# 件のレビュー} other {# 件のレビュー}}",
    "priceFromYen": "¥{amount, number}",
    "addToTrip": "旅程に追加"
  },
  "preview": {
    "fadeNotice": "続きを読むには購入してください",
    "spotsCount": "{count} スポットを紹介"
  },
  "tier": {
    "S": "認証クリエイター",
    "A": "居住確認済",
    "B": ""
  },
  "publish": {
    "minLength": "本文は最低 500 文字以上を推奨します（現在 {count} 文字）",
    "tooFewSpots": "スポットを最低 1 つ追加してください"
  }
}
```

ICU MessageFormat（複数形・性数・選択）を最初から使う。日本語は複数形が無いが、英語投入時に既存キーを変えずに済む。

### 7.7 翻訳キーの型生成

```typescript
// packages/i18n/scripts/generate-keys.ts
import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';

const namespaces = glob.sync('locales/ja/*.json');
const types: string[] = [];

for (const file of namespaces) {
  const ns = path.basename(file, '.json');
  const json = JSON.parse(fs.readFileSync(file, 'utf-8'));
  types.push(`export interface ${capitalize(ns)}Messages ${stringifyAsType(json)}`);
}

fs.writeFileSync('keys.ts', `/* AUTO-GENERATED, do not edit */\n${types.join('\n\n')}`);
```

これで `useTranslations('article.card')` の `t('localScore')` がキー存在チェックされる。

CI で `pnpm --filter @locore/i18n check` を走らせ、`ja` にあって `en` に無いキーを検出する：

```typescript
// packages/i18n/scripts/check-missing.ts
const ja = collectKeys('locales/ja');
const en = collectKeys('locales/en');
const missing = ja.filter((k) => !en.includes(k));
if (missing.length > 0 && process.env.CI) {
  // Phase 1: warn のみ
  // Phase 3 直前: error に切替
  console.warn(`Missing en translations: ${missing.length} keys`);
}
```

### 7.8 翻訳プラットフォーム

| Phase | 運用 |
|----|----|
| Phase 1 (ja のみ) | 自前 JSON、`packages/i18n/locales/ja/` で PR レビュー |
| Phase 2 (UI コピー量増) | 自前のまま、Notion で翻訳メモを並行管理 |
| Phase 3 直前（英語追加準備） | **Crowdin** を導入。GitHub 連携で `locales/en/` を自動 PR で更新 |
| Phase 3 以降（多言語化本格） | Crowdin 継続、書き手の母語 UI（中国語簡体・繁体・韓国語）も視野 |

Crowdin を選ぶ理由：

- GitHub 統合が成熟、`crowdin.yml` で `packages/i18n/locales/ja/**/*.json` をソース指定
- ICU MessageFormat ネイティブサポート
- 価格は OSS / Startup プログラムあり
- Lokalise も同等だが、Crowdin の方が日本語コミュニティ翻訳と親和性高い実績

**Phase 1 では Crowdin は導入しない**。MAU 1,000 まではキー数も少なく、ローカルでメンテする方が速い。

### 7.9 ドメインデータの多言語化（記事・スポット）

UI コピーと **記事本文** を区別する：

| 種別 | ストア | 多言語化方針 |
|----|----|----|
| UI コピー（ボタン・ラベル） | `packages/i18n/` JSON | next-intl |
| 記事本文 | `articles.body` (DB) | **Phase 1 は日本語のみ、書き手は日本語で書く**。Phase 3 で「英語版を書き手が任意で投稿」を許可する設計に拡張可能 |
| スポット名・住所 | `spots.name`, `spots.address` | Phase 1 は日本語＋現地表記の混在を許容、`name_ja` / `name_local` 列を持つ |
| 都市名 | `cities.name_ja`, `cities.name_en` | M0 から多言語列を持つ |
| エディトリアル特集 | `editor_collections` | Phase 3 で `title_i18n JSONB` 列に拡張 |

スキーマの拡張余地：

```typescript
// packages/db/schema/cities.ts
export const cities = pgTable('cities', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),         // 'paris'
  nameJa: text('name_ja').notNull(),             // 'パリ'
  nameEn: text('name_en').notNull(),             // 'Paris'
  nameLocal: text('name_local').notNull(),       // 'Paris' (現地語)
  country: text('country').notNull(),
  // ...
});
```

### 7.10 数値・通貨・日付のロケール対応

`Intl` API を全面採用、フォーマッタは `useFormatter()`：

```tsx
import { useFormatter, useTranslations } from 'next-intl';

export function ArticleCard({ price, publishedAt }: Props) {
  const t = useTranslations('article.card');
  const f = useFormatter();
  return (
    <div>
      <span>{f.number(price, { style: 'currency', currency: 'JPY' })}</span>
      <time>{f.relativeTime(publishedAt)}</time>
      <p>{t('reviewCount', { count: 41 })}</p>
    </div>
  );
}
```

通貨表示は **JPY 基軸**だが、書き手向けの売上表示は将来 EUR / USD で見せる設計余地を残す（`writer_profiles.preferred_currency`）。

### 7.11 SEO の hreflang 設定

Phase 1 は `<link rel="alternate" hreflang="ja" />` のみだが、`generateMetadata` で構造を整える：

```tsx
// apps/web/src/app/[locale]/articles/[slug]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await fetchArticle(slug);
  return {
    title: article.title,
    alternates: {
      canonical: `https://locore.app${locale === 'ja' ? '' : '/' + locale}/articles/${slug}`,
      languages: {
        'ja': `https://locore.app/articles/${slug}`,
        // Phase 3 で 'en' 追加
        'x-default': `https://locore.app/articles/${slug}`,
      },
    },
  };
}
```

### 7.12 代替案

| 案 | 評価 |
|----|----|
| **next-i18next** | App Router に未対応、選ばない |
| **i18next 直接 + react-i18next** | 自由度高いが App Router 統合は手作業、next-intl の方が近道 |
| **Lingui** | macro 記法は強力だが学習コスト、エコシステム規模が next-intl に劣る |
| **自前 ContextProvider + JSON** | Phase 1 でも DX 悪化、選ばない |

### 7.13 トレードオフ

- **得るもの**：Phase 3 での英語追加が設定変更レベルで済む、SEO のロケール対応が最初から正しい
- **失うもの**：Phase 1 で `[locale]` セグメントを持つことの軽い複雑さ（middleware 1 行）
- **意思決定の鍵**：「英語を追加する瞬間に作り直す」は Phase 3 の機能開発と被って事故率が高い。最初から構造を整える ROI が大きい

---

## 8. 全クエスチョン横断のまとめ

### 8.1 確定事項一覧

| # | クエスチョン | 確定 |
|---|----|----|
| 1 | モノレポ vs マルチレポ | **pnpm workspace + Turborepo モノレポ** |
| 2 | API 設計 | **内部 tRPC + 外部 REST/OpenAPI** のハイブリッド |
| 3 | マイグレーションツール | **Drizzle Kit + 手書き SQL の `manual/` 並列管理** |
| 4 | ORM | **Drizzle ORM**、PostGIS は `customType` + `sql` テンプレ |
| 5 | テスト戦略 | **Vitest + Playwright + Storybook**、VRT は M3 から段階的 |
| 6 | デザインシステム | **shadcn/ui + Locore tokens (Sand & Forest) + Tailwind preset** |
| 7 | i18n | **next-intl + Phase 1 から `[locale]` セグメント、Crowdin は Phase 3 直前** |

### 8.2 横断する設計原則

- **「Postgres と TS とテストコードが真実の源」**：Supabase / Vercel / Algolia は剥がせる
- **「Phase 3 の入口で構造を作り直さない」**：i18n、検索、決済通貨は最初から国際化前提
- **「DX を犠牲にしない」**：少人数で記事在庫を増やすには書き手も Web も速度が命
- **「2系統メンテを増やすときは ROI を必ず示す」**：tRPC + REST、Drizzle + manual SQL、Storybook + Playwright はすべて理由を持って2系統運用

### 8.3 推奨される導入順序（Day 0 → MVP）

1. **Day 0-3**：モノレポ初期化、`packages/config`、`packages/db` スキーマ初期投入、Drizzle Kit でローカル migrate 動作確認
2. **Day 4-7**：`packages/ui` の primitives 30 components、tokens、Storybook 起動、`packages/i18n` の ja JSON 5 namespace
3. **Day 8-14**：`apps/api` の NestJS + tRPC ルータの最小5 endpoints、`apps/web` の `[locale]` レイアウトと記事一覧ページ
4. **Day 15-21**：Stripe Checkout、Algolia 連携、Critical Path E2E 1本（reader-purchase）
5. **Day 22-28**：CI 整備、Vercel + Railway デプロイ、staging 完成
6. **Day 29-**：機能スプリント開始

---

## 9. オープン項目（本書で残ったもの）

本書では扱わなかったが、Phase 1 着手前に判断が必要な技術側の小さな残課題：

1. **Supabase の Local Dev**：`supabase start` でローカル PostgreSQL を立てるか、独自 Docker Compose にするか。推奨は **独自 Compose**（PostGIS 16-3.4 image を使えるため、Supabase Local の PostGIS バージョン縛りを回避）
2. **Algolia の Index 戦略**：本番・ステージングで Index を分けるか、prefix で分けるか。推奨は **`articles_prod` / `articles_staging` の物理分離**（誤書き込み事故防止）
3. **Stripe 環境分離**：Test / Live のキー切替に加え、staging で Live を使うか Test を使うか。推奨は **staging も Test mode**、本番のみ Live
4. **画像最適化パイプライン**：Cloudflare Images を使うか、`next/image` + R2 直接配信か。推奨は **Cloudflare Images**（変換コスト・帯域込みで安く、複数サイズの自動生成）
5. **PostHog の自前ホスト vs Cloud**：MAU 1万までは Cloud、超えたら EU リージョン Cloud に固定。GDPR 対応は EU リージョンで実現

---

## 10. 改訂履歴

| バージョン | 日付 | 変更内容 | 担当 |
|----|----|----|----|
| 0.1 | 2026-05-05 | 初稿、ARCHITECTURE.md §12 全7項目を確定 | Claude |

---

**END OF DOCUMENT**