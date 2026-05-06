# Locore DB スキーマ定義書

**バージョン**: 0.2
**最終更新**: 2026-05-06
**対象**: 29 テーブル（Phase 1 MVP + Library）
**実装**: `packages/db/src/schema/*.ts`、`packages/db/migrations/`

---

## 0. 共通仕様

- **DB**: PostgreSQL 15+ (Supabase Managed)
- **拡張**: PostGIS, pg_trgm, pgcrypto, uuid-ossp
- **ID**: UUID v4（`gen_random_uuid()`）
- **タイムスタンプ**: snake_case `created_at`/`updated_at`/`deleted_at`、`timestamptz`、UTC 保存
- **金額**: `integer`、JPY 基軸、小数なし
- **論理削除**: `articles` と `users` のみ `deleted_at` 採用、その他 hard delete
- **ENUM**: pgEnum 使用、`enums.ts` に集約
- **JSONB**: 構造化メタデータ・配列に積極利用
- **RLS**: 全 28 テーブルで有効化、ARCHITECTURE §4.2 準拠
- **トリガー**: `set_updated_at()` を 14 テーブルに自動付与（`updated_at` 更新）

---

## 🆔 1. Identity（4 テーブル）

### `users`
プラットフォームの全ユーザー基本情報。Supabase `auth.users` と 1:1。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | `auth.users.id` と一致 |
| `email` | text NOT NULL | UNIQUE |
| `display_name` | text | 公開表示名 |
| `role` | enum | `resident_writer` / `editor` / `light_diarist` / `reader` |
| `avatar_url` | text | プロフィール画像 URL |
| `bio` | text | 自己紹介 |
| `notification_preferences` | jsonb NOT NULL | 通知設定。`{ web_push: {...}, email: {...} }`、各セクションは `article_published` / `trip_reminder` / `crisis_alert` / `purchase_completed` の boolean。デフォルトは web_push 全 ON、email は記事新着のみ OFF。マイグレーション `manual/0005_notification_prefs.sql`。 |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `deleted_at` | timestamptz | soft delete |

**RLS**: 自分の行のみ読み書き、公開プロフィールは読み取り可
**関連**: `writer_profiles` (1:1), `sns_links` (1:N), `purchases.buyer`, `articles.writer`, `trips.owner`

---

### `writer_profiles`
書き手専用プロフィール。Tier・居住歴・ファウンディングメンバー情報。

| カラム | 型 | 説明 |
|---|---|---|
| `user_id` | uuid PK FK→users | |
| `tier` | enum | `S` / `A` / `B` |
| `residency_country` | text | ISO 3166 alpha-2（例: `FR`） |
| `residency_years` | integer | 居住年数 |
| `residency_verified_at` | timestamptz | 認証承認時刻 |
| `founding_member` | boolean | デフォルト false |
| `founding_joined_at` | timestamptz | |
| `founding_fee_waiver_until` | date | 6ヶ月手数料0% 期限 |
| `founding_status` | enum | `active` / `inactive` / `graduated` |
| `bio` | text | 書き手向け詳細紹介 |

**RLS**: 公開読み取り可、本人のみ更新

---

### `residency_verifications`
居住認証書類提出。30日後自動削除。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→users | |
| `document_type` | enum | `visa` / `utility_bill` / `bank_statement` / `other` |
| `document_url_enc` | text | クライアント暗号化済み URL（R2） |
| `status` | enum | `pending` / `approved` / `rejected` |
| `submitted_at` | timestamptz | |
| `reviewed_at` | timestamptz | |
| `reviewed_by` | uuid FK→users | 運営者 |
| `expires_at` | timestamptz | submitted_at + 30 days |

**RLS**: 本人のみ SELECT、運営（service_role）のみ UPDATE

---

### `sns_links`
ユーザーの SNS リンク + フォロワー数。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→users | |
| `platform` | enum | `tiktok` / `instagram` / `youtube` / `x` / `blog` |
| `url` | text | |
| `follower_count` | integer | バッチで定期更新 |
| `verified_at` | timestamptz | API 検証成功時刻 |

**RLS**: 公開読み取り可、本人のみ更新

---

## 📍 2. Catalog（4 テーブル）

