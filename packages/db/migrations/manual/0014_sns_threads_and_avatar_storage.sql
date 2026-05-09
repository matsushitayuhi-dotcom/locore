-- 0014_sns_threads_and_avatar_storage.sql
--
-- (1) sns_platform enum に 'threads' を追加。
--     Postgres 14+ なら ADD VALUE が可能（IF NOT EXISTS 付きで冪等）。
--
-- (2) Supabase Storage の `profile-avatars` バケット（公開, JPEG/PNG/WebP/GIF）の
--     RLS ポリシー。article-images と同じく、認証ユーザーは自分の userId
--     フォルダ配下にだけ書き込める。
--
-- 適用方法:
--   バケット `profile-avatars` を Dashboard で先に作成（Public, max 5MB ほど）。
--   そのあと SQL Editor で本ファイルを実行。

-- =====================================================
-- (1) sns_platform enum に threads を追加 + 同プラットフォーム複数登録を許可
-- =====================================================
ALTER TYPE sns_platform ADD VALUE IF NOT EXISTS 'threads' AFTER 'x';

-- 同じユーザー × 同じプラットフォームの登録は 1 件まで、という制約を撤廃
-- （個人 / 仕事用 / サブアカ等で複数 URL を登録できるようにする）
DROP INDEX IF EXISTS sns_links_user_platform_uq;

-- =====================================================
-- (2) profile-avatars Storage RLS
-- =====================================================
DROP POLICY IF EXISTS "profile-avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "profile-avatars user insert own folder" ON storage.objects;
DROP POLICY IF EXISTS "profile-avatars user update own folder" ON storage.objects;
DROP POLICY IF EXISTS "profile-avatars user delete own folder" ON storage.objects;

CREATE POLICY "profile-avatars public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'profile-avatars');

CREATE POLICY "profile-avatars user insert own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "profile-avatars user update own folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "profile-avatars user delete own folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
