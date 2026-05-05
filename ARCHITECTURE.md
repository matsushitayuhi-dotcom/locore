# Locore — システムアーキテクチャ設計書

**バージョン**: 0.1
**最終更新**: 2026-05-06
**対象**: Phase 1 (MVP)
**前提**: [PRD.md](./PRD.md) v0.3 以降

---

## 0. ドキュメント概要

本書は Locore の Phase 1 (MVP) システムアーキテクチャを定義する。実装前に確定すべき設計判断を含む。

設計原則：

1. **単一コードベース優先**：Web (Next.js) + PWA を1つのコードベースで実現
2. **マネージドサービス活用**：自前運用を最小化し、プロダクト機能に集中
3. **読み取り中心の最適化**：記事閲覧 / 検索 / マップ表示のレイテンシを最優先
4. **国際決済対応**：Stripe + Wise 連携で日本/海外両対応
5. **段階的スケール**：初期は月数千ユーザー想定、Phase 2 で5万〜想定の構造に

---

## 1. アーキテクチャ概観

```
┌──────────────────────────────────────────────────────────────┐
│                           ユーザー                              │
│  Reader（旅行者）  Writer（書き手）  Editor（編集者）             │
└──────────────────┬───────────────────────────────────────────┘
                   │ HTTPS
┌──────────────────▼───────────────────────────────────────────┐
│              Cloudflare（CDN + WAF + DDoS保護）                │
└──────────────────┬───────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────────┐
│  Vercel：Next.js 14+（App Router, RSC, SSR/ISR, PWA）          │
│  ・SEO重要ページは ISR / SSR                                    │
│  ・地図/トリッププランナー/エディタ等インタラクティブは CSR        │
│  ・Service Worker でオフライン対応                             │
└──────────────────┬───────────────────────────────────────────┘
                   │ tRPC / REST
┌──────────────────▼───────────────────────────────────────────┐
│  Backend：NestJS on Railway / Render（Node.js + TypeScript）    │
│  ・REST API（外部公開・モバイル将来対応のため）                  │
│  ・GraphQL は Phase 2 で検討                                   │
│  ・BullMQ でバックグラウンドジョブ                              │
└─┬──────────────┬───────────┬──────────┬──────────────────┬─┘
  │              │           │          │                  │
  ▼              ▼           ▼          ▼                  ▼
┌───────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌────────────┐
│ Supabase  │ │ Cloudflare│ │ Algolia │ │ Upstash  │ │ External   │
│ Postgres  │ │ R2        │ │ Search  │ │ Redis    │ │ Services   │
│ + PostGIS │ │ (Storage) │ │         │ │ (cache)  │ │            │
│ Auth      │ │           │ │         │ │          │ │            │
└───────────┘ └──────────┘ └─────────┘ └──────────┘ └─────┬──────┘
                                                         │
   ┌─────────────────────────────────────────────────────┤
   ▼                ▼              ▼              ▼      ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Stripe   │  │ Wise/    │  │ Google   │  │ Anthropic│  │ SNS APIs │
│ (決済)   │  │ Payoneer │  │ Maps     │  │ / OpenAI │  │ (TT/IG/  │
│          │  │ (送金)   │  │ Platform │  │ (AI)     │  │ YT/X)    │
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

---

## 2. 推奨スタック（確定）

| レイヤ | 採用 | 代替候補 | 選定理由 |
|------|-----|---------|---------|
| Web フレームワーク | **Next.js 14+** (App Router) | Remix, SvelteKit | SEO 必須、RSC + ISR でロングテール獲得、エコシステム |
| ホスティング（Frontend） | **Vercel** | Cloudflare Pages | Next.js 親和性、ISR/Edge 対応 |
| バックエンド | **NestJS** (Node.js + TS) | Hono, Fastify | TS統一、DI/モジュール構造、認証/Validation充実 |
| ホスティング（Backend） | **Railway** または **Render** | Fly.io, AWS Fargate | 価格、デプロイ容易性 |
| DB | **Supabase（Postgres + PostGIS）** | RDS, Neon | Auth/Storage 統合、PostGIS 必須、無料枠あり |
| 認証 | **Supabase Auth** | Auth0, Clerk | DB 統合、コスト、Email/OAuth 対応 |
| オブジェクトストレージ | **Cloudflare R2** | AWS S3 | エグレス無料、互換API、Cloudflare 統合 |
| CDN/WAF | **Cloudflare** | Fastly | 価格、DDoS無料、画像変換 |
| 検索 | **Algolia** | Meilisearch, Elasticsearch | 運用不要、日本語対応、ファセット強い |
| キャッシュ/Queue | **Upstash Redis** + **BullMQ** | AWS ElastiCache | サーバレス Redis、コスト |
| 決済 | **Stripe** | Square, Adyen | 国際対応、多通貨、定期課金（Phase 2 用） |
| 海外送金 | **Wise Business API** または **Payoneer** | Revolut Business | 在外邦人への送金 |
| マップ | **Google Maps Platform** | Mapbox, MapLibre | データ品質、Cloud Styling、海外網羅性 |
| メール | **Resend** | SendGrid, Postmark | DX良、価格、開発者向け |
| 分析 | **PostHog** | Mixpanel, Amplitude | プロダクト分析 + セッションリプレイ統合 |
| エラー監視 | **Sentry** | Datadog | 価格、Next.js 統合 |
| ログ | **Better Stack (Logtail)** または **Axiom** | Datadog | 価格 |
| AI | **Anthropic Claude API** | OpenAI | 日本語品質、長文対応、映え判定 |
| 国際送金（為替表示用） | **Open Exchange Rates** | Currency Layer | 為替レート取得 |

### 2.1 「Vercel + Supabase」を選ぶ理由

スタートアップの初期 MVP として：

- 運用工数が小さい（DB スケール、バックアップ、認証連携が自動）
- 月額コスト初期 $0-100、MAU 数千でも $200-500
- Postgres + PostGIS のフル機能、Row Level Security も活用可能
- ベンダーロックインのリスクは Postgres 部分は低い（移行容易）
- 課題：将来的に「DB と API が同じ Supabase」のため、独自バックエンドのデプロイ先は別途必要 → Railway/Render を採用

---

## 3. システムコンポーネント詳細

### 3.1 フロントエンド（Next.js + PWA）

**レンダリング戦略**：

| ページ | 戦略 | 理由 |
|------|-----|-----|
| トップ / フィード | ISR（60秒再生成）| SEO + 速度両立 |
| 記事詳細（プレビュー部分） | ISR（5分再生成）| SEO 最重要 |
| 記事詳細（購入後の本文） | CSR（クライアント取得）| 認可必須 |
| 都市別ランディング | SSG（ビルド時生成）| SEO + 安定 |
| マップ画面 | CSR | インタラクティブ |
| トリッププランナー | CSR | 動的編集 |
| ライブラリ / マイページ | CSR + SWR | 認可必須 |
| 著者プロフィール | ISR（10分）| SEO + 動的バランス |

**主要ライブラリ**：

- `next` (App Router)
- `tailwindcss` + `shadcn/ui`（デザインシステム）
- `@tanstack/react-query` または `swr`（クライアント側キャッシュ）
- `zod`（バリデーション）
- `@supabase/ssr`（認証連携）
- `@stripe/stripe-js`（決済UI）
- `@vis.gl/react-google-maps`（Google Maps React ラッパー）
- `framer-motion`（アニメーション）
- `next-intl`（i18n、Phase 3 で英語追加）

**PWA 実装**：

- `next-pwa` プラグインで Service Worker 自動生成
- `manifest.json` でホーム画面追加対応
- オフライン戦略：
  - 静的アセット：Cache First
  - 記事 API：Stale-While-Revalidate
  - 購入済み記事本文：明示的キャッシュ（ユーザー操作で「オフラインダウンロード」）
  - マップタイル：Network First + キャッシュフォールバック
- プッシュ通知：Web Push API（VAPID）
  - Android：完全対応
  - iOS 16.4+：対応（ホーム追加が前提）

### 3.2 バックエンド（NestJS）

**モジュール構成**：

```
src/
├── auth/           # Supabase Auth と連携、JWT検証
├── users/          # プロフィール、ランク、SNS リンク
├── verifications/  # 居住認証フロー
├── articles/       # 記事 CRUD、公開制御
├── spots/          # スポット情報、地理クエリ
├── purchases/      # 購入処理、Stripe Webhook
├── reviews/        # 評価・レビュー
├── trips/          # 旅程ワークスペース
├── search/         # Algolia インデキシング
├── feed/           # フィード生成、ランキング
├── light-diaries/  # ライト旅行記
├── collections/    # 編集チーム特集
├── crisis/         # クライシス情報
├── payouts/        # 月次精算、Wise/Payoneer連携
├── notifications/  # メール、Web Push
├── moderation/     # AI判定、通報処理
├── analytics/      # 内部メトリクス
└── jobs/           # BullMQ ワーカー
```

**API 設計**：

- REST API（OpenAPI スキーマで定義）
- 認証：Supabase JWT を Authorization ヘッダで受け、NestJS Guard で検証
- Rate Limit：IP / ユーザー単位、Upstash Redis
- バックグラウンドジョブ：BullMQ
  - SNS API ポーリング（フォロワー数更新、日次）
  - Algolia インデキシング（記事更新時）
  - 為替レート更新（時間単位）
  - 月次精算バッチ
  - クライシス情報スクレイピング（Phase 2）

### 3.3 データベース（Postgres + PostGIS）

PostGIS は地理クエリに必須：

- 「半径500m以内のスポット」
- 「マップビューポート内の記事」
- 観光客密度ヒートマップ
- スポット間距離計算（Distance Matrix の補助）

詳細は §4 ER を参照。

### 3.4 検索（Algolia）

**インデキシング対象**：

- `articles` インデックス：タイトル、本文（先頭部分のみ）、著者名、タグ、都市、エリア、料金、ローカル度平均、満足度平均
- `spots` インデックス：店舗名、住所、カテゴリ、緯度経度
- `writers` インデックス：表示名、居住国、居住歴、ランク

**ファセット**：

- 都市・エリア
- カテゴリ
- 価格帯
- ローカル度範囲
- 著者ランク
- タグ

**シノニム辞書**：

- 「カフェ」⇄「珈琲」⇄「コーヒー」
- 「ビストロ」⇄「レストラン」
- 「ルーブル」⇄「Louvre」

### 3.5 オブジェクトストレージ（Cloudflare R2）

**バケット構成**：

```
locore-public/         # 公開コンテンツ（CDN経由配信）
├── articles/
│   └── {article_id}/
│       ├── cover.jpg
│       ├── images/
│       └── videos/
└── avatars/
    └── {user_id}.jpg

