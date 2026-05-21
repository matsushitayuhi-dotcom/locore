-- 0050_user_services_cover_image.sql
--
-- user_services にカバー画像 URL を追加。
-- /explore /expat のカルーセルやプロフィール上の提供サービス一覧で、
-- サービスごとに視覚的なイメージを出せるようにする。
--
-- 適用手順: Supabase Studio の SQL Editor でこのファイルを丸ごと貼り付けて実行してください。
-- 冪等: ADD COLUMN IF NOT EXISTS で再実行 OK。

BEGIN;

ALTER TABLE user_services
  ADD COLUMN IF NOT EXISTS cover_image_url text;

COMMENT ON COLUMN user_services.cover_image_url IS 'カバー画像の Public URL (Supabase Storage の article-images バケットを再利用)。NULL = 画像なし';

COMMIT;
