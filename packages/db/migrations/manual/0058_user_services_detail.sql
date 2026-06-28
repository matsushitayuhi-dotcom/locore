-- 0058_user_services_detail.sql
--
-- user_services を「Airbnb 風の体験詳細ページ」として成立させるための追加カラム群。
-- すべて additive・nullable / default 付きで、既存データを破壊しない。
-- コード側 (getServiceById / featured.ts / actions.ts) は未適用環境でも落ちないよう
-- try/catch フォールバックを持つため、本マイグレーションは手動適用前提（自動実行しない）。
--
--   - gallery_images        追加写真 URL の配列（cover とは別。表示時は cover を先頭に連結）。
--   - duration_label        所要時間ラベル（例 "約2時間"）。
--   - min_participants      最少人数。
--   - max_participants      最多人数。
--   - languages             対応言語の配列（例 ['日本語','フランス語']）。
--   - highlights            体験の特徴（ライムチェックで表示）。
--   - inclusions            含まれるもの（ライムチェックで表示）。
--   - meeting_point_name    集合場所名。
--   - meeting_point_lat     集合場所の緯度。
--   - meeting_point_lng     集合場所の経度。
--   - cancellation_policy   キャンセルポリシー（右カラムの安心注記で表示）。
--
-- 配列カラムは default '{}' を付けるため、未入力でも空配列として安全に読める。
--
-- 適用手順（Supabase）:
--   1. Supabase Dashboard → SQL Editor を開く。
--   2. このファイルの内容を貼り付けて Run。
--   （ローカルでは `psql "$DATABASE_URL" -f packages/db/migrations/manual/0058_user_services_detail.sql` でも可）

ALTER TABLE user_services
  ADD COLUMN IF NOT EXISTS gallery_images text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS duration_label text,
  ADD COLUMN IF NOT EXISTS min_participants integer,
  ADD COLUMN IF NOT EXISTS max_participants integer,
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS highlights text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS inclusions text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS meeting_point_name text,
  ADD COLUMN IF NOT EXISTS meeting_point_lat double precision,
  ADD COLUMN IF NOT EXISTS meeting_point_lng double precision,
  ADD COLUMN IF NOT EXISTS cancellation_policy text;

COMMENT ON COLUMN user_services.gallery_images IS '追加写真 URL の配列（cover とは別。表示時は cover を先頭に連結）。';
COMMENT ON COLUMN user_services.duration_label IS '所要時間ラベル（例 "約2時間"）。nullable。';
COMMENT ON COLUMN user_services.min_participants IS '最少人数。nullable。';
COMMENT ON COLUMN user_services.max_participants IS '最多人数。nullable。';
COMMENT ON COLUMN user_services.languages IS '対応言語の配列（例 [''日本語'',''フランス語'']）。';
COMMENT ON COLUMN user_services.highlights IS '体験の特徴。ライムチェックで表示。';
COMMENT ON COLUMN user_services.inclusions IS '含まれるもの。ライムチェックで表示。';
COMMENT ON COLUMN user_services.meeting_point_name IS '集合場所名。nullable。';
COMMENT ON COLUMN user_services.meeting_point_lat IS '集合場所の緯度。nullable。';
COMMENT ON COLUMN user_services.meeting_point_lng IS '集合場所の経度。nullable。';
COMMENT ON COLUMN user_services.cancellation_policy IS 'キャンセルポリシー。右カラムの安心注記で表示。nullable。';
