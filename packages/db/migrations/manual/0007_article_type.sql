-- 0007_article_type.sql
-- 記事の種別タグ（スポット紹介 vs 旅程プラン）を追加。
--
-- - 'spot_guide': 個別の店・場所を紹介する記事
-- - 'itinerary' : 時間軸ありのコース・モデルプラン
--
-- 既存記事は spot_guide でデフォルト（後方互換）。
-- 既存の duration_type（half_day/full_day/...）とは別概念。

-- 1) ENUM 型の作成
DO $$ BEGIN
  CREATE TYPE article_type AS ENUM ('spot_guide', 'itinerary');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2) articles テーブルに列を追加（後方互換のため NOT NULL DEFAULT 'spot_guide'）
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS article_type article_type NOT NULL DEFAULT 'spot_guide';

-- 3) 公開記事のフィード用部分インデックス
CREATE INDEX IF NOT EXISTS idx_articles_type
  ON articles(article_type, published_at DESC)
  WHERE status = 'published' AND deleted_at IS NULL;
