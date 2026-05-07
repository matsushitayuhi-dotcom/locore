-- 0010_is_sample.sql
-- mock データを Supabase に流し込むための識別フラグ。
--   * 投入時 true、`DELETE FROM ... WHERE is_sample = true` で一発でクリーンアップ可能。
--   * 本番ユーザー由来の行は常に false（DEFAULT false）。
--   * インデックスは部分インデックス（is_sample = true のみ）にして、
--     本番クエリへのオーバーヘッドを避ける。

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE writer_profiles ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE spots ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE light_diaries ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE editor_collections ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS users_is_sample_idx
  ON users(is_sample) WHERE is_sample;
CREATE INDEX IF NOT EXISTS articles_is_sample_idx
  ON articles(is_sample) WHERE is_sample;
CREATE INDEX IF NOT EXISTS spots_is_sample_idx
  ON spots(is_sample) WHERE is_sample;
CREATE INDEX IF NOT EXISTS light_diaries_is_sample_idx
  ON light_diaries(is_sample) WHERE is_sample;
