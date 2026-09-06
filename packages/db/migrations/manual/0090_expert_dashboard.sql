-- 0090_expert_dashboard.sql
--
-- エキスパートのマイページ（/dashboard・docs/expert-dashboard-design.md）。
--   1. profile_view_daily   /experts/[id] の閲覧数を日次で集計（本人・editor・bot は除外。IP は保存しない）
--   2. expert_milestones    達成したマイルストーン（初回達成時に 1 行。通知・トーストの重複防止）
--   3. users.monthly_goal_bookings  本人が決める「今月の相談件数」の目標（null = 未設定）
--
-- すべて additive。既存データ・既存テーブルを破壊しない。
-- コード側（apps/web/lib/dashboard/*）は未適用環境でも try/catch で 0 件・未設定にフォールバックする。
--
-- 適用手順（Supabase）: SQL Editor に貼り付けて Run。
--   （ローカルでは `psql "$DATABASE_URL" -f packages/db/migrations/manual/0090_expert_dashboard.sql` でも可）

CREATE TABLE IF NOT EXISTS profile_view_daily (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day date NOT NULL,
  views integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
COMMENT ON TABLE profile_view_daily IS 'エキスパート公開プロフィール（/experts/[id]）の閲覧数（日次・UTC）。本人・editor・bot UA は除外。個人は特定しない。';

CREATE TABLE IF NOT EXISTS expert_milestones (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code text NOT NULL,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, code)
);
COMMENT ON TABLE expert_milestones IS 'ダッシュボードのマイルストーン達成記録。code は apps/web/lib/dashboard/milestones.ts の定義。';

ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_goal_bookings integer;
COMMENT ON COLUMN users.monthly_goal_bookings IS 'ダッシュボードの「今月の目標」（相談件数）。null = 未設定。';
