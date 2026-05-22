-- 0052_marketplace_schema.sql
--
-- 海外在住日本人向け スキル・人脈マーケットプレイスへの拡張 (PRD: docs/marketplace-design.md)。
--
-- このマイグレーションは「スキーマだけ」を入れる:
--   - 13 個の pgEnum
--   - 10 個の新規テーブル (seller_profiles / listings / listing_options /
--     orders / order_messages / order_reviews / commission_rules /
--     escrow_ledger / user_grants / disputes)
--   - 既存 users への stripe_connect_account_id 追加
--   - 既存 articles への related_listing_id 追加
--   - 主要インデックス (検索・運営・自動 release 用)
--
-- 含めないもの (別ファイルで後日):
--   - 料率テーブル初期データ (commission_rules の INSERT)
--   - サンプル listings / orders
--   - RLS ポリシー (0053 で予定)
--   - トリガ (updated_at 自動更新等)
--
-- 適用手順: Supabase Studio の SQL Editor でこのファイルを丸ごと貼り付けて実行。
-- 冪等: CREATE TYPE/TABLE/INDEX は IF NOT EXISTS / DO $$ ... $$ パターンで再実行 OK。
--
-- 関連 Drizzle スキーマ: packages/db/src/schema/{marketplace_enums,seller_profiles,
--   listings,listing_options,orders,order_messages,order_reviews,
--   commission_rules,escrow_ledger,user_grants,disputes}.ts

BEGIN;

-- =========================================================================
-- 0. ENUMS
--    CREATE TYPE は IF NOT EXISTS が無いので DO ブロックでガード
-- =========================================================================

DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM (
    'draft', 'pending_review', 'published', 'paused', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pricing_model AS ENUM (
    'fixed', 'hourly', 'daily', 'per_item', 'quote_only', 'tiered'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE listing_category AS ENUM (
    -- A. 外向き
    'procurement', 'attend', 'photography', 'translation',
    'research', 'consulting', 'logistics',
    -- B. 現地日本人同士
    'childcare', 'tutoring', 'beauty', 'food', 'lesson',
    'handyman', 'family_photo', 'tax_admin',
    -- C. アクセス・コーディネート
    'access_fashion', 'access_wine', 'access_gastronomy', 'access_art',
    -- B2B
    'b2b_research', 'b2b_sourcing',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'requested', 'accepted', 'declined', 'paid', 'scheduled',
    'in_progress', 'completed', 'released', 'cancelled', 'disputed', 'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_actor AS ENUM ('buyer', 'seller', 'system', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE commission_rule_kind AS ENUM (
    'founder_grant', 'repeat_discount', 'category_base',
    'global_cap', 'promotion'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dispute_status AS ENUM (
    'open', 'investigating', 'awaiting_party',
    'resolved_release', 'resolved_refund_full', 'resolved_refund_partial',
    'closed_no_action'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dispute_reason AS ENUM (
    'not_delivered', 'not_as_described', 'quality_issue', 'late',
    'damaged_item', 'communication_breakdown', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE kyc_status AS ENUM (
    'not_started', 'in_progress', 'pending_review',
    'approved', 'rejected', 'restricted'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_grant_type AS ENUM (
    'founder_50', 'founder_half', 'referral_bonus', 'manual_override'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_grant_status AS ENUM (
    'active', 'consumed', 'expired', 'revoked'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE escrow_entry_type AS ENUM (
    'charge', 'hold', 'transfer', 'platform_fee', 'stripe_fee',
    'refund_full', 'refund_partial', 'adjustment'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE message_moderation_flag AS ENUM (
    'none', 'email_masked', 'phone_masked', 'sns_handle_masked',
    'url_masked', 'circumvention_phrase', 'multiple'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =========================================================================
-- 1. ALTER existing tables
-- =========================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;

CREATE INDEX IF NOT EXISTS users_stripe_connect_acct_idx
  ON users (stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

COMMENT ON COLUMN users.stripe_connect_account_id IS
  'マーケットプレイス出品者の Stripe Connect Express acct_xxx。詳細は seller_profiles。';

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS related_listing_id uuid;
-- FK は listings 作成後に追加する (循環順序のため後段で ALTER)

COMMENT ON COLUMN articles.related_listing_id IS
  '記事末尾に差し込む listings.id。NULL = 紐付け無し。';


-- =========================================================================
-- 2. seller_profiles
-- =========================================================================

CREATE TABLE IF NOT EXISTS seller_profiles (
  user_id                    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  business_name              text,
  stripe_connect_account_id  text,
  stripe_charges_enabled     boolean      NOT NULL DEFAULT false,
  stripe_payouts_enabled     boolean      NOT NULL DEFAULT false,
  payout_currency            text         NOT NULL DEFAULT 'EUR',
  kyc_status                 kyc_status   NOT NULL DEFAULT 'not_started',
  kyc_reviewed_at            timestamptz,
  kyc_reviewed_by            uuid         REFERENCES users(id) ON DELETE SET NULL,
  languages_offered          jsonb        NOT NULL DEFAULT '[]'::jsonb,
  response_time_hours        integer,
  total_orders               integer      NOT NULL DEFAULT 0,
  completed_orders           integer      NOT NULL DEFAULT 0,
  repeat_rate_pct            integer,
  avg_rating                 integer,
  review_count               integer      NOT NULL DEFAULT 0,
  dispute_rate_pct           integer,
  credentials                jsonb        NOT NULL DEFAULT '[]'::jsonb,
  accepting_orders           boolean      NOT NULL DEFAULT true,
  seller_bio                 text,
  created_at                 timestamptz  NOT NULL DEFAULT now(),
  updated_at                 timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seller_profiles_stripe_acct_idx
  ON seller_profiles (stripe_connect_account_id);
CREATE INDEX IF NOT EXISTS seller_profiles_kyc_status_idx
  ON seller_profiles (kyc_status);
CREATE INDEX IF NOT EXISTS seller_profiles_accepting_idx
  ON seller_profiles (accepting_orders) WHERE accepting_orders = true;


-- =========================================================================
-- 3. listings
-- =========================================================================

CREATE TABLE IF NOT EXISTS listings (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id                uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title                    text NOT NULL,
  summary                  text,
  description              text NOT NULL,
  category                 listing_category NOT NULL,
  tags                     text[] NOT NULL DEFAULT '{}',
  city_id                  uuid REFERENCES cities(id) ON DELETE SET NULL,
  delivery_mode            text NOT NULL DEFAULT 'in_person',
  pricing_model            pricing_model NOT NULL,
  price_amount_minor       integer,
  price_currency           text NOT NULL,
  price_range_min_minor    integer,
  price_range_max_minor    integer,
  min_quantity             integer,
  max_quantity             integer,
  cover_image_url          text,
  gallery_images           jsonb NOT NULL DEFAULT '[]'::jsonb,
  faq                      jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  status                   listing_status NOT NULL DEFAULT 'draft',
  published_at             timestamptz,
  view_count               integer NOT NULL DEFAULT 0,
  order_count              integer NOT NULL DEFAULT 0,
  is_sample                boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz,
  CONSTRAINT listings_delivery_mode_chk
    CHECK (delivery_mode IN ('in_person', 'online', 'shipping', 'hybrid')),
  CONSTRAINT listings_price_currency_chk
    CHECK (char_length(price_currency) = 3),
  CONSTRAINT listings_quantity_chk
    CHECK (min_quantity IS NULL OR max_quantity IS NULL OR min_quantity <= max_quantity)
);

CREATE INDEX IF NOT EXISTS listings_seller_idx        ON listings (seller_id);
CREATE INDEX IF NOT EXISTS listings_status_idx        ON listings (status, published_at DESC);
CREATE INDEX IF NOT EXISTS listings_city_idx          ON listings (city_id);
CREATE INDEX IF NOT EXISTS listings_category_idx      ON listings (category, status, published_at DESC);
CREATE INDEX IF NOT EXISTS listings_is_sample_idx     ON listings (is_sample);
-- 全文検索プレースホルダ: tags GIN は後日 (検索 UX 詰める段階で)
CREATE INDEX IF NOT EXISTS listings_tags_gin_idx      ON listings USING GIN (tags);

-- articles.related_listing_id の FK を listings 作成後に追加 (循環順序)
DO $$ BEGIN
  ALTER TABLE articles
    ADD CONSTRAINT articles_related_listing_fk
    FOREIGN KEY (related_listing_id) REFERENCES listings(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS articles_related_listing_idx
  ON articles (related_listing_id)
  WHERE related_listing_id IS NOT NULL;


-- =========================================================================
-- 4. listing_options
-- =========================================================================

CREATE TABLE IF NOT EXISTS listing_options (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id           uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  name                 text NOT NULL,
  description          text,
  price_amount_minor   integer NOT NULL,
  is_absolute          boolean NOT NULL DEFAULT true,
  position             integer NOT NULL DEFAULT 0,
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_options_listing_idx     ON listing_options (listing_id);
CREATE INDEX IF NOT EXISTS listing_options_listing_pos_idx ON listing_options (listing_id, position);


-- =========================================================================
-- 5. orders
-- =========================================================================

CREATE TABLE IF NOT EXISTS orders (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number                text NOT NULL UNIQUE,
  buyer_id                    uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_id                   uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  listing_id                  uuid NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
  listing_option_id           uuid REFERENCES listing_options(id) ON DELETE SET NULL,
  listing_snapshot            jsonb NOT NULL DEFAULT '{}'::jsonb,
  status                      order_status NOT NULL DEFAULT 'requested',
  currency                    text NOT NULL,
  amount_subtotal_minor       integer NOT NULL,
  amount_platform_fee_minor   integer NOT NULL DEFAULT 0,
  amount_tax_minor            integer NOT NULL DEFAULT 0,
  amount_total_minor          integer NOT NULL,
  amount_seller_net_minor     integer NOT NULL DEFAULT 0,
  quantity                    integer NOT NULL DEFAULT 1,
  commission_rule_snapshot    jsonb NOT NULL DEFAULT '{}'::jsonb,
  buyer_display_currency      text,
  buyer_display_amount_minor  integer,
  buyer_display_fx_rate       text,
  buyer_note                  text,
  seller_quote_note           text,
  scheduled_start             timestamptz,
  scheduled_end               timestamptz,
  stripe_payment_intent_id    text,
  stripe_charge_id            text,
  stripe_transfer_id          text,
  stripe_refund_id            text,
  accepted_at                 timestamptz,
  paid_at                     timestamptz,
  completed_at                timestamptz,
  released_at                 timestamptz,
  cancelled_at                timestamptz,
  refunded_at                 timestamptz,
  declined_at                 timestamptz,
  auto_release_at             timestamptz,
  auto_decline_at             timestamptz,
  repeat_index                integer NOT NULL DEFAULT 1,
  metadata                    jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_sample                   boolean NOT NULL DEFAULT false,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_currency_chk CHECK (char_length(currency) = 3),
  CONSTRAINT orders_amount_total_nonneg  CHECK (amount_total_minor    >= 0),
  CONSTRAINT orders_amount_seller_nonneg CHECK (amount_seller_net_minor >= 0),
  CONSTRAINT orders_quantity_pos         CHECK (quantity > 0),
  CONSTRAINT orders_no_self_trade        CHECK (buyer_id <> seller_id)
);

CREATE INDEX IF NOT EXISTS orders_buyer_idx         ON orders (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_seller_idx        ON orders (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_listing_idx       ON orders (listing_id);
CREATE INDEX IF NOT EXISTS orders_status_idx        ON orders (status);
CREATE INDEX IF NOT EXISTS orders_stripe_pi_idx     ON orders (stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS orders_auto_release_idx
  ON orders (auto_release_at)
  WHERE status IN ('completed') AND auto_release_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_auto_decline_idx
  ON orders (auto_decline_at)
  WHERE status IN ('requested') AND auto_decline_at IS NOT NULL;


-- =========================================================================
-- 6. order_messages
-- =========================================================================

CREATE TABLE IF NOT EXISTS order_messages (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                        uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  actor                           order_actor NOT NULL,
  sender_id                       uuid REFERENCES users(id) ON DELETE SET NULL,
  body_raw                        text NOT NULL,
  body_masked                     text NOT NULL,
  moderation_flag                 message_moderation_flag NOT NULL DEFAULT 'none',
  moderation_detail               jsonb NOT NULL DEFAULT '[]'::jsonb,
  system_event                    text,
  system_payload                  jsonb NOT NULL DEFAULT '{}'::jsonb,
  attachments                     jsonb NOT NULL DEFAULT '[]'::jsonb,
  sender_warning_count_snapshot   integer NOT NULL DEFAULT 0,
  read_by_buyer_at                timestamptz,
  read_by_seller_at               timestamptz,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  edited_at                       timestamptz,
  deleted_at                      timestamptz
);

CREATE INDEX IF NOT EXISTS order_messages_order_created_idx
  ON order_messages (order_id, created_at);
CREATE INDEX IF NOT EXISTS order_messages_moderation_idx
  ON order_messages (moderation_flag)
  WHERE moderation_flag <> 'none';


-- =========================================================================
-- 7. order_reviews
-- =========================================================================

CREATE TABLE IF NOT EXISTS order_reviews (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id               uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  direction              text NOT NULL,
  author_id              uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  subject_id             uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  rating                 integer NOT NULL,
  communication_rating   integer,
  quality_rating         integer,
  value_rating           integer,
  body                   text,
  tags                   text[] NOT NULL DEFAULT '{}',
  visible_at             timestamptz,
  deadline_at            timestamptz NOT NULL,
  is_public              boolean NOT NULL DEFAULT false,
  is_sample              boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_reviews_rating_chk    CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT order_reviews_direction_chk CHECK (direction IN ('buyer_to_seller','seller_to_buyer')),
  CONSTRAINT order_reviews_tags_len_chk
    CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 3),
  CONSTRAINT order_reviews_comm_chk    CHECK (communication_rating IS NULL OR communication_rating BETWEEN 1 AND 5),
  CONSTRAINT order_reviews_quality_chk CHECK (quality_rating       IS NULL OR quality_rating       BETWEEN 1 AND 5),
  CONSTRAINT order_reviews_value_chk   CHECK (value_rating         IS NULL OR value_rating         BETWEEN 1 AND 5),
  CONSTRAINT order_reviews_no_self     CHECK (author_id <> subject_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS order_reviews_order_direction_uq
  ON order_reviews (order_id, direction);
CREATE INDEX IF NOT EXISTS order_reviews_subject_idx ON order_reviews (subject_id);
CREATE INDEX IF NOT EXISTS order_reviews_author_idx  ON order_reviews (author_id);
CREATE INDEX IF NOT EXISTS order_reviews_visible_idx
  ON order_reviews (visible_at)
  WHERE is_public = true;


-- =========================================================================
-- 8. commission_rules
-- =========================================================================

CREATE TABLE IF NOT EXISTS commission_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            commission_rule_kind NOT NULL,
  category        listing_category,
  priority        integer NOT NULL DEFAULT 100,
  active_from     timestamptz,
  active_until    timestamptz,
  params          jsonb NOT NULL DEFAULT '{}'::jsonb,
  description     text NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commission_rules_category_only_for_base
    CHECK (
      (kind = 'category_base' AND category IS NOT NULL)
      OR
      (kind <> 'category_base' AND category IS NULL)
    ),
  CONSTRAINT commission_rules_window_chk
    CHECK (active_from IS NULL OR active_until IS NULL OR active_from < active_until)
);

CREATE INDEX IF NOT EXISTS commission_rules_kind_active_idx
  ON commission_rules (kind, is_active);
CREATE INDEX IF NOT EXISTS commission_rules_priority_idx
  ON commission_rules (priority);
CREATE INDEX IF NOT EXISTS commission_rules_category_idx
  ON commission_rules (category);


-- =========================================================================
-- 9. escrow_ledger
-- =========================================================================

CREATE TABLE IF NOT EXISTS escrow_ledger (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  entry_type         escrow_entry_type NOT NULL,
  amount_minor       integer NOT NULL,
  currency           text NOT NULL,
  stripe_object_id   text,
  counterparty_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  memo               text,
  metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at        timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT escrow_ledger_currency_chk CHECK (char_length(currency) = 3)
);

CREATE INDEX IF NOT EXISTS escrow_ledger_order_idx
  ON escrow_ledger (order_id, occurred_at);
CREATE INDEX IF NOT EXISTS escrow_ledger_entry_type_idx
  ON escrow_ledger (entry_type);
CREATE INDEX IF NOT EXISTS escrow_ledger_stripe_obj_idx
  ON escrow_ledger (stripe_object_id);


-- =========================================================================
-- 10. user_grants
-- =========================================================================

CREATE TABLE IF NOT EXISTS user_grants (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grant_type        user_grant_type NOT NULL,
  scope             text NOT NULL DEFAULT 'seller',
  params            jsonb NOT NULL DEFAULT '{}'::jsonb,
  remaining_uses    integer,
  consumed_count    integer NOT NULL DEFAULT 0,
  status            user_grant_status NOT NULL DEFAULT 'active',
  valid_from        timestamptz NOT NULL DEFAULT now(),
  valid_until       timestamptz,
  reason            text,
  granted_by        uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_grants_scope_chk
    CHECK (scope IN ('seller', 'buyer', 'both')),
  CONSTRAINT user_grants_remaining_nonneg
    CHECK (remaining_uses IS NULL OR remaining_uses >= 0)
);

CREATE INDEX IF NOT EXISTS user_grants_user_active_idx
  ON user_grants (user_id, status);
CREATE INDEX IF NOT EXISTS user_grants_grant_type_idx
  ON user_grants (grant_type);
CREATE INDEX IF NOT EXISTS user_grants_valid_until_idx
  ON user_grants (valid_until)
  WHERE status = 'active';


-- =========================================================================
-- 11. disputes
-- =========================================================================

CREATE TABLE IF NOT EXISTS disputes (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                 uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  initiator_id             uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  initiator_role           text NOT NULL,
  reason                   dispute_reason NOT NULL,
  description              text NOT NULL,
  evidence                 jsonb NOT NULL DEFAULT '[]'::jsonb,
  status                   dispute_status NOT NULL DEFAULT 'open',
  assigned_admin_id        uuid REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes         text,
  refund_amount_minor      integer,
  platform_fee_outcome     text,
  first_response_at        timestamptz,
  resolved_at              timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT disputes_initiator_role_chk
    CHECK (initiator_role IN ('buyer', 'seller')),
  CONSTRAINT disputes_fee_outcome_chk
    CHECK (platform_fee_outcome IS NULL OR platform_fee_outcome IN ('keep','waive','half'))
);

CREATE INDEX IF NOT EXISTS disputes_order_idx     ON disputes (order_id);
CREATE INDEX IF NOT EXISTS disputes_status_idx    ON disputes (status, created_at);
CREATE INDEX IF NOT EXISTS disputes_initiator_idx ON disputes (initiator_id);
CREATE INDEX IF NOT EXISTS disputes_assigned_idx  ON disputes (assigned_admin_id);


-- =========================================================================
-- 12. COMMENTS (運営ドキュメント代わり)
-- =========================================================================

COMMENT ON TABLE listings           IS 'スキル / 人脈マーケットプレイスの出品。決済を伴う取引可能アイテム。';
COMMENT ON TABLE listing_options    IS 'Listing の階層オプション (tiered モデルや追加オプション)。';
COMMENT ON TABLE orders             IS '取引のメインテーブル。状態機械: requested→accepted→paid→...→released/refunded。';
COMMENT ON TABLE order_messages     IS '取引スレッド。連絡先マスキング適用済。';
COMMENT ON TABLE order_reviews      IS '取引後の双方向レビュー (buyer↔seller)。締切 14 日。';
COMMENT ON TABLE commission_rules   IS '料率エンジンの設定。優先順位で評価し snapshot を orders に保存。';
COMMENT ON TABLE escrow_ledger      IS 'エスクロー資金移動の append-only 台帳。Stripe Connect のミラー。';
COMMENT ON TABLE user_grants        IS '創業メンバー特典 / 紹介ボーナス等の期間 / 回数限定権利。';
COMMENT ON TABLE disputes           IS '取引紛争。1 order 1 active dispute を想定。';
COMMENT ON TABLE seller_profiles    IS '出品者プロフィール拡張 + KYC + Connect ステータス。';

COMMIT;
