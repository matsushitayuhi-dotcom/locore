-- 0083_companion_plans.sql
--
-- 伴走スライス: 継続プラン（月定・複数回セッション）= 留学の「出願まるごと伴走」。
--   - user_services.plan_kind: 'single'（単発・既存）/ 'monthly'（継続プラン）
--   - plan_enrollments: プラン契約（親）。booking と同じスナップショット哲学 —
--     プラン名・月額・回数は申込時点の値を固定し、後からメニューが変わっても
--     契約カードの表示が変わらない。
--   - consultation_bookings.enrollment_id: プラン内セッションの紐付け
--     （price_jpy=0 で INSERT され、当月の残回数算出に使う）。
--
-- 決済（Stripe サブスクリプション）は次スライス。status 'past_due' と
-- stripe_subscription_id はそのためのシーム（本スライスでは未使用・NULL 運用）。
--
-- すべて additive。手動適用前提（0061/0062/0081/0082 と同じ思想）。
--
-- 適用手順（Supabase）:
--   1. Supabase Dashboard → SQL Editor を開く。
--   2. このファイルの内容を貼り付けて Run。
--   （ローカルでは `psql "$DATABASE_URL" -f packages/db/migrations/manual/0083_companion_plans.sql` でも可）

-- ---- user_services: プラン種別 ---------------------------------------------

ALTER TABLE user_services
  ADD COLUMN IF NOT EXISTS plan_kind text NOT NULL DEFAULT 'single';
ALTER TABLE user_services
  ADD COLUMN IF NOT EXISTS sessions_per_month integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_services_plan_kind_check'
  ) THEN
    ALTER TABLE user_services
      ADD CONSTRAINT user_services_plan_kind_check
      CHECK (plan_kind IN ('single', 'monthly'));
  END IF;
END $$;

COMMENT ON COLUMN user_services.plan_kind IS
  '''single''=単発セッション（既存・既定）/ ''monthly''=継続プラン（月額・月N回）。';
COMMENT ON COLUMN user_services.sessions_per_month IS
  '継続プランの月あたりセッション回数（plan_kind=''monthly'' のみ使用）。';

-- ---- plan_enrollments: プラン契約 ------------------------------------------

CREATE TABLE IF NOT EXISTS plan_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES user_services(id) ON DELETE SET NULL,
  expert_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- requested（申込中）→ active（承諾・伴走中）/ declined / cancelled（申込側取り下げ）
  -- / ended（伴走終了）。past_due は決済スライス用の予約語（本スライス未使用）
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','active','declined','cancelled','ended','past_due')),
  -- ▼ 申込時点のスナップショット
  plan_title text NOT NULL,
  monthly_price_jpy integer NOT NULL,
  sessions_per_month integer NOT NULL,
  duration_minutes integer NOT NULL,
  commission_rate numeric(4,2) NOT NULL DEFAULT 0.20,
  platform_fee_jpy integer NOT NULL DEFAULT 0,
  request_message text,
  chat_thread_id uuid REFERENCES chat_threads(id) ON DELETE SET NULL,
  responded_at timestamptz,
  ended_at timestamptz,
  -- 決済スライス用シーム（本スライスでは NULL 運用）
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE plan_enrollments IS
  '継続プラン（伴走）の契約。plan_title/monthly_price_jpy 等は申込時点のスナップショット。';

-- 同一プラン × 同一メンバーの申込中/契約中は 1 件まで（再申込は終了後のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plan_enrollments_no_dup_active'
  ) THEN
    ALTER TABLE plan_enrollments
      ADD CONSTRAINT plan_enrollments_no_dup_active
      EXCLUDE (service_id WITH =, member_id WITH =)
      WHERE (status IN ('requested','active'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS plan_enrollments_expert_status_idx
  ON plan_enrollments (expert_id, status);
CREATE INDEX IF NOT EXISTS plan_enrollments_member_status_idx
  ON plan_enrollments (member_id, status);

-- ---- consultation_bookings: プラン内セッションの紐付け ----------------------

ALTER TABLE consultation_bookings
  ADD COLUMN IF NOT EXISTS enrollment_id uuid
    REFERENCES plan_enrollments(id) ON DELETE SET NULL;

COMMENT ON COLUMN consultation_bookings.enrollment_id IS
  '継続プラン契約（plan_enrollments）経由のセッション。NULL = 単発。price_jpy=0 で作られ、当月残回数の算出対象。';

-- 当月残回数の算出用（enrollment_id 付きだけを引く）
CREATE INDEX IF NOT EXISTS consultation_bookings_enrollment_idx
  ON consultation_bookings (enrollment_id, start_at)
  WHERE enrollment_id IS NOT NULL;
