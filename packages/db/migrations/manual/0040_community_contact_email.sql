-- 0040_community_contact_email.sql
--
-- コミュニティ投稿に「メールでも連絡可」の選択肢を追加する。
--
-- これまでは Locore メッセージ機能経由のみ (contact_method = 'locore_message')。
-- 投稿者が望むなら直接メールアドレスを公開して、応募側が「メールで問い合わせる」
-- ボタンで mailto: を起動できるようにする。
--
-- セキュリティ注意:
--   - メールアドレスはオプション（NULL OK）
--   - active 投稿の閲覧時にだけ取れる（既存の RLS でカバー）
--   - 自由記述ではなく簡易バリデーション（@ 含む）をアプリ側で

ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS contact_email text;

COMMENT ON COLUMN community_posts.contact_email IS
  '任意。投稿者が公開してもよいメールアドレス。mailto: リンクで使う';
