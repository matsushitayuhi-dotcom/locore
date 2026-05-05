# @locore/web

Locore のフロントエンド（Next.js 14、App Router、React 18、TypeScript、Tailwind、next-intl）。

## ローカル開発

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @locore/web dev
# → http://localhost:3000
```

## i18n

`next-intl` を採用。Phase 1 は日本語のみで運用。

- `messages/ja.json` に翻訳キーを集約
- `i18n/request.ts` がロケール解決
- 英語追加時は `messages/en.json` を作成し、`SUPPORTED_LOCALES` に追加

## デザインシステム

`@locore/ui`（別エージェント担当）が完成し次第、import コメントアウトを外す。

- `app/globals.css` の `@import '@locore/ui/styles.css';`
- `app/layout.tsx` の `UIProvider`
- `app/page.tsx` の `Button`
- `tailwind.config.ts` の `content` に `packages/ui/src/**`

## デプロイ

Vercel。`vercel.json` でモノレポビルドを設定。
