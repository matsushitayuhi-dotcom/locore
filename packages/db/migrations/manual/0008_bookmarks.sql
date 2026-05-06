-- 0008_bookmarks.sql
-- ライブラリ機能（記事ブックマーク）用テーブル。
--
-- - 主キー: (user_id, article_id) の複合
-- - 並び替え用に (user_id, created_at DESC) のインデックス
-- - RLS: auth.uid() = user_id でのみ SELECT / INSERT / DELETE 可能（UPDATE は無し）

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, article_id)
);

CREATE INDEX IF NOT EXISTS bookmarks_user_created_idx
  ON bookmarks(user_id, created_at DESC);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- 自分の bookmark のみ読み書きできる
DROP POLICY IF EXISTS "own bookmarks read" ON bookmarks;
CREATE POLICY "own bookmarks read" ON bookmarks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own bookmarks write" ON bookmarks;
CREATE POLICY "own bookmarks write" ON bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own bookmarks delete" ON bookmarks;
CREATE POLICY "own bookmarks delete" ON bookmarks
  FOR DELETE USING (auth.uid() = user_id);