### `cities`
対応都市マスタ。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `name_ja` | text | "パリ" 等 |
| `country` | text | ISO 3166 |
| `lat` / `lng` | numeric | 中心座標 |
| `timezone` | text | `Europe/Paris` 等 |
| `is_active` | boolean | パリ true / ロンドン NYC false |

**シード**: Paris (active), London (inactive), New York (inactive)

---

### `articles`
記事メイン。書き手が作成し読み手が購入。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `writer_id` | uuid FK→users | |
| `city_id` | uuid FK→cities | |
| `title` | text | |
| `body` | text | Markdown |
| `cover_image_url` | text | 3:2 推奨（DESIGN.md） |
| `price_jpy` | integer | 300〜5000 から選択 |
| `status` | enum | `draft` / `published` / `archived` / `pending_review` |
| `tags` | text[] | テーマタグ |
| `duration_type` | enum | `half_day` / `full_day` / `few_hours` / `other` |
| `article_type` | enum NOT NULL | `spot_guide`（個別の場所紹介）/ `itinerary`（時間軸ありの旅程プラン）。デフォルト `spot_guide`。マイグレーション `manual/0007_article_type.sql`。 |
| `warned` | boolean | AI モデレーション警告フラグ |
| `moderation_score` | integer | 最終合成スコア 0-100 |
| `published_at` | timestamptz | |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | soft delete |

**インデックス**:
- 部分: `(city_id, published_at DESC) WHERE status='published' AND deleted_at IS NULL`
- 部分: `(writer_id, published_at DESC) WHERE status='published' AND deleted_at IS NULL`
- 部分: `(status, created_at) WHERE status='pending_review'`
- 部分: `(article_type, published_at DESC) WHERE status='published' AND deleted_at IS NULL`（種別フィルタ用、`manual/0007_article_type.sql`）
- GIN: `title gin_trgm_ops`（全文検索補助）

**RLS**:
- SELECT: status='published' は公開、それ以外は著者のみ
- INSERT/UPDATE/DELETE: 著者のみ

---

### `article_videos`
記事内に埋め込む SNS 動画リンク。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `article_id` | uuid FK→articles | CASCADE |
| `platform` | enum | `tiktok` / `instagram` / `youtube` |
| `embed_url` | text | |
| `position` | integer | 表示順 |

---

### `spots`
記事内のスポット情報。PostGIS で地理クエリ。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `article_id` | uuid FK→articles | CASCADE |
| `name` | text | 店名・施設名 |
| `address` | text | 住所文字列 |
| `location` | geography(Point,4326) | EWKT で投入: `SRID=4326;POINT(lng lat)` |
| `category` | enum | `food` / `sight` / `shopping` / `lodging` / `other` |
| `price_estimate` | text | "€15-25" 等 |
| `opening_hours` | jsonb | `{ mon: ["09:00-18:00"], ..., note: "..." }` |
| `tags` | text[] | "予約必要"・"日本語OK" 等 |
| `position` | integer | 記事内表示順 |

**インデックス**:
- GIST: `idx_spots_location ON USING GIST (location)`（半径検索・ビューポート検索用）

---

## 💰 3. Commerce（2 テーブル）

### `purchases`
記事購入履歴。Stripe PaymentIntent と紐付け。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `buyer_id` | uuid FK→users | |
| `article_id` | uuid FK→articles | |
| `amount_jpy` | integer | 購入額 |
| `fee_jpy` | integer | 運営手数料（10% or 20%） |
| `payout_jpy` | integer | 書き手手取り |
| `stripe_payment_intent_id` | text | UNIQUE |
| `status` | enum | `pending` / `completed` / `refunded` |
| `purchased_at` | timestamptz | |

**インデックス**:
- 部分: `(buyer_id, article_id) WHERE status='completed'`（認可チェック用）

**RLS**: 購入者本人のみ SELECT、運営のみ INSERT/UPDATE

---

### `payouts`
月次精算記録。書き手への送金トランザクション。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `writer_id` | uuid FK→users | |
| `amount_jpy` | integer | 送金額（最低 ¥3,000） |
| `period_start` / `period_end` | date | 対象期間 |
| `status` | enum | `pending` / `initiated` / `completed` / `failed` |
| `wise_transfer_id` | text | Wise 側 ID |
| `initiated_at` / `completed_at` | timestamptz | |

**RLS**: 書き手本人のみ SELECT

---

