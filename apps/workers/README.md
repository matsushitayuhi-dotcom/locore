# @locore/workers

BullMQ ベースのバックグラウンドワーカー。Phase 1 はスケルトンのみで、
ジョブ実装は後続スプリントで追加する。

## 想定キュー

ARCHITECTURE.md §3.2 / §5 に対応：

- `algolia-index` — 記事更新時のインデキシング
- `web-push` — プッシュ通知配信
- `payouts` — 月次精算バッチ
- `fx-rates` — 為替レート更新（時間単位）
- `kyc-cleanup` — 居住認証書類の30日後自動削除

## ローカル開発

```bash
pnpm install
cp apps/workers/.env.example apps/workers/.env
docker run -d -p 6379:6379 redis:7
pnpm --filter @locore/workers dev
```