locore-private/        # 認可必須（Signed URL）
├── verifications/
│   └── {user_id}/
│       └── {document_id}.enc   # 暗号化済み
└── article-drafts/
    └── {article_id}/

locore-temp/           # 30日後自動削除
└── uploads/
```

**画像配信**：

- Cloudflare Images で自動リサイズ・WebP 変換
- 記事カバー：1200x630（OGP兼用）/ 800x420 / 400x210 の3サイズ
- スポット写真：1080x720 / 540x360 の2サイズ

**居住認証書類の扱い**：

- アップロード時にクライアント側で暗号化（公開鍵）
- サーバー側で復号鍵を別保管（HSM相当のサービスへ移行予定）
- 30日経過後、自動削除（バッチジョブ）

---

## 4. データモデル（主要テーブル）

```
┌─────────────┐
│   users     │ (Supabase auth.users と1:1)
├─────────────┤
│ id (UUID)   │◄────────┐
│ email       │         │
│ display_name│         │
│ role        │         │  ┌──────────────────┐
│ avatar_url  │         │  │ writer_profiles  │
│ created_at  │         └──┤ user_id (FK,PK)  │
└─────────────┘            │ tier (S/A/B)     │
       │                   │ residency_country│
       │                   │ residency_years  │
       │                   │ verified_at      │
       │                   │ bio              │
       │                   └──────────────────┘
       │
       ├──┬──────────────┐
       │  │              │
       ▼  ▼              ▼
