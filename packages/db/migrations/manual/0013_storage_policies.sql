-- 0013_storage_policies.sql
-- Supabase Storage の `article-images` バケットに対する RLS ポリシー。
--
-- バケット内のパス命名規則:
--   <userId>/<uuid>.<ext>   （uploadImage Server Action 側で生成）
--
-- ポリシー方針:
--   * 公開読み取り：誰でも記事画像を閲覧できる（公開バケット同等の体験）
--   * 認証ユーザーは「自分のフォルダ」にだけ INSERT / UPDATE / DELETE できる
--   * 他人のフォルダには触れない（パス先頭のフォルダ名 = auth.uid() で制限）
--
-- 適用方法:
--   Supabase SQL Editor で実行する。
--   ※ バケットそのものは Dashboard → Storage で先に作成しておくこと
--      （Public バケット, Allowed MIME: image/jpeg,image/png,image/webp,image/gif）

-- 既存ポリシー（再実行できるように削除）
DROP POLICY IF EXISTS "article-images public read" ON storage.objects;
DROP POLICY IF EXISTS "article-images user insert own folder" ON storage.objects;
DROP POLICY IF EXISTS "article-images user update own folder" ON storage.objects;
DROP POLICY IF EXISTS "article-images user delete own folder" ON storage.objects;

-- 公開読み取り
CREATE POLICY "article-images public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'article-images');

-- 認証ユーザーは自分の userId フォルダ配下だけアップロードできる
CREATE POLICY "article-images user insert own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'article-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 認証ユーザーは自分の userId フォルダ配下だけ上書きできる
CREATE POLICY "article-images user update own folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'article-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 認証ユーザーは自分の userId フォルダ配下だけ削除できる
CREATE POLICY "article-images user delete own folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'article-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
