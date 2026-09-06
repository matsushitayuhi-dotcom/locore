-- 0087_user_admissions.sql
--
-- エキスパートの「合格実績」。留学特化で相談者が最も知りたい「どこに・いつ受かった人か」を
-- プロフィールに持たせる。
--   - 進学した学校: 既存の users.education（jsonb）の各エントリに applicationYear（出願年）を
--     追加（jsonb 内の任意キーなので DDL 不要）。
--   - 進学しなかった合格校: 本カラム users.admissions（jsonb 配列）に持つ。
--     1 件 = { school, degree?, applicationYear?, universityWikidataId?, schoolNameEn? }
--
-- すべて additive。既存データ・既存テーブルを破壊しない。
-- コード側（lib/residents/byId.ts）は本カラム未適用の環境でも try/catch で空配列に
-- フォールバックして動作継続する。手動適用前提（0080〜0086 と同じ思想）。
--
-- 適用手順（Supabase）:
--   1. Supabase Dashboard → SQL Editor を開く。
--   2. このファイルの内容を貼り付けて Run。
--   （ローカルでは `psql "$DATABASE_URL" -f packages/db/migrations/manual/0087_user_admissions.sql` でも可）

ALTER TABLE users ADD COLUMN IF NOT EXISTS admissions jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN users.admissions IS
  '合格校（進学しなかった学校）の配列。{school, degree?, applicationYear?, universityWikidataId?, schoolNameEn?}。進学校は education 側（applicationYear 付き）。本人申告。';
