-- 0091_article_blocks.sql
--
-- ブログ記事（エキスパートの読みもの）の刷新（docs/blog-article-page-research.md）。
--   subtitle  1 文の要約（タイトルの下。検索から来た人に「何が分かるか」）
--   lead      リード文（本文の前・3 行以内）
--   topic     得意分野の第 1 階層 code（apps/web/lib/experts/specialties.ts の SPECIALTY_GROUPS）
--   blocks    本文のブロック配列（段落・見出し・引用・表・画像・リンクカード・埋め込み …）。
--             型は apps/web/lib/articles/blocks.ts。body_style = 'blocks' の記事で使う。
--             旧記事（body のプレーンテキスト / Markdown）は blocks NULL のまま表示側で段落に分割する
--
-- すべて additive。既存データ・既存テーブルを破壊しない。手動適用前提（0080〜0090 と同じ思想）。
-- 適用手順（Supabase）: SQL Editor に貼り付けて Run。

ALTER TABLE articles ADD COLUMN IF NOT EXISTS subtitle text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS lead text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS topic text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS blocks jsonb;

COMMENT ON COLUMN articles.subtitle IS '1 文の要約。タイトル直下に出す（0091）';
COMMENT ON COLUMN articles.lead IS 'リード文（本文の前・3 行以内）（0091）';
COMMENT ON COLUMN articles.topic IS '得意分野の第 1 階層 code（SPECIALTY_GROUPS）。記事一覧のテーマタブと関連記事に使う（0091）';
COMMENT ON COLUMN articles.blocks IS '本文のブロック配列（body_style=blocks）。型は apps/web/lib/articles/blocks.ts（0091）';

CREATE INDEX IF NOT EXISTS articles_topic_idx ON articles (topic, published_at);