┌─────────────┐  ┌──────────────────┐
│  sns_links  │  │ residency_       │
├─────────────┤  │ verifications    │
│ id          │  ├──────────────────┤
│ user_id (FK)│  │ id               │
│ platform    │  │ user_id (FK)     │
│ url         │  │ document_type    │
│ follower_   │  │ document_url_enc │
│   count     │  │ status           │
│ verified_at │  │ submitted_at     │
└─────────────┘  │ reviewed_at      │
                 │ expires_at       │
                 └──────────────────┘

┌──────────────┐
│   cities     │
├──────────────┤
│ id           │◄──┐
│ name_ja      │   │
│ country      │   │
│ lat          │   │
│ lng          │   │
│ timezone     │   │
└──────────────┘   │
                   │
┌──────────────────┴─────────┐
│         articles           │
├────────────────────────────┤
│ id (UUID)                  │◄──┐
│ writer_id (FK users)       │   │
│ city_id (FK)               │   │
│ title                      │   │
│ body (markdown/JSON)       │   │
│ cover_image_url            │   │
│ price_jpy                  │   │
│ status (draft/pub/arch)    │   │
│ tags[]                     │   │
│ duration_type              │   │
│ published_at               │   │
│ created_at, updated_at     │   │
└────────────────────────────┘   │
       │                         │
       ├─────────────────┐       │
       ▼                 ▼       │
