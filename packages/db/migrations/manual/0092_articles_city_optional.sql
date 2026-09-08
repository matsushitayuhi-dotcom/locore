-- 0092_articles_city_optional.sql
--
-- articles.city_id を nullable にする。
--
-- 背景: 2026-09 の記事エディタ刷新で、記事は「留学の読みもの」になり都市に紐付かなくなった。
-- それまで createArticleDraft は「最初に見つかった active な city」を勝手に入れていて、
--   - 書き手が選んでいない都市が記事に付く
--   - cities が空の環境では新規作成そのものが落ちる（'対応都市が見つかりません'）
-- という 2 つの実害があった。自動紐付けは廃止し、この列を任意にする。
--
-- 既存行の city_id はそのまま（旅行記事の一覧・検索は今まで通り動く）。
-- 外部キー（cities への restrict）はそのまま残す。additive で破壊しない。
-- 適用手順（Supabase）: SQL Editor に貼り付けて Run。
-- ⚠ アプリのデプロイより先に流すこと。createArticleDraft（apps/web/app/writer/articles/actions.ts）は
--    city_id を渡さなくなったので、未適用のままアプリを出すと新規記事の作成が全件 NOT NULL 違反で落ちる。
-- 何度流しても安全（DROP NOT NULL は冪等）。

ALTER TABLE articles ALTER COLUMN city_id DROP NOT NULL;

COMMENT ON COLUMN articles.city_id IS '都市。読みもの記事（body_style=blocks）は NULL（0092）';
