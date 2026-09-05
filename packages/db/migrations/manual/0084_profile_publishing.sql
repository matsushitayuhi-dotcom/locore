-- 0084_profile_publishing.sql
--
-- プロフィール公開関門: 最低要件（学歴/得意分野/メニュー/自己紹介）を満たして
-- 本人が「公開する」を押すまで、/experts に掲載しない。
--   - users.profile_published: 掲載フラグ（既定 false = 下書き）
--   - users.profile_published_at: 公開時刻
--
-- バックフィル: 現行の掲載条件（active な consultation タグ付きメニューを保有）を
-- 満たす既存ユーザーは published=true にする — カットオーバーで誰も一覧から
-- 消えないようにする（新規ユーザーだけが下書きスタート）。
--
-- すべて additive。手動適用前提（0061〜0083 と同じ思想）。
--
-- 適用手順（Supabase）:
--   1. Supabase Dashboard → SQL Editor を開く。
--   2. このファイルの内容を貼り付けて Run。
--   （ローカルでは `psql "$DATABASE_URL" -f packages/db/migrations/manual/0084_profile_publishing.sql` でも可）

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_published boolean NOT NULL DEFAULT false;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_published_at timestamptz;

COMMENT ON COLUMN users.profile_published IS
  'エキスパートプロフィールの公開フラグ。false = 下書き（/experts に出ない・詳細は本人と editor のみ閲覧可）。';
COMMENT ON COLUMN users.profile_published_at IS '公開した時刻（publishProfile）。';

-- 一覧クエリ用の部分 INDEX（公開済みだけを引く）
CREATE INDEX IF NOT EXISTS users_profile_published_idx
  ON users (profile_published)
  WHERE profile_published = true;

-- バックフィル: いま /experts に載っている条件（active な consultation メニュー
-- 保有）を満たすユーザーを公開済みへ。冪等（既に true の行は触らない）。
UPDATE users u
   SET profile_published = true,
       profile_published_at = now()
 WHERE u.profile_published = false
   AND EXISTS (
     SELECT 1 FROM user_services us
      WHERE us.user_id = u.id
        AND us.is_active = true
        AND us.tags @> ARRAY['consultation']::text[]
   );