┌─────────────┐  ┌─────────────────────┐
│   spots     │  │   article_videos    │
├─────────────┤  ├─────────────────────┤
│ id          │  │ id                  │
│ article_id  │  │ article_id (FK)     │
│ name        │  │ platform            │
│ address     │  │ embed_url           │
│ location    │  │ position            │
│ (POINT)     │  └─────────────────────┘
│ category    │                         │
│ price_est   │                         │
│ opening_hrs │                         │
│ tags[]      │                         │
│ position    │                         │
└─────────────┘                         │
                                        │
┌─────────────────────────┐             │
│       purchases         │             │
├─────────────────────────┤             │
│ id                      │             │
│ buyer_id (FK users)     │             │
│ article_id (FK) ────────┼─────────────┘
│ amount_jpy              │
│ fee_jpy                 │
│ payout_jpy              │
│ stripe_pi_id            │
│ status                  │
│ purchased_at            │
└─────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│        reviews          │
├─────────────────────────┤
│ id                      │
│ purchase_id (FK,UNIQUE) │
│ local_score (0-100)     │
│ satisfaction (1-5)      │
│ tags[] (max 3)          │
│ body                    │
│ visited_at              │
│ created_at              │
└─────────────────────────┘

┌──────────────────────┐
│       trips          │
├──────────────────────┤
│ id                   │◄──┐
│ owner_id (FK)        │   │
│ name                 │   │
│ city_id (FK)         │   │
│ start_date           │   │
│ end_date             │   │
│ party_size           │   │
│ share_token (UUID)   │   │
│ created_at           │   │
└──────────────────────┘   │
       │                   │
       ▼                   │
┌──────────────────┐       │
│    trip_days     │       │
├──────────────────┤       │
│ id               │◄──┐   │
│ trip_id (FK) ────┼───┼───┘
│ day_number       │   │
│ date             │   │
└──────────────────┘   │
                       │
┌──────────────────┐   │
│   trip_items     │   │
├──────────────────┤   │
│ id               │   │
│ trip_day_id ─────┼───┘
│ type (spot/free) │
│ spot_id (FK)     │
│ custom_name      │
│ custom_lat       │
│ custom_lng       │
│ scheduled_time   │
│ position         │
│ notes            │
└──────────────────┘

┌─────────────────────┐
│ trip_collaborators  │
├─────────────────────┤
│ trip_id (FK)        │
│ user_id (FK)        │
│ role (viewer/editor)│
└─────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐
│   light_diaries      │  │ editor_collections   │
├──────────────────────┤  ├──────────────────────┤
│ id                   │  │ id                   │
│ author_id (FK)       │  │ title                │
│ title                │  │ body                 │
│ body                 │  │ cover_image_url      │
│ photos[]             │  │ editor_id (FK)       │
│ city_id (FK)         │  │ city_id (FK)         │
│ visited_at           │  │ published_at         │
│ status               │  └──────────────────────┘
└──────────────────────┘             │
                                     ▼
                          ┌──────────────────────┐
                          │ collection_articles  │
                          ├──────────────────────┤
                          │ collection_id (FK)   │
                          │ article_id (FK)      │
                          │ position             │
                          │ revenue_share_pct    │
                          └──────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐
