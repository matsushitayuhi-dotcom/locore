-- 0011_cleanup_samples.sql
-- サンプルデータ（is_sample = true）の一括削除。
--
-- マイグレーション 0010 / 0019 で is_sample カラムが入っているテーブル全部を
-- 依存順に削除する。

BEGIN;

-- 旅程系（trip_items → trip_days → trips）
DELETE FROM trip_items WHERE is_sample;
DELETE FROM trip_days  WHERE is_sample;
DELETE FROM trips      WHERE is_sample;

-- レビュー → 購入 → 記事
DELETE FROM reviews   WHERE is_sample;
DELETE FROM purchases WHERE is_sample;

-- 編集系
DELETE FROM collection_articles
  WHERE collection_id IN (SELECT id FROM editor_collections WHERE is_sample);
DELETE FROM editor_collections WHERE is_sample;

-- ライト旅行記
DELETE FROM light_diaries WHERE is_sample;

-- クライシス
DELETE FROM crisis_events WHERE is_sample;

-- 記事系（spots は cascade で消えるが明示）
DELETE FROM spots    WHERE is_sample;
DELETE FROM articles WHERE is_sample;

-- 著者プロファイル → ユーザー
DELETE FROM writer_profiles WHERE is_sample;
DELETE FROM users           WHERE is_sample;

COMMIT;
