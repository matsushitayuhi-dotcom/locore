-- 0059_community_amenities_geo.sql
--
-- community_posts を「Airbnb 風の住居詳細ページ」として成立させるための追加カラム群。
-- すべて additive・nullable / default 付きで、既存データを破壊しない。
-- コード側 (getCommunityPost / createCommunityPost / updateApartmentDetails) は
-- 未適用環境でも落ちないよう try/catch フォールバックを持つため、
-- 本マイグレーションは手動適用前提（自動実行しない）。
--
--   - amenities   設備キーの配列（例 ['wifi','kitchen','washer','heating','aircon','elevator']）。
--                 ラベル⇔キーの写像は apps/web/lib/community/constants.ts の APARTMENT_AMENITIES。
--   - latitude    物件のおおよその緯度（番地特定を避けるため表示側で約100mグリッドに丸める）。
--   - longitude   物件のおおよその経度（同上）。
--
-- 適用手順（Supabase）:
--   1. Supabase Dashboard → SQL Editor を開く。
--   2. このファイルの内容を貼り付けて Run。
--   （ローカルでは `psql "$DATABASE_URL" -f packages/db/migrations/manual/0059_community_amenities_geo.sql` でも可）

ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS amenities text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

COMMENT ON COLUMN community_posts.amenities IS '設備キーの配列（例 [''wifi'',''kitchen'',''washer'']）。ラベル写像は APARTMENT_AMENITIES。';
COMMENT ON COLUMN community_posts.latitude IS '物件のおおよその緯度。表示時に約100mグリッドへ丸めて正確な番地を秘匿する。nullable。';
COMMENT ON COLUMN community_posts.longitude IS '物件のおおよその経度。表示時に約100mグリッドへ丸めて正確な番地を秘匿する。nullable。';
