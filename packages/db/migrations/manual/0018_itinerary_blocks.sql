-- 0018_itinerary_blocks.sql
--
-- 旅程プラン（articleType = 'itinerary'）の構造化フォーマットを格納するカラム。
-- 「何時にどのスポット → 移動手段 → 何分」をブロック単位で保持する。
--
-- JSON 形式（クライアント / サーバ共通）:
-- [
--   {
--     "id": "tmp-1",
--     "startTime": "09:00",
--     "endTime": "10:00",
--     "spotId": "uuid|null",     -- spots テーブル参照（null なら freeName 使用）
--     "freeName": "string|null",
--     "notes": "string|null",
--     "transportToNext": "walk|metro|bus|taxi|bike|train|other|null",
--     "travelMinutesAfter": 10
--   }, ...
-- ]
--
-- 表示は記事詳細ページで構造化レンダリング、保存時の編集は ItineraryBlocksEditor。

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS itinerary_blocks jsonb;

COMMENT ON COLUMN articles.itinerary_blocks IS
  '旅程プラン記事の構造化ブロック配列（時刻 / スポット / 移動手段 / 所要時間）';