## ⭐ 4. Reviews（1 テーブル）

### `reviews`
購入者によるレビュー。1 購入につき 1 レビュー。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `purchase_id` | uuid FK→purchases UNIQUE | |
| `local_score` | integer 0-100 | ローカル度スライダー |
| `satisfaction_stars` | integer 1-5 | 訪問満足度 |
| `tags` | text[] | 任意タグ最大3個（コスパ・混雑少 等） |
| `body` | text | 自由記述 200-1000字 |
| `visited_at` | date | 訪問日 |
| `created_at` | timestamptz | |

**RLS**: 公開 SELECT、購入者のみ INSERT（購入レコードと突合）

---

## 🗺️ 5. Trips（4 テーブル）

### `trips`
ユーザーの旅程ワークスペース。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `owner_id` | uuid FK→users | |
| `name` | text | "Paris 2026 May" 等 |
| `city_id` | uuid FK→cities | |
| `start_date` / `end_date` | date | |
| `party_size` | integer | 同行人数 |
| `share_token` | uuid | 共有 URL 用 |
| `share_role` | enum | `viewer` / `editor` / `none` |

**RLS**: オーナーまたは collaborators のみアクセス可

---

### `trip_days`
旅程内の各日。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK→trips CASCADE | |
| `day_number` | integer | 1, 2, 3... |
| `date` | date | |

---

### `trip_items`
旅程の各スポット項目。記事スポット参照 or 自由スポット。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `trip_day_id` | uuid FK→trip_days CASCADE | |
| `type` | enum | `spot` / `free` |
| `spot_id` | uuid FK→spots NULL可 | spot 参照時 |
| `custom_name` | text | free 時のスポット名 |
| `custom_lat` / `custom_lng` | numeric | free 時の座標 |
| `scheduled_time` | time | "09:00" 等 |
| `position` | integer | 当日内表示順 |
| `notes` | text | メモ |
| `budget_jpy` | integer | 個別予算 |

---

### `trip_collaborators`
旅程の共同編集者リスト。

| カラム | 型 | 説明 |
|---|---|---|
| `trip_id` | uuid PK FK→trips | |
| `user_id` | uuid PK FK→users | |
| `role` | enum | `viewer` / `editor` |

---

## 📓 6. UGC（1 テーブル）

### `light_diaries`
一般ユーザー無料投稿（旅行後の簡易レポート）。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `author_id` | uuid FK→users | |
| `title` | text | |
| `body` | text | |
| `photos` | jsonb | URL 配列 |
| `city_id` | uuid FK→cities | |
| `visited_at` | date | |
| `status` | enum | `draft` / `published` / `removed` |
| `created_at` | timestamptz | |

**RLS**: published は公開、自分の draft は本人のみ

---

## 🔖 6.5 Library / Bookmarks（1 テーブル）

### `bookmarks`
ユーザーが「あとで読む / 保存した」記事リスト（ライブラリ機能）。PRD §7 ウィッシュリスト相当。

| カラム | 型 | 説明 |
|---|---|---|
| `user_id` | uuid PK FK→users CASCADE | |
| `article_id` | uuid PK FK→articles CASCADE | |
| `created_at` | timestamptz NOT NULL DEFAULT now() | 保存した時刻 |

**主キー**: `(user_id, article_id)` の複合 PK（同一ユーザーが同じ記事を二重保存しない）

**インデックス**:
- `bookmarks_user_created_idx ON (user_id, created_at DESC)` — `/library` の「保存日が新しい順」表示用

**RLS**: `auth.uid() = user_id` でのみ SELECT / INSERT / DELETE。UPDATE 不要（toggle は INSERT or DELETE で表現）

**マイグレーション**: `manual/0008_bookmarks.sql`

**関連**: `users` (N:1), `articles` (N:1)

---

## 🎨 7. Editorial（2 テーブル）

### `editor_collections`
編集チームの特集（記事キュレーション）。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `title` / `body` | text | |
| `cover_image_url` | text | |
| `editor_id` | uuid FK→users | |
| `city_id` | uuid FK→cities | |
| `published_at` | timestamptz | |

---

### `collection_articles`
特集 ↔ 記事の中間テーブル。売上配分含む。

