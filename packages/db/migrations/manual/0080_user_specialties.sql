-- 0080_user_specialties.sql
--
-- エキスパートの「得意分野」（統制リスト・2 階層）。users に第 2 階層 code の配列を追加。
-- 定義と根拠: docs/experts-specialty-taxonomy.md / apps/web/lib/experts/specialties.ts
-- /experts のカード（ホバーで得意分野チップ）と一覧の列・フィルタ、settings/profile の登録で使う。
--
-- すべて additive。既存データ・既存テーブルを破壊しない。
-- コード側（lib/experts/specialtiesByUser.ts）は本カラム未適用の環境でも try/catch で
-- 空配列にフォールバックして動作継続する。手動適用前提（0058〜0062 と同じ思想）。
-- 番号は 0080 番台（0063〜 は別セッションで予約済み）。
--
-- 適用手順（Supabase）:
--   1. Supabase Dashboard → SQL Editor を開く。
--   2. このファイルの内容を貼り付けて Run。
--   （ローカルでは `psql "$DATABASE_URL" -f packages/db/migrations/manual/0080_user_specialties.sql` でも可）

ALTER TABLE users ADD COLUMN IF NOT EXISTS specialties text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN users.specialties IS
  '得意分野（第 2 階層 code の配列。最大 6 件、第 1 階層は 3 つまで）。統制リストは apps/web/lib/experts/specialties.ts。本人申告。';

-- 一覧の「テーマ列」判定で配列包含検索をするため GIN を張る（小規模では不要だが将来の絞り込み用）
CREATE INDEX IF NOT EXISTS users_specialties_gin_idx ON users USING GIN (specialties);
