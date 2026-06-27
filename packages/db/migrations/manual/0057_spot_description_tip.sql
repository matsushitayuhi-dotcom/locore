-- 0057_spot_description_tip.sql
--
-- spots テーブルに「説明(description)」「コツ(tip)」列を追加する（additive・nullable）。
-- 仕様 §3「場所ブロック」の中核 = スポット単位の説明文・コツを成立させるためのもの。
--
--   - description: 場所カード／旅程 stop の本文として表示する説明文（複数行可）。
--   - tip:         場所ごとの「コツ」。表示側でライムの破線ボックスに描画する（1〜数行）。
--
-- どちらも nullable で、未入力（NULL）でも既存表示（住所／営業時間／tags 要約のフォールバック）が
-- そのまま使われる。破壊的変更ではないため既存データへの影響なし。
--
-- 適用手順（Supabase）:
--   1. Supabase Dashboard → SQL Editor を開く。
--   2. このファイルの内容を貼り付けて Run。
--   （ローカルでは `psql "$DATABASE_URL" -f packages/db/migrations/manual/0057_spot_description_tip.sql` でも可）

ALTER TABLE spots
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS tip text;

COMMENT ON COLUMN spots.description IS 'スポット単位の説明文（場所カード／旅程 stop の本文）。nullable。';
COMMENT ON COLUMN spots.tip IS 'スポット単位の「コツ」（ライムの破線ボックスで表示）。nullable。';