| カラム | 型 | 説明 |
|---|---|---|
| `collection_id` | uuid PK FK→editor_collections | |
| `article_id` | uuid PK FK→articles | |
| `position` | integer | 特集内表示順 |
| `revenue_share_pct` | integer | 編集チーム配分%（デフォ30） |

---

## 🛡️ 8. Moderation・運営（3 テーブル）

### `article_moderation_scores`
AI モデレーション3次元スコア記録。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `article_id` | uuid FK→articles | |
| `tourist_score` | integer 0-100 | 観光地依存度 |
| `visual_score` | integer 0-100 | 視覚装飾度（Claude Haiku） |
| `text_score` | integer 0-100 | 文体浅薄度（Claude Sonnet） |
| `final_score` | integer 0-100 | 重み付き合成 |
| `visual_breakdown` | jsonb | 5次元内訳 |
| `text_breakdown` | jsonb | 5次元 + flagged_phrases |
| `action` | enum | `pass` / `warned` / `held` / `overridden` |
| `reviewer_id` | uuid FK→users | OVERRIDE 時の編集者 |
| `reviewed_at` / `override_reason` | | |
| `created_at` | timestamptz | |

**RLS**: 運営のみ全アクセス（service_role）

---

### `founding_applications`
ファウンディングメンバー応募。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `email` | text | |
| `display_name` | text | |
| `sns_links` | jsonb | `{platform: url}` |
| `residency_country` | text | |
| `residency_years_self_reported` | integer | |
| `motivation` | text | 200-400字 |
| `topics` | text[] | 書きたいテーマ3つ |
| `writing_samples` | text | 既存ブログ等 URL |
| `status` | enum | `pending` / `approved` / `rejected` / `waitlist` |
| `reviewer_notes` | text | |
| `reviewed_by` | uuid FK→users | |
| `reviewed_at` / `created_at` | timestamptz | |

**RLS**: service_role のみ（公開投稿フォームから API 経由で INSERT）

---

### `reports`
通報フォーム（記事・ユーザー・レビュー・ライト旅行記が対象）。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `reporter_id` | uuid FK→users NULL可 | 匿名通報も許可 |
| `target_type` | enum | `article` / `user` / `review` / `light_diary` / `other`（お問い合わせ） |
| `target_id` | uuid | `target_type='other'` の場合は NIL UUID（`00000000-0000-0000-0000-000000000000`）を格納 |
| `reason` | text | 通報: `spam` / `inappropriate` / `misinformation` / `copyright` / `other` ／ お問い合わせ: `bug` / `feature` / `terms` / `payment` / `other` |
| `body` | text | 通報詳細・お問い合わせ本文（zod で 1〜2000 文字を強制） |
| `status` | enum | `open` / `investigating` / `resolved` / `dismissed` |
| `resolved_by` | uuid FK→users | |
| `resolved_at` / `created_at` | timestamptz | |

**SLA**: 72時間以内の一次対応（PRD §10.2）。運営画面 `/admin/reports` で残り時間表示（緑/黄/赤）。

**お問い合わせ用途**: `target_type='other'` で `reason` にカテゴリ（`bug` 等）を、件名と本文は `body` に
`「件名: ...\n\n本文」` 形式で格納する。連絡先メールアドレスは `audit_logs.metadata` 経由で記録する。

---

## 🚨 9. Crisis（3 テーブル）

### `crisis_events`
公開中のクライシスイベント（ストライキ・デモ・治安等）。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `city_id` | uuid FK→cities | |
| `type` | enum | `strike` / `demo` / `event` / `security` / `other` |
| `severity` | integer 1-5 | |
| `title` | text | |
| `description` | text | |
| `japanese_summary` | text | 編集者が書く要約 |
| `sources` | jsonb | `[{name, url, quoted_at}]` |
| `affected_areas` | jsonb | GeoJSON or 地区名配列 |
| `affected_lines` | text[] | `['M1', 'M14']` 等 |
| `starts_at` / `ends_at` | timestamptz | |
| `status` | enum | `draft` / `published` / `archived` |
| `published_by` | uuid FK→users | |
| `published_at` | timestamptz | |
| `auto_collected` | boolean | M7+ の自動取得分 |

**インデックス**:
- 部分: `(city_id, severity, ends_at) WHERE status='published'`

**通知トリガー**: severity 3+ で旅程該当者に Web Push、4+ でパリ閲覧者全員にバナー

