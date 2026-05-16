-- 0041_residency_verification_enhancements.sql
--
-- 居住確認 (residency_verifications) のフロー本実装に伴う拡張。
--
-- 1. 既存カラムの documentUrlEnc (text) は 1 ファイルしか持てなかったが、
--    実運用では「光熱費 + 賃貸契約」のように複数ファイル提出が普通なので
--    document_paths (jsonb) を追加して文字列配列で持つ。
--    既存の documentUrlEnc は NOT NULL のままだとマイグレーション後の
--    INSERT が面倒なので NULLABLE に変更しておく (将来的に削除可能)。
-- 2. 自己申告フィールドを追加: country, city, user_note
-- 3. 編集者用フィールドを追加: reviewer_note, rejected_reason
-- 4. GDPR 配慮の files_deleted_at を追加 (30 日後 cron で物理削除した時刻)
-- 5. Supabase Storage 'verification-docs' バケット (private) を作成し、
--    所有者本人と editor ロールだけが読めるよう RLS を設定

ALTER TABLE residency_verifications
  ALTER COLUMN document_url_enc DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS document_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS user_note text,
  ADD COLUMN IF NOT EXISTS reviewer_note text,
  ADD COLUMN IF NOT EXISTS rejected_reason text,
  ADD COLUMN IF NOT EXISTS files_deleted_at timestamptz;

COMMENT ON COLUMN residency_verifications.document_paths IS
  'Supabase Storage パス配列。例: ["userId/uuid1.pdf", "userId/uuid2.jpg"]';
COMMENT ON COLUMN residency_verifications.country IS '自己申告: ISO 2 文字';
COMMENT ON COLUMN residency_verifications.city IS '自己申告: 都市名';
COMMENT ON COLUMN residency_verifications.user_note IS '提出者からの補足';
COMMENT ON COLUMN residency_verifications.reviewer_note IS '編集者の内部メモ';
COMMENT ON COLUMN residency_verifications.rejected_reason IS
  '却下時にユーザーへ通知する理由';
COMMENT ON COLUMN residency_verifications.files_deleted_at IS
  'GDPR 配慮で 30 日後に物理削除した時刻。NULL ならまだ生きている';

-- =========================================================================
-- Supabase Storage 'verification-docs' バケット (private)
--   - 所有者本人と editor だけが読める
--   - 認証済みユーザーは自分のフォルダにアップロード可
-- =========================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- 既存ポリシーを drop してから作成 (idempotent)
DROP POLICY IF EXISTS "verification-docs upload self" ON storage.objects;
DROP POLICY IF EXISTS "verification-docs read self or editor" ON storage.objects;
DROP POLICY IF EXISTS "verification-docs delete editor" ON storage.objects;

-- 認証ユーザーは自分の <userId>/ フォルダにアップロード可
CREATE POLICY "verification-docs upload self"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 読取: 本人 OR editor ロール
CREATE POLICY "verification-docs read self or editor"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-docs'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role = 'editor'
      )
    )
  );

-- 削除: editor のみ (cron は service_role で動くので RLS は素通り)
CREATE POLICY "verification-docs delete editor"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'verification-docs'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'editor'
    )
  );
