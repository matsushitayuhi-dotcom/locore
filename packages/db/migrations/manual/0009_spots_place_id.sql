-- 0009_spots_place_id.sql
-- spots テーブルに Google Places の place_id カラムを追加。
--
-- 用途:
--   - 記事編集画面の Google Places Autocomplete から取得した place_id を保存
--   - 後から Places API でスポット写真・営業時間・レーティング等を再取得
--
-- 既存の spots 行は google_place_id = NULL（手動入力分）のままで問題ない。

ALTER TABLE spots ADD COLUMN IF NOT EXISTS google_place_id TEXT;

CREATE INDEX IF NOT EXISTS idx_spots_place_id
  ON spots(google_place_id)
  WHERE google_place_id IS NOT NULL;