---

### `crisis_source_feeds`
クライシス情報の RSS/API 取得元設定。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `city_id` | uuid FK→cities | |
| `source_name` | text | "RATP" / "SNCF" / "Le Monde" |
| `feed_url` | text | |
| `feed_type` | enum | `rss` / `api` / `twitter` |
| `enabled` | boolean | |
| `last_fetched_at` | timestamptz | |
| `last_error` | text | |

---

### `crisis_candidates`
半自動収集の候補キュー（編集者が承認 → crisis_events へ）。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `source_feed_id` | uuid FK→crisis_source_feeds | |
| `raw_content` | text | 原文 |
| `parsed_title` | text | |
| `parsed_severity` | integer | ヒューリスティック判定 |
| `status` | enum | `new` / `approved` / `rejected` / `duplicate` |
| `reviewed_by` | uuid FK→users | |
| `reviewed_at` / `created_at` | timestamptz | |

---

## 🔧 10. System（4 テーブル）

### `push_subscriptions`
Web Push 購読情報（VAPID）。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→users | |
| `endpoint` | text UNIQUE | ブラウザ Push API endpoint |
| `p256dh_key` | text | |
| `auth_key` | text | |
| `user_agent` | text | デバッグ用 |
| `created_at` | timestamptz | |

---

### `notification_log`
通知配信ログ（メール・Web Push・アプリ内）。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→users | |
| `type` | enum | `article_published` / `trip_reminder` / `crisis_alert` / `purchase_completed` 等 |
| `payload` | jsonb | 通知内容 |
| `channel` | enum | `email` / `web_push` / `in_app` |
| `status` | enum | `pending` / `sent` / `failed` |
| `sent_at` / `created_at` | timestamptz | |

---

### `exchange_rates`
為替レートキャッシュ（JPY/EUR/USD 等）。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `from_currency` / `to_currency` | text | "JPY"/"EUR" 等、UNIQUE 複合 |
| `rate` | numeric(20, 8) | 為替レート |
| `fetched_at` | timestamptz | |
| `source` | text | "OpenExchangeRates" 等 |

**TTL**: 1時間（バッチで更新）

---

### `audit_logs`
重要操作の監査ログ。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid PK | |
| `actor_id` | uuid FK→users NULL可 | システム操作の場合 NULL |
| `action` | text | `user.created`, `article.published`, `payout.completed` 等 |
| `target_type` | text | |
| `target_id` | uuid | |
| `metadata` | jsonb | 詳細情報 |
| `ip_address` | inet | |
| `user_agent` | text | |
| `created_at` | timestamptz | |

**RLS**: service_role のみ全アクセス、通常ロールから不可視

---

## 📐 リレーション主要図

```
users ──┬── writer_profiles (1:1)
        ├── sns_links (1:N)
        ├── residency_verifications (1:N)
        ├── articles (1:N as writer)
        ├── purchases (1:N as buyer)
        ├── trips (1:N as owner)
        ├── reviews (via purchases)
        ├── light_diaries (1:N as author)
        └── bookmarks (1:N as user)

articles ──┬── spots (1:N)
           ├── article_videos (1:N)
           ├── article_moderation_scores (1:N)
           ├── purchases (1:N)
           └── bookmarks (1:N)

bookmarks (M:N between users and articles, composite PK)

trips ──┬── trip_days (1:N) ── trip_items (1:N)
        └── trip_collaborators (M:N via users)

editor_collections ── collection_articles (M:N) ── articles

cities ──┬── articles (1:N)
         ├── trips (1:N)
         ├── light_diaries (1:N)
         ├── editor_collections (1:N)
         ├── crisis_events (1:N)
         └── crisis_source_feeds (1:N)

crisis_source_feeds ── crisis_candidates (1:N)

purchases ── reviews (1:1)
```

---

## 🔒 RLS ポリシー早見表

