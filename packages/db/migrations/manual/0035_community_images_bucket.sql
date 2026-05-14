-- 0035_community_images_bucket.sql
--
-- コミュニティ投稿（アパート / 売買 / レッスン等）用の画像バケットを作成し、
-- RLS を設定する。
--
-- バケット名: 'community-images'
--   Public read（誰でも参照可）
--   認証済みユーザーは自分の <userId>/<file>.{jpg,png,...} にだけ書き込み可
--   削除も自分のパスのみ
--
-- 既存の article-images / profile-avatars と同じ構造。

INSERT INTO storage.buckets (id, name, public)
VALUES ('community-images', 'community-images', true)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- RLS ポリシー
-- =========================================================================

-- 公開閲覧
DROP POLICY IF EXISTS "community-images public read" ON storage.objects;
CREATE POLICY "community-images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-images');

-- 認証ユーザーは自分の <userId>/... にだけ書き込み可
DROP POLICY IF EXISTS "community-images self insert" ON storage.objects;
CREATE POLICY "community-images self insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'community-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "community-images self update" ON storage.objects;
CREATE POLICY "community-images self update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'community-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "community-images self delete" ON storage.objects;
CREATE POLICY "community-images self delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'community-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
