-- 0015_spot_place_details.sql
--
-- spots テーブルに Google Places から取得した拡張データを保持するカラムを追加。
-- マップのポップアップや旅程編成で「Google から来た正式情報」を表示するため。
--
-- 既存の `google_place_id` と `opening_hours` (jsonb) はそのまま使う。

ALTER TABLE spots
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS google_rating numeric(3, 1),
  ADD COLUMN IF NOT EXISTS google_user_ratings_total integer,
  ADD COLUMN IF NOT EXISTS google_price_level integer,
  ADD COLUMN IF NOT EXISTS google_types text[];

-- カテゴリ別検索を別途貼っているのでここでは追加 index は不要。
COMMENT ON COLUMN spots.phone_number IS 'Google Places から取得した電話番号（formatted）';
COMMENT ON COLUMN spots.website IS 'Google Places から取得した公式サイト URL';
COMMENT ON COLUMN spots.google_rating IS 'Google Places の星評価（0.0-5.0）';
COMMENT ON COLUMN spots.google_user_ratings_total IS 'Google Places の評価件数';
COMMENT ON COLUMN spots.google_price_level IS 'Google の価格レベル（0=無料 ～ 4=とても高価）';
COMMENT ON COLUMN spots.google_types IS 'Google Places の types[]（cafe, restaurant, ...）';
