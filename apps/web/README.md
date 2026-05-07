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

## 記事編集画面（単画面リニューアル）

`/writer/articles/[id]/edit` は 1 画面スクロール構成（基本情報 + カバー画像 + 本文 + スポット + 動画）。
3 秒 debounce で自動保存し、公開申請の前提条件は赤バッジで指摘される。

### 必要な環境変数

`.env.local` に追加（`.env.example` も参照）：

```
# Google Places Autocomplete（任意）。未設定でもフォールバックで手動入力可能
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### Supabase Storage バケット作成

記事のカバー画像・本文画像・スポット画像のアップロード先として、
Supabase ダッシュボードで **手動** で以下のバケットを作成すること：

- バケット名: `article-images`
- Public: **ON**（記事画像は公開閲覧）
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- File size limit: `8 MB`

未作成の場合、画像アップロード Server Action がエラーを返し、
UI 側で「Supabase Storage に "article-images" バケットがありません」と誘導する。

### 手動マイグレーション

`packages/db/migrations/manual/0009_spots_place_id.sql` を Supabase の SQL エディタで
実行する必要がある（spots テーブルに `google_place_id` カラム追加）。

### 本文エディタ

- **Markdown モード**: 既存スキーマと完全互換（DB 保存形式の正本）
- **WYSIWYG モード（TipTap）**: 内部では HTML を保持、保存／タブ切替時に Markdown へ変換
- TipTap は heavy なので `dynamic import` でコード分割

### 将来追加予定（Tier 3）

- 公開予約（`published_at` 未来日指定）
- 私的メモ欄（writer-only ノート）
- タグ autocomplete（既存記事のタグから候補表示）

## デプロイ

Vercel。`vercel.json` でモノレポビルドを設定。
