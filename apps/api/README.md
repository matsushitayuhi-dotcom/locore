# @locore/api

Locore Backend API（NestJS 10、Node 20、TypeScript）。

## ローカル開発

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
# DATABASE_URL 等を埋める
pnpm --filter @locore/api dev
# → http://localhost:3001/health
```

## モジュール

ARCHITECTURE.md §3.2 のモジュール構成に対応。Phase 1 は各モジュールが空スケルトンの状態で、
スプリントごとに実装を埋めていく。

- `auth/` — Supabase Auth と連携、JWT検証
- `users/` — プロフィール、ランク、SNS リンク
- `verifications/` — 居住認証フロー
- `articles/` — 記事 CRUD、公開制御
- `spots/` — スポット情報、地理クエリ
- `purchases/` — 購入処理、Stripe Webhook
- `reviews/` — 評価・レビュー
- `trips/` — 旅程ワークスペース
- `search/` — Algolia インデキシング
- `feed/` — フィード生成、ランキング
- `light-diaries/` — ライト旅行記
- `collections/` — 編集チーム特集
- `crisis/` — クライシス情報
- `payouts/` — 月次精算、Wise/Payoneer連携
- `notifications/` — メール、Web Push
- `moderation/` — AI判定、通報処理
- `analytics/` — 内部メトリクス
- `jobs/` — BullMQ ワーカー

## デプロイ

Railway。`railway.json` のヘルスチェックパスは `/health`。