│   crisis_events      │  │      payouts         │
├──────────────────────┤  ├──────────────────────┤
│ id                   │  │ id                   │
│ city_id (FK)         │  │ writer_id (FK)       │
│ type                 │  │ amount_jpy           │
│ severity             │  │ period_start         │
│ title                │  │ period_end           │
│ description          │  │ status               │
│ source_url           │  │ wise_transfer_id     │
│ starts_at            │  │ initiated_at         │
│ ends_at              │  │ completed_at         │
└──────────────────────┘  └──────────────────────┘
```

### 4.1 重要なインデックス

```sql
-- 地理クエリ
CREATE INDEX idx_spots_location ON spots USING GIST (location);
CREATE INDEX idx_spots_article_id ON spots(article_id);

-- フィード生成（ホット記事）
CREATE INDEX idx_articles_city_published ON articles(city_id, published_at DESC) WHERE status = 'published';
CREATE INDEX idx_articles_writer_published ON articles(writer_id, published_at DESC) WHERE status = 'published';

-- 評価集計
CREATE INDEX idx_reviews_purchase_id ON reviews(purchase_id);

-- 購入認可チェック
CREATE INDEX idx_purchases_buyer_article ON purchases(buyer_id, article_id) WHERE status = 'completed';

-- 全文検索（Algolia がメインだが、運用面の補助）
CREATE INDEX idx_articles_title_trgm ON articles USING gin (title gin_trgm_ops);
```

### 4.2 Row Level Security（Supabase）

主要ポリシー：

```sql
-- 記事：公開記事は誰でも読める、下書きは著者のみ
CREATE POLICY "public articles readable" ON articles FOR SELECT USING (status = 'published');
CREATE POLICY "draft articles by author" ON articles FOR ALL USING (auth.uid() = writer_id);

-- 購入：購入者本人のみ自分の購入履歴を見られる
CREATE POLICY "own purchases" ON purchases FOR SELECT USING (auth.uid() = buyer_id);

-- レビュー：誰でも読める、購入者のみ書ける
CREATE POLICY "public reviews readable" ON reviews FOR SELECT USING (true);
CREATE POLICY "buyer can review" ON reviews FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM purchases WHERE purchases.id = purchase_id AND purchases.buyer_id = auth.uid())
);

-- 旅程：オーナーまたはコラボレーターのみ
CREATE POLICY "trip access" ON trips FOR ALL USING (
  auth.uid() = owner_id OR
  EXISTS (SELECT 1 FROM trip_collaborators WHERE trip_id = trips.id AND user_id = auth.uid())
);
```

---

## 5. 主要なデータフロー

### 5.1 記事公開フロー

```
[Writer] → 記事作成画面 → 下書き保存 → 「公開申請」
    │
    ▼
[Backend] バリデーション（最低文字数、スポット必須数）
    │
    ▼
[AI モデレーション] Anthropic API で映え過剰判定 + NG表現チェック
    │ （警告のみ、ブロックはしない）
    ▼
[DB] articles.status = 'published', published_at = NOW()
    │
    ▼
[BullMQ Job] Algolia インデキシング
    │
    ▼
[BullMQ Job] 著者フォロワーへ Web Push 通知
    │
    ▼
[Cloudflare] ISR の再生成トリガー
```

### 5.2 記事購入フロー

```
[Reader] → 記事プレビュー → 「購入」ボタン
    │
    ▼
[Frontend] Stripe Checkout セッション作成 API 呼び出し
    │
    ▼
[Backend] /purchases/checkout
    ├─ 重複購入チェック
    ├─ Stripe API: PaymentIntent 作成（手数料込み）
    └─ purchases レコードを status='pending' で挿入
    │
    ▼
[Frontend] Stripe.js で決済UI表示
    │
    ▼
[Stripe] 決済成功 → Webhook 発火
    │
    ▼
