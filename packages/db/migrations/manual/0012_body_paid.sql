-- 0012_body_paid.sql
-- 記事本文を「無料部分（プレビュー）」と「有料部分（購入後表示）」に明示的に分けるカラム。
--
-- 設計：
--   * `body`        … 無料プレビュー本文（既存カラムを再定義／用途を明確化）
--   * `body_paid`   … 購入後に表示される本文。NULL の場合は paywall の旧ロジック
--                     （body の冒頭2段落を free、残りを paid とみなすフォールバック）が動く。
--
-- 既存記事はマイグレーション後 `body_paid IS NULL` のままで動作互換が保たれる。
-- 新しく書く / 編集する記事は両方を別々に保存する。

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS body_paid text;

COMMENT ON COLUMN articles.body IS
  '無料プレビュー本文（読み手は購入前に読める）。Markdown。';
COMMENT ON COLUMN articles.body_paid IS
  '有料部分の本文（購入後に表示）。NULL のときは body の途中で自動分割する旧仕様にフォールバック。';
