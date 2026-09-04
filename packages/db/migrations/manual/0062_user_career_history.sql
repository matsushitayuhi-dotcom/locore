-- 0062_user_career_history.sql
--
-- 学歴・職歴スライス: users に経歴 2 フィールド（jsonb 配列）を追加。
-- エキスパート詳細（/experts/[id]）の「経歴」セクションと、
-- settings/profile の「経歴（任意）」編集フォームで使う。
--
-- すべて additive。既存データ・既存テーブルを破壊しない。
-- コード側（lib/residents/byId.ts）は本カラムが未適用の環境でも try/catch で
-- 空配列にフォールバックして動作継続する。手動適用前提（0058〜0061 と同じ思想）。
--
-- 適用手順（Supabase）:
--   1. Supabase Dashboard → SQL Editor を開く。
--   2. このファイルの内容を貼り付けて Run。
--   （ローカルでは `psql "$DATABASE_URL" -f packages/db/migrations/manual/0062_user_career_history.sql` でも可）

ALTER TABLE users ADD COLUMN IF NOT EXISTS education jsonb NOT NULL DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_history jsonb NOT NULL DEFAULT '[]';

COMMENT ON COLUMN users.education IS
  '学歴の配列 [{ school, degree?, field?, startYear?, endYear? }]。本人申告。エキスパート詳細の「経歴」に表示。';
COMMENT ON COLUMN users.work_history IS
  '職歴の配列 [{ company, title?, startYear?, endYear?, current? }]。本人申告。current=true は「現在」（endYear は無視）。';
