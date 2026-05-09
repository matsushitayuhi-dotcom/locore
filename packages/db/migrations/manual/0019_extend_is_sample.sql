-- 0019_extend_is_sample.sql
--
-- is_sample フラグを残りのテーブル（purchases / reviews / trips / trip_days /
-- trip_items / crisis_events）にも展開し、フィードや map / 記事詳細など
-- すべての画面が DB 由来のデータだけで動くようにする。
--
-- さらに、サンプル trips は通常の RLS（owner_id = auth.uid()）だと誰にも見えない
-- ため、is_sample = true の行はパブリック読み取りを許可するポリシーを追加する。

-- =====================================================
-- 列の追加
-- =====================================================
ALTER TABLE purchases     ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE reviews       ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE trips         ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE trip_days     ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE trip_items    ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE crisis_events ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;

-- 部分インデックス（true のみ index 対象）
CREATE INDEX IF NOT EXISTS purchases_is_sample_idx     ON purchases(is_sample)     WHERE is_sample;
CREATE INDEX IF NOT EXISTS reviews_is_sample_idx       ON reviews(is_sample)       WHERE is_sample;
CREATE INDEX IF NOT EXISTS trips_is_sample_idx         ON trips(is_sample)         WHERE is_sample;
CREATE INDEX IF NOT EXISTS crisis_events_is_sample_idx ON crisis_events(is_sample) WHERE is_sample;

-- =====================================================
-- RLS：サンプルデータを公開（プロト用）
-- =====================================================
-- trips: 通常は owner_id ベース。サンプル行は誰でも閲覧可能に。
DROP POLICY IF EXISTS "trips sample public read" ON trips;
CREATE POLICY "trips sample public read"
  ON trips FOR SELECT
  USING (is_sample = true);

DROP POLICY IF EXISTS "trip_days sample public read" ON trip_days;
CREATE POLICY "trip_days sample public read"
  ON trip_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = trip_days.trip_id AND t.is_sample = true
    )
  );

DROP POLICY IF EXISTS "trip_items sample public read" ON trip_items;
CREATE POLICY "trip_items sample public read"
  ON trip_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM trip_days d
      JOIN trips t ON t.id = d.trip_id
      WHERE d.id = trip_items.trip_day_id AND t.is_sample = true
    )
  );

-- reviews: 既に "public read" ポリシーが入っているので追加不要。
-- crisis_events: 既に status='published' のパブリック read ポリシーがある。
-- サンプル crisis_events は status='published' で投入する想定。
