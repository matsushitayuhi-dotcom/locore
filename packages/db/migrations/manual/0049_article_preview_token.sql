-- 0049_article_preview_token.sql
--
-- ライターが下書き / 未公開記事を第三者 (編集者・友人・クライアント) に
-- 見せるための magic-link 用カラムを articles テーブルに追加する。
--
-- 設計:
--   - preview_token: UUID v4。NULL なら共有リンク無効。
--     アプリ側で uuid v4 を生成して保存する (DB の gen_random_uuid に頼らない
--     のは、トークン無効化を「単純な NULL 設定」で済ませたいため)。
--   - preview_token_expires_at: 有効期限 (timestamptz)。
--     アプリは 14 日後を入れる想定。NULL のときは無期限扱いだが、
--     現状の機能としては必ず期限ありで発行する。
--   - 検索用に preview_token に部分 unique index を張る。
--     - WHERE preview_token IS NOT NULL で NULL を除外
--     - UNIQUE で同じ token を持つ別記事の発生を防ぐ
--
-- 注意:
--   - 公開済み記事 (status='published') でも token を発行できるが、
--     その場合「リンクを知っている人にも届く」プレビューを別途見せる
--     だけで、公開ステータスや課金状態は触らない。
--   - RLS: articles テーブルに対する SELECT は既存ポリシー (writer 本人 or
--     editor or published) で十分なので、トークン経由アクセスは
--     /preview/[token] 側で service role 相当の getDb() 経由で
--     行う前提 (token 自体が認証情報を兼ねる)。

BEGIN;

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS preview_token uuid,
  ADD COLUMN IF NOT EXISTS preview_token_expires_at timestamptz;

-- token は NULL を許容するため部分 unique
CREATE UNIQUE INDEX IF NOT EXISTS articles_preview_token_unique
  ON articles(preview_token)
  WHERE preview_token IS NOT NULL;

COMMIT;
