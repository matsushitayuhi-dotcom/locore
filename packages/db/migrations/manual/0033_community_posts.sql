-- 0033_community_posts.sql
--
-- 駐在員コミュニティ系の投稿テーブル。求人・アパート・売買・メンバー募集・
-- レッスン・助け合いの 6 種類を 1 テーブルに統合（kind 列で分岐）。
--
-- 設計方針:
--   1. Locore は仲介のみ。契約・物の受け渡し・支払いの責任は投稿者と応募者に帰属。
--      これを RLS と UI 両面で明示する。
--   2. 個人連絡先（電話番号・私用メール・住所詳細など）は metadata 内で隔離し、
--      本人と応募者しか見えないように扱う（将来的に RLS で contact 列を別管理）。
--      MVP では「本文に直接電話番号やメールを書かない」を UI で警告。
--   3. 期限切れ自動 (expired) は別途 cron 想定。とりあえずカラムだけ用意。
--   4. 投稿者だけが update / delete 可。閲覧は status='active' なら誰でも。

-- =========================================================================
-- ENUM
-- =========================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'community_post_kind') THEN
    CREATE TYPE community_post_kind AS ENUM (
      'job',          -- 求人
      'apartment',    -- アパート（賃貸/シェア/短期）
      'marketplace',  -- 売ります・買います
      'group',        -- メンバー募集
      'lesson',       -- 教えます・習います
      'mutual_aid'    -- 助け合い
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'community_post_status') THEN
    CREATE TYPE community_post_status AS ENUM (
      'active',  -- 募集中
      'closed',  -- 締切済 / 成立済（投稿者が手動で）
      'expired'  -- 期限切れ（cron が自動で）
    );
  END IF;
END $$;

-- =========================================================================
-- community_posts
-- =========================================================================
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind community_post_kind NOT NULL,
  /** 投稿者 = 募集者 / 出品者。author = 責任主体 */
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  title text NOT NULL,
  body text NOT NULL,

  -- 地理
  city_id uuid REFERENCES cities(id) ON DELETE SET NULL,
  /** 地区名や駅名など。例: "11区 Belleville 近く" "Châtelet 駅徒歩 3 分" */
  location_text text,

  -- 価格関連（kind ごとに使い方が変わる）
  --   job        : 給与（年収 or 時給）
  --   apartment  : 家賃（月額）
  --   marketplace: 売値
  --   lesson     : 1 回 / 月額
  --   group      : 通常 NULL（会費があるグループのみ入る）
  --   mutual_aid : NULL（無償が原則）
  price_amount integer,
  /** 通貨。'EUR' or 'JPY'。Phase 2 で国際展開時には enum 化 */
  price_currency text DEFAULT 'EUR',
  /** 'monthly' | 'hourly' | 'annual' | 'fixed' | 'per_session' | 'negotiable' */
  price_unit text,

  -- 写真（アパート / 売買で必須に近い）
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,

  /**
   * 連絡導線。
   *   'locore_message' : Locore のメッセージ機能（chat_threads）経由（推奨）
   *   'reply_form'     : フォームから簡易応募
   * メールアドレスや電話番号は本文に書かせず、応募フローはアプリ内で完結させる。
   */
  contact_method text NOT NULL DEFAULT 'locore_message',

  /**
   * kind 固有のメタデータ。スキーマは lib/community/constants.ts に定義。
   *
   *   job:        { employment_type, salary_period, language_requirements,
   *                remote_ok, category, hours_per_week, experience_required }
   *   apartment:  { rent_monthly, deposit, bedrooms, size_sqm, furnished,
   *                short_term, available_from, available_until, arrondissement,
   *                utilities_included, no_smoking, no_pets }
   *   marketplace:{ condition, category, pickup_required, delivery_available }
   *   group:      { meeting_frequency, skill_level, group_size, age_range }
   *   lesson:     { format, skill, level, trial_available, max_students }
   *   mutual_aid: { request_type, urgency }
   */
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- 期限・状態管理
  status community_post_status NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  closed_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,

  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_posts_kind_status_idx
  ON community_posts(kind, status, created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_author_idx
  ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS community_posts_city_idx
  ON community_posts(city_id);
CREATE INDEX IF NOT EXISTS community_posts_expires_idx
  ON community_posts(expires_at)
  WHERE status = 'active';

DROP TRIGGER IF EXISTS trg_community_posts_set_updated_at ON community_posts;
CREATE TRIGGER trg_community_posts_set_updated_at
  BEFORE UPDATE ON community_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- RLS
-- =========================================================================
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- 公開閲覧: active の投稿は誰でも見られる
DROP POLICY IF EXISTS "community_posts read active" ON community_posts;
CREATE POLICY "community_posts read active"
  ON community_posts FOR SELECT
  USING (status = 'active');

-- 投稿者は自分の投稿を常時閲覧可（closed / expired も含む）
DROP POLICY IF EXISTS "community_posts read own" ON community_posts;
CREATE POLICY "community_posts read own"
  ON community_posts FOR SELECT
  USING (auth.uid() = author_id);

-- 認証済みユーザーは自分名義で投稿可
DROP POLICY IF EXISTS "community_posts insert self" ON community_posts;
CREATE POLICY "community_posts insert self"
  ON community_posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- 投稿者のみ更新可
DROP POLICY IF EXISTS "community_posts update own" ON community_posts;
CREATE POLICY "community_posts update own"
  ON community_posts FOR UPDATE
  USING (auth.uid() = author_id);

-- 投稿者のみ削除可
DROP POLICY IF EXISTS "community_posts delete own" ON community_posts;
CREATE POLICY "community_posts delete own"
  ON community_posts FOR DELETE
  USING (auth.uid() = author_id);