[Backend] /webhooks/stripe
    ├─ 署名検証
    ├─ purchases.status = 'completed'
    ├─ writer の payout 残高に金額加算
    └─ Reader にメール通知 + Web Push
    │
    ▼
[Frontend] 完了ページ → 購入記事へ遷移
    │
    ▼
[CSR] 購入認可確認 → 全文・全スポット表示 + オフライン保存ボタン有効化
```

### 5.3 居住認証フロー

```
[Writer] → 認証画面で書類選択（ビザ / 公共料金 / 銀行口座）
    │
    ▼
[Frontend] クライアント側で公開鍵暗号化 → R2 へ Signed URL アップロード
    │
    ▼
[Backend] residency_verifications.status = 'pending'
    │
    ▼
[内部運営] 管理画面で確認 → 承認 / 却下
    │
    ▼
[Backend] (承認時)
    ├─ writer_profiles.tier = 'S' or 'A' に更新
    ├─ writer_profiles.verified_at = NOW()
    └─ 30日後に書類自動削除のジョブをスケジュール
    │
    ▼
[Writer] バッジ表示開始
```

### 5.4 旅程作成 → Google Maps エクスポート

```
[Reader] → トリッププランナー → 購入記事から「旅程に追加」
    │
    ▼
[Frontend] DnD でスポットを日に配置
    │
    ▼
[Backend] /trips/:id/items で trip_items を更新
    │
    ▼
[Reader] 「最短順に並べ替える」ボタン
    │
    ▼
[Frontend] 当該日の trip_items の lat/lng を取得
    │
    ▼
[Backend] /trips/optimize-day
    ├─ Google Distance Matrix API を呼ぶ（N×N、Nスポット）
    ├─ 単純な Nearest Neighbor 法で巡回順を計算
    └─ 並べ替え後の position[] を返却
    │
    ▼
[Frontend] DB 更新 + UI で順序を反映
    │
    ▼
[Reader] 「Google Maps で開く」ボタン
    │
    ▼
[Frontend] Google Maps Directions URL 生成
    https://www.google.com/maps/dir/?api=1
      &origin=lat1,lng1
      &destination=latN,lngN
      &waypoints=lat2,lng2|lat3,lng3|...
      &travelmode=walking
    → 別タブ / アプリで開く
```

### 5.5 月次精算フロー

```
[Cron Job] 毎月15日 03:00 JST
    │
    ▼
[Backend] 前月分の confirmed purchases を集計
    ├─ writer ごとに合計金額算出
    ├─ 手数料控除（Tier S/認証クリエイター: 10%, 通常: 20%）
    ├─ 最低送金額 ¥3,000 未満は翌月に繰越
    └─ payouts レコード作成（status='pending'）
    │
    ▼
[Wise/Payoneer API] 一括送金リクエスト
    ├─ 海外在住 writer → Wise 経由（多通貨対応）
    └─ 国内 writer → 国内銀行振込
    │
    ▼
[Webhook] 送金完了通知 → payouts.status = 'completed'
    │
    ▼
