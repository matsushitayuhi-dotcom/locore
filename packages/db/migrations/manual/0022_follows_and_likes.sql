-- 0022_follows_and_likes.sql
--
-- ユーザーフォロー機能 + 記事いいね機能。
--
-- ## user_follows
--   フォロワー / フォロイーは公開しないが、合計数だけは公開する。
--   サーバ側のクエリは Drizzle 経由（DATABASE_URL 直結）で RLS をバイパスして
--   COUNT(*) を取れるので、テーブル行自体の SELECT を public に開ける必要はない。
--
-- ## article_likes
--   記事に対する「いいね」。1 ユーザー × 1 記事で 1 票。
--   bookmark とは独立（ブックマークはあとで読み返したい記事、
--   いいねは反応として）。

-- =====================================================
-- user_follows
-- =====================================================
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> followee_id)
);

CREATE INDEX IF NOT EXISTS user_follows_followee_idx ON user_follows(followee_id);

ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- 自分が follower か followee の行のみ閲覧可能（リスト保護）
DROP POLICY IF EXISTS "user_follows owner read" ON user_follows;
CREATE POLICY "user_follows owner read"
  ON user_follows FOR SELECT
  USING (auth.uid() = follower_id OR auth.uid() = followee_id);

-- 自分が follower の行のみ作成 / 削除可能
DROP POLICY IF EXISTS "user_follows self write" ON user_follows;
CREATE POLICY "user_follows self write"
  ON user_follows FOR ALL
  USING (auth.uid() = follower_id);

-- =====================================================
-- article_likes
-- =====================================================
CREATE TABLE IF NOT EXISTS article_likes (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, article_id)
);

CREATE INDEX IF NOT EXISTS article_likes_article_idx ON article_likes(article_id);

ALTER TABLE article_likes ENABLE ROW LEVEL SECURITY;

-- 自分のいいねだけ閲覧 / 作成 / 削除可能
DROP POLICY IF EXISTS "article_likes self all" ON article_likes;
CREATE POLICY "article_likes self all"
  ON article_likes FOR ALL
  USING (auth.uid() = user_id);
