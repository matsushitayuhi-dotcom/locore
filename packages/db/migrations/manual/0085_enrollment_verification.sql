-- 0085_enrollment_verification.sql
--
-- 本人確認を「在籍確認」（留学特化）に寄せる。
--   - 書類タイプに 入学証明書・在籍証明書 / 学生証 / 卒業証書・学位記 を追加
--   - residency_verifications に kind（identity | enrollment）と school_name を追加
-- 既存の身分証系（passport 等）はそのまま受け付ける（kind='identity'）。
-- 判定ロジック（最新申請が approved → 認証済み）は変えない。
--
-- すべて additive。既存データ・既存テーブルを破壊しない。手動適用前提。
-- 番号は 0085（0081〜0084 は他スライスで使用済み）。
--
-- 適用手順（Supabase）:
--   1. Supabase Dashboard → SQL Editor を開く。
--   2. このファイルの内容を貼り付けて Run。
--   （ローカルでは `psql "$DATABASE_URL" -f packages/db/migrations/manual/0085_enrollment_verification.sql` でも可）

ALTER TYPE residency_document_type ADD VALUE IF NOT EXISTS 'enrollment_certificate';
ALTER TYPE residency_document_type ADD VALUE IF NOT EXISTS 'student_id';
ALTER TYPE residency_document_type ADD VALUE IF NOT EXISTS 'diploma';

ALTER TABLE residency_verifications
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'identity';
ALTER TABLE residency_verifications
  ADD COLUMN IF NOT EXISTS school_name text;

COMMENT ON COLUMN residency_verifications.kind IS
  '申請の種別。identity = 身分証による本人確認（旧来）、enrollment = 在籍確認（入学証明書 / 学生証 / 卒業証書）。';
COMMENT ON COLUMN residency_verifications.school_name IS
  '在籍確認で申告した学校名（書類との照合用。表示は users.education が正）。';