[Email] writer に明細送付
```

---

## 6. PWA 実装方針

### 6.1 Service Worker キャッシュ戦略

| リソース種別 | 戦略 | TTL |
|-----------|-----|-----|
| HTML（フィード等） | Network First → Fallback | - |
| Next.js 静的アセット | Cache First | 永続 |
| 記事プレビュー API | Stale-While-Revalidate | 5分 |
| 購入済み記事本文 | 明示的キャッシュ（ユーザー操作）| 永続 |
| マップタイル | Network First → Cache | 1日 |
| 著者アバター・サムネ画像 | Cache First | 7日 |

### 6.2 オフライン記事保存

- 購入後、記事画面に「オフラインで保存」ボタン
- IndexedDB に記事 JSON + 画像（ブロブ）を保存
- マップタイルはビューポート分のみ事前キャッシュ
- ストレージ上限：`navigator.storage.estimate()` で確認、上限近くで警告

### 6.3 Web Push 通知

- VAPID キーで認証
- 通知トリガー：
  - 著者の新記事公開
  - 旅行N日前リマインド
  - 旅程の同行者編集通知
  - クライシス情報（旅程に該当する場合）
  - 購入完了
- iOS 16.4+ 制約：ホーム画面追加が前提

---

## 7. セキュリティ・プライバシー

### 7.1 認証認可

- Supabase Auth：JWT (RS256)
- セッション：HttpOnly, Secure, SameSite=Lax Cookie
- リフレッシュトークン：Supabase 標準
- Backend：JWT 検証 → Guard でユーザーID取得 → RLS と二重チェック
- 管理者ロール：別途 `editor_users` テーブル + 多要素認証

### 7.2 個人情報保護

- 居住認証書類：
  - クライアント側で暗号化してアップロード
  - 復号鍵は別の KMS（Phase 1: Supabase Vault、Phase 2: AWS KMS 等）
  - 30日経過で自動削除
- 決済情報：Stripe に委譲、自社では保持しない（PCI DSS 簡素化）
- 個人情報：プライバシーポリシーで明示、最小限取得

### 7.3 不正対策

| 攻撃 | 対策 |
|------|-----|
| 自作自演レビュー | 評価は購入者のみ、決済アカウント単位で1票、外れ値検知 |
| 業者の偽記事量産 | 居住認証必須化、Tier B は価格上限低、AI で類似度検知 |
| アカウント乗っ取り | 多要素認証（オプション）、不審ログイン通知 |
| カード不正利用 | Stripe Radar、3D Secure 必須化 |
| 記事の海賊版（スクショ転売）| ウォーターマーク、購入者ID埋め込み（HTML/CSS）、スクショ検知（アプリ側）|
| API スパム | Rate Limit（IP/ユーザー別）、CAPTCHA（必要時）|
| DDoS | Cloudflare WAF |

### 7.4 通報・モデレーション

- 記事下に通報ボタン（理由カテゴリ選択）
- 管理画面で運営が確認、72時間以内に一次対応
- 通報多数の記事は自動的に「審査中」フラグ → 編集者に通知

---

## 8. スケーラビリティと運用

### 8.1 想定負荷

| 指標 | M3 | M6 | M12 | M24 |
|-----|----|----|-----|-----|
| MAU | 1,000 | 5,000 | 30,000 | 200,000 |
| 1日あたりリクエスト | 10K | 50K | 300K | 2M |
| DB サイズ | 1 GB | 5 GB | 30 GB | 200 GB |
| ストレージサイズ | 10 GB | 50 GB | 300 GB | 2 TB |

### 8.2 ボトルネック対策

- **記事フィード**：Redis でランキング結果をキャッシュ（TTL 5分）
- **マップビューポートクエリ**：PostGIS GIST インデックス + 結果キャッシュ
- **Algolia 検索**：直接フロントから API 叩き、バックエンド経由しない
- **画像配信**：Cloudflare CDN で完結、オリジンへの負荷ゼロ
- **Distance Matrix API**：旅程単位で結果キャッシュ（同じスポット組合せは再計算しない）

### 8.3 観測

- **メトリクス**：Vercel Analytics + PostHog
- **エラー**：Sentry（フロント・バック両方）
- **ログ**：Better Stack / Axiom（構造化ログ JSON）
- **アラート**：
  - エラー率 > 1% で Slack 通知
  - DB 接続数 > 80% で警告
  - Stripe Webhook 失敗で即時通知
  - 月次精算バッチ失敗で即時通知

---

## 9. コスト試算（月額、JPY）

### 9.1 M3（MAU 1,000 / GMV ¥100,000）

| 項目 | 金額 | 備考 |
|-----|-----|-----|
| Vercel Pro | ¥3,000 | $20/mo |
| Supabase Pro | ¥3,750 | $25/mo |
| Railway (Backend) | ¥3,000 | $20/mo |
| Cloudflare R2 | ¥1,500 | ストレージ50GB |
| Algolia Free | ¥0 | 無料枠内 |
| Upstash Redis | ¥0 | 無料枠 |
| Sentry Team | ¥4,000 | $26/mo |
| PostHog | ¥0 | 無料枠 |
| Resend | ¥0 | 無料枠 |
| Google Maps Platform | ¥10,000 | Distance Matrix + Maps SDK |
| Stripe | ¥3,600 | GMV の 3.6% |
| ドメイン・SSL | ¥1,000 | |
| **合計** | **約¥30,000** | |

### 9.2 M12（MAU 30,000 / GMV ¥10,000,000）

| 項目 | 金額 |
|-----|-----|
| Vercel Pro | ¥10,000 |
| Supabase Pro+ | ¥30,000 |
| Railway | ¥15,000 |
| Cloudflare R2 | ¥10,000 |
| Algolia Build | ¥30,000 |
| Upstash Redis | ¥5,000 |
| Sentry | ¥10,000 |
| PostHog Pro | ¥15,000 |
| Resend | ¥5,000 |
| Google Maps Platform | ¥150,000 |
| Stripe | ¥360,000 |
| Wise / Payoneer 送金手数料 | ¥30,000 |
| **合計** | **約¥670,000** |

GMV 1,000万円から手数料収益（平均15%として）¥1,500,000、コスト ¥670,000 → 営業利益 ¥830,000/月。

### 9.3 コスト最適化ポイント

- Google Maps Platform が最大変動費 → Distance Matrix のキャッシュが効く
- Stripe の比率はGMV比例 → 手数料率を上げない限り削減困難
- Algolia は記事数 ≦ 10,000 までは安価、超えたら自前 Meilisearch 検討

---

## 10. デプロイ・CI/CD

### 10.1 環境

| 環境 | 用途 | URL |
|-----|-----|-----|
| Local | 開発 | localhost |
| Preview | PR ごとの自動デプロイ | `*.locore-preview.vercel.app` |
| Staging | 統合テスト | staging.locore.app |
| Production | 本番 | locore.app |

### 10.2 CI パイプライン（GitHub Actions）

```
on: pull_request
jobs:
  lint:           # ESLint, Prettier, TypeScript
  test:           # Vitest（unit）, Playwright（E2E）
  build:          # Next.js + NestJS ビルド検証
  e2e-staging:    # Playwright on Vercel Preview URL
  security:      # Snyk / Dependabot
