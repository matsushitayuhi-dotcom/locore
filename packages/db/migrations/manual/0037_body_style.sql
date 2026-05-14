-- 0037_body_style.sql
--
-- 方針変更:
--   photo_journal を articleType ではなく「本文スタイル (body_style)」として扱う。
--   articleType は spot_guide / itinerary / expat_info の 3 種に戻す。
--   写真ジャーナル形式は articleType と独立して選べる本文の見せ方になる。
--
--   body_style:
--     'photo_journal' (default): 写真 + キャプション + 場所のインスタ風
--     'classic'                : 従来のブログ風テキスト本文
--
--   既存記事:
--     - articleType='photo_journal' だった記事 → spot_guide に移行 + body_style='photo_journal'
--     - それ以外の既存記事 → body_style='classic'（本文を持つので）
--     - 新規記事のデフォルトは 'photo_journal'

-- 1. body_style カラム追加（デフォルト photo_journal）
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS body_style text NOT NULL DEFAULT 'photo_journal';

-- 2. 既存記事のスタイルを判定:
--    photo_entries が空でなければ photo_journal、それ以外は classic
UPDATE articles
SET body_style = CASE
  WHEN jsonb_array_length(coalesce(photo_entries, '[]'::jsonb)) > 0
    THEN 'photo_journal'
  ELSE 'classic'
END
-- created_at で「既存データ全部」と判定（マイグレーション実行時点）
WHERE updated_at < now() + interval '1 second';

-- 3. 旧 article_type='photo_journal' の記事を spot_guide に統合
--    enum 値自体は残しておく（DROP できないので無視）
UPDATE articles
SET article_type = 'spot_guide', body_style = 'photo_journal'
WHERE article_type = 'photo_journal';

-- 4. 検索 / フィルタのためのインデックス
CREATE INDEX IF NOT EXISTS articles_body_style_idx ON articles(body_style);
