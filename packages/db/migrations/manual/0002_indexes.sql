-- 0002_indexes.sql
-- drizzle-kit DSL で表現できないインデックス（GIST / GIN / 部分インデックス）。
-- drizzle-kit 生成 SQL の後に適用する。

-- 地理インデックス（PostGIS）
CREATE INDEX IF NOT EXISTS idx_spots_location ON spots USING GIST (location);

-- 公開記事フィード用の部分インデックス（ホット記事）
CREATE INDEX IF NOT EXISTS idx_articles_published
  ON articles (city_id, published_at DESC)
  WHERE status = 'published' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_articles_writer_published
  ON articles (writer_id, published_at DESC)
  WHERE status = 'published' AND deleted_at IS NULL;

-- 審査待ち記事のキュー
CREATE INDEX IF NOT EXISTS idx_articles_pending_review
  ON articles (status, created_at)
  WHERE status = 'pending_review';

-- タイトル全文検索（pg_trgm）— Algolia がメインだが運用補助
CREATE INDEX IF NOT EXISTS idx_articles_title_trgm
  ON articles USING gin (title gin_trgm_ops);

-- アクティブな危機イベント（NOW() は IMMUTABLE でないため WHERE 句から外し、
-- ends_at をインデックスキーに含めてクエリ側で `ends_at > NOW()` を絞る）
CREATE INDEX IF NOT EXISTS idx_crisis_active
  ON crisis_events (city_id, severity, ends_at)
  WHERE status = 'published';

-- 完了済み購入のみインデックス（認可チェック用）
CREATE INDEX IF NOT EXISTS idx_purchases_buyer_article_completed
  ON purchases (buyer_id, article_id)
  WHERE status = 'completed';

-- 未削除ユーザーのみ
CREATE INDEX IF NOT EXISTS idx_users_active
  ON users (id)
  WHERE deleted_at IS NULL;