```

### 10.3 リリース戦略

- `main` ブランチへのマージで Production 自動デプロイ
- DB マイグレーション：`prisma migrate deploy` を Vercel Build Hook で実行
- ロールバック：Vercel の Instant Rollback、DB は手動

---

## 11. ローカル開発環境

```bash
# 必須
node >= 20
pnpm >= 9
docker (Postgres / Redis ローカル)

# セットアップ
pnpm install
cp .env.example .env.local      # Supabase, Stripe, Google Maps の test キー
pnpm db:up                       # Docker で Postgres + Redis 起動
pnpm db:migrate                  # マイグレーション適用
pnpm db:seed                     # サンプルデータ投入
pnpm dev                         # Next.js + NestJS 同時起動
```

`.env.example` には全環境変数のキーをドキュメント化（値はダミー）。

---

## 12. オープンクエスチョン（要決定事項）

1. **モノレポ vs マルチレポ**
   - 推奨：モノレポ（pnpm workspace + Turborepo）
   - 理由：型共有、スキーマ共有、原子的変更
2. **GraphQL を採用するか**
   - 推奨：MVP は REST、Phase 2 で必要なら追加
3. **マイグレーション管理ツール**
   - 候補：Prisma / Drizzle / Kysely
   - 推奨：Drizzle（型安全、軽量、Supabase との相性良）
4. **ORM vs Query Builder**
   - 推奨：Drizzle（Query Builder 寄り、PostGIS の生 SQL も書きやすい）
5. **テスト戦略の詳細**
   - 単体テスト：Vitest
   - E2E：Playwright
   - 視覚回帰：Chromatic（Phase 2）
6. **デザインシステム実装**
   - 推奨：shadcn/ui ベース + 独自トークン
7. **i18n の初期準備**
   - 推奨：Phase 1 から `next-intl` で日本語のみ運用、Phase 3 で英語追加時にスムーズ

---

## 13. 改訂履歴

| バージョン | 日付 | 変更内容 | 担当 |
|---------|-----|--------|-----|
| 0.1 | 2026-05-06 | 初稿作成（Phase 1 MVP 対象）| yuhi |

---

**END OF DOCUMENT**
