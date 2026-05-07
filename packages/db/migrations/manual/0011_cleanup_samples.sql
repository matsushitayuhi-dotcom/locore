-- 0011_cleanup_samples.sql
-- サンプルデータ（is_sample = true）の一括削除。
--
-- 使い方:
--   * Supabase SQL Editor で実行
--   * もしくは psql 経由で `psql $DATABASE_URL -f 0011_cleanup_samples.sql`
--
-- FK は ON DELETE CASCADE が設定されているテーブル（spots / writer_profiles /
-- collection_articles / etc.）は users / articles の削除で連鎖削除される。
-- 念のため明示的にも DELETE しておく（本番ユーザーは is_sample=false で守られる）。
--
-- 実行は冪等。サンプルが無ければ 0 行削除されるだけ。

BEGIN;

-- 編集系（編集者ユーザーが消える前に collection_articles を消す）
DELETE FROM collection_articles
  WHERE collection_id IN (SELECT id FROM editor_collections WHERE is_sample);
DELETE FROM editor_collections WHERE is_sample;

-- ライト旅行記
DELETE FROM light_diaries WHERE is_sample;

-- 記事系（spots は cascade で消えるが明示）
DELETE FROM spots WHERE is_sample;
DELETE FROM articles WHERE is_sample;

-- 著者プロファイル → ユーザー
DELETE FROM writer_profiles WHERE is_sample;
DELETE FROM users WHERE is_sample;

COMMIT;
