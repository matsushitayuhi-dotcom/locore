-- 0088_sns_link_previews.sql
--
-- エキスパートページの「発信・メディア」セクション（docs/experts-media-display-research.md）。
-- sns_links に「リンクの種類」「プレビュー（タイトル・説明・画像）」「表示形式」「並び順」を追加し、
-- /experts/[id] でリンクごとに featured / card / button で見せられるようにする。
--
--   kind            profile（アカウント・トップ）/ video / article / post / podcast
--   title ほか      サーバー側で 1 回だけ取得した OG / oEmbed の結果。本人が上書き可
--   display         auto（platform と kind から自動）/ icon / button / card / featured / embed
--   sort_order      セクション内の並び（小さいほど先）
--   preview_*       取得日時と結果（ok / failed）。再取得ボタンで更新
--
-- すべて additive。既存データ・既存テーブルを破壊しない。
-- コード側（lib/residents/byId.ts）は本カラム未適用の環境でも try/catch で従来の
-- {platform, url} にフォールバックして動作継続する。手動適用前提（0080〜0087 と同じ思想）。
--
-- 適用手順（Supabase）:
--   1. Supabase Dashboard → SQL Editor を開く。
--   2. このファイルの内容を貼り付けて Run。
--   （ローカルでは `psql "$DATABASE_URL" -f packages/db/migrations/manual/0088_sns_link_previews.sql` でも可）

ALTER TABLE sns_links ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'profile';
ALTER TABLE sns_links ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE sns_links ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE sns_links ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE sns_links ADD COLUMN IF NOT EXISTS site_name text;
ALTER TABLE sns_links ADD COLUMN IF NOT EXISTS display text NOT NULL DEFAULT 'auto';
ALTER TABLE sns_links ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE sns_links ADD COLUMN IF NOT EXISTS preview_fetched_at timestamptz;
ALTER TABLE sns_links ADD COLUMN IF NOT EXISTS preview_status text;

COMMENT ON COLUMN sns_links.kind IS 'リンクの種類: profile / video / article / post / podcast（URL から自動判定。apps/web/lib/media/linkPreview.ts）';
COMMENT ON COLUMN sns_links.display IS '表示形式: auto / icon / button / card / featured / embed（auto は platform と kind から決める）';
COMMENT ON COLUMN sns_links.image_url IS 'OG / oEmbed から取得したサムネ URL（外部）。本人が上書き可。表示は referrerPolicy=no-referrer + フォールバック';
