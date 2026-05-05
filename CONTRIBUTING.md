# Contributing to Locore

Locore は在外邦人向け旅行記事マーケットプレイス（パリ先行）。
本書はローカル環境のセットアップと、変更を加える際のフローをまとめる。

## 必要なもの

- Node.js **20.x**（`.nvmrc` 参照）
- pnpm **9.x**（`corepack enable && corepack prepare pnpm@9.12.3 --activate` 推奨）
- Docker（ローカル Postgres + Redis 用）
- Git

## 初回セットアップ

```bash
git clone <repo>
cd locore

# Node 20 を有効化
nvm use            # または fnm use / volta install

# 依存インストール
pnpm install

# 環境変数を埋める
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp apps/workers/.env.example apps/workers/.env

# 各種チェック（モノレポ全体）
pnpm typecheck
pnpm lint
pnpm test
```

詳細は [docs/setup.md](./docs/setup.md) を参照。

## モノレポ構成

```
apps/
  web/        # Next.js 14 フロントエンド
  api/        # NestJS バックエンド
  workers/    # BullMQ ワーカー
packages/
  ui/         # デザインシステム（別エージェントが担当）
  shared/     # フレームワーク非依存ロジック
  db/         # Drizzle スキーマ・クライアント
  api-contracts/  # zod + OpenAPI
```

## ブランチ戦略

- `main` — 本番（自動デプロイ）
- `feat/*`、`fix/*`、`chore/*` — 個別作業ブランチ
- PR レビュー → squash merge

## コミットメッセージ

Conventional Commits を推奨：

```
feat(web): 記事一覧ページの追加
fix(api): purchases Webhook の冪等性修正
chore(deps): drizzle 0.36 にアップデート
```

## チェックリスト（PR を出す前に）

- [ ] `pnpm typecheck` が通る
- [ ] `pnpm lint` が通る
- [ ] 影響パッケージのテストを更新
- [ ] スキーマ変更がある場合 `packages/db` のマイグレーションを生成