| テーブル | SELECT | INSERT | UPDATE | DELETE |
|------|------|------|------|------|
| `users` | 公開（プロフィール）| 自分のみ | 自分のみ | 不可（soft delete） |
| `writer_profiles` | 公開 | 自分のみ | 自分のみ | - |
| `residency_verifications` | 本人のみ | 本人のみ | 運営のみ | 自動（30日後） |
| `sns_links` | 公開 | 本人のみ | 本人のみ | 本人のみ |
| `cities` | 公開 | service_role | service_role | service_role |
| `articles` | published 公開 / draft 著者 | 著者 | 著者 | 著者（soft） |
| `article_videos` | 親に従う | 著者 | 著者 | 著者 |
| `spots` | 親に従う | 著者 | 著者 | 著者 |
| `purchases` | 購入者 | service_role | service_role | - |
| `payouts` | 書き手 | service_role | service_role | - |
| `reviews` | 公開 | 購入者 | 購入者 | 購入者 |
| `trips` | オーナー + collab | オーナー | オーナー + collab(editor) | オーナー |
| `trip_days/items/collab` | trips に従う | trips に従う | trips に従う | trips に従う |
| `light_diaries` | published 公開 | 認証ユーザー | 著者 | 著者 |
| `bookmarks` | 本人のみ | 本人のみ | - | 本人のみ |
| `editor_collections` | 公開 | editor | editor | editor |
| `collection_articles` | 公開 | editor | editor | editor |
| `article_moderation_scores` | service_role | service_role | service_role | service_role |
| `founding_applications` | service_role | 公開 | service_role | service_role |
| `reports` | 通報者 + 運営 | 公開（匿名可）| 運営 | 運営 |
| `crisis_events` | published 公開 | service_role | service_role | service_role |
| `crisis_source_feeds` | service_role | service_role | service_role | service_role |
| `crisis_candidates` | service_role | service_role | service_role | service_role |
| `push_subscriptions` | 本人のみ | 本人のみ | 本人のみ | 本人のみ |
| `notification_log` | 本人のみ | service_role | service_role | service_role |
| `exchange_rates` | 公開 | service_role | service_role | service_role |
| `audit_logs` | service_role | service_role | - | - |

---

## 🛠️ 運用上の注意

### PostGIS 利用時

スポット追加時は `point` customType に `{ lat, lng }` を渡せば内部で EWKT 変換：

```typescript
await db.insert(spots).values({
  articleId,
  name: 'カフェ',
  location: { lat: 48.8566, lng: 2.3522 },
  // ...
});
```

読み出し時に lat/lng を取りたい場合は `ST_X` / `ST_Y` を使う SQL：

```typescript
const rows = await db.execute(sql`
  SELECT name, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng
  FROM spots
  WHERE article_id = ${articleId}
`);
```

### 半径検索（PostGIS）

```sql
-- 中心点から 500m 以内のスポット
SELECT * FROM spots
WHERE ST_DWithin(
  location,
  ST_SetSRID(ST_MakePoint(2.3522, 48.8566), 4326)::geography,
  500
);
```

### 部分インデックスのクエリ書き方

例：`articles_published` 部分インデックスを活用するには WHERE 句が一致する必要：

```sql
-- ✅ 部分インデックスが効く
SELECT * FROM articles
WHERE city_id = ? AND status = 'published' AND deleted_at IS NULL
ORDER BY published_at DESC;

-- ❌ 効かない（status の条件が部分インデックスと不一致）
SELECT * FROM articles WHERE city_id = ? ORDER BY published_at DESC;
```

### soft delete の取扱い

`articles` と `users` は `deleted_at IS NULL` をクエリで明示する：

```typescript
const live = await db.query.articles.findMany({
  where: (a, { isNull }) => isNull(a.deletedAt),
});
```

---

## 📚 関連ドキュメント

- **PRD**: [`PRD.md`](../../PRD.md) §6（機能要件）, §10（法務・コンプライアンス）
- **アーキテクチャ**: [`ARCHITECTURE.md`](../../ARCHITECTURE.md) §4（データモデル）
- **設計判断**: [`PRD-DECISIONS.md`](../../PRD-DECISIONS.md) §3.6.1, §4.6.1, §6.8.1
- **実装**: [`packages/db/src/schema/`](./src/schema/)
- **マイグレーション**: [`packages/db/migrations/`](./migrations/)

---

**改訂履歴**

| バージョン | 日付 | 変更内容 |
|--|--|--|
| 0.1 | 2026-05-06 | 初稿、Phase 1 MVP 全 28 テーブル |
| 0.1.1 | 2026-05-06 | `articles.article_type`（spot_guide / itinerary）追加 / `manual/0007_article_type.sql` |
