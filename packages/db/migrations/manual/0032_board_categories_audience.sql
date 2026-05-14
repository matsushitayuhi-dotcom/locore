-- 0032_board_categories_audience.sql
--
-- 掲示板に「カテゴリ」と「対象（旅行者 / 駐在員）」の 2 軸を追加。
--
-- 経緯:
--   - 当初は board_posts はイベント情報だけだったが、駐在員向けの情報
--     （行政締切、食・季節、コミュニティ、子育て、健康・天候）も載せる方針に。
--   - 旅行者と駐在員ではほしい情報がはっきり違うので、対象タグで切り分ける。
--   - 旅行者向けタグはイベントカテゴリにだけ付く想定（他は全部駐在員向け）。

-- カテゴリ
--   'event'           : イベント全般（マルシェ、展示、フェス、ソルドもここに含む）
--   'admin'           : 行政・締切（確定申告、滞在許可更新、CAF、TVA など）
--   'food_season'     : 食・季節食材（白アスパラ解禁、ジビエ、ボージョレー解禁など）
--   'community'       : 日本人コミュニティ（在仏邦人会、日本酒会、邦人クリエイター展）
--   'family_edu'      : 子育て・教育（学校休暇、ワクチン、補習校イベント、親子イベント）
--   'health_weather'  : 天候・健康警報（カニキュル、PM2.5、花粉 — 緊急時のみ投稿）
ALTER TABLE board_posts
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'event';

-- 対象
--   'both'      : 旅行者・駐在員どちらにも有用
--   'traveler'  : 旅行者向け（短期滞在で活きる情報）
--   'resident'  : 駐在員向け（住んでないと活きない、または住んでる人だけに刺さる）
--
-- 運用ルール（アプリ側で enforce）:
--   - category='event' → audience は 'both' | 'traveler' | 'resident' 任意
--   - それ以外のカテゴリ → audience は常に 'resident'
ALTER TABLE board_posts
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'both';

-- 検索インデックス
CREATE INDEX IF NOT EXISTS board_posts_category_idx ON board_posts(category);
CREATE INDEX IF NOT EXISTS board_posts_audience_idx ON board_posts(audience);

-- 既存データの調整
--   - 既存の AI 自動収集 (source='ai_event') はイベント・両対象として残す
--   - manual の既存 post も「event/both」として扱う（後で運営が必要に応じて更新）
UPDATE board_posts
SET category = 'event', audience = 'both'
WHERE category IS NULL OR audience IS NULL;
