-- 0029_countries_and_regions.sql
--
-- 地理階層を「国 (countries) → 地域 (cities)」の 2 層構造に拡張する。
--
-- 設計方針:
--   - cities は「ある国の中の単一の旅行スコープ」を表す。
--     1 都市（パリ）でも、広めの地域（トスカーナ）でも、国全体の「その他」でもよい。
--   - kind カラムでスコープ種別を区別する。
--   - cities をそのまま「region」として運用する（テーブル名は維持して FK 影響を最小化）。
--   - 各国に必ず kind='other' の region を 1 つ持たせる（「その他」カテゴリ）。
--   - status カラムで「公開中 / Coming Soon / 非表示」を制御。
--
-- リサーチに基づく階層:
--   ISO 3166-1 alpha-2 (FR/JP/US/...) を country code として使う。
--   region は ISO 3166-2 まで降りるとデータが膨大なので、旅行プラットフォーム
--   として実用的な粒度（都市 / 広域エリア / その他）で運用する。
--   Wikivoyage や Lonely Planet の階層と近い。

-- =========================================================================
-- countries テーブル
-- =========================================================================
CREATE TABLE IF NOT EXISTS countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  /** ISO 3166-1 alpha-2 (FR / JP / GB / US 等)。lowercase で統一。 */
  code text NOT NULL UNIQUE,
  name_ja text NOT NULL,
  name_en text NOT NULL,
  /** 大陸グルーピング（世界ピッカー UI 用）*/
  continent text NOT NULL,
  /** 'active' | 'coming_soon' | 'hidden' */
  status text NOT NULL DEFAULT 'coming_soon',
  /** 世界ピッカーでの表示順（昇順）*/
  position integer NOT NULL DEFAULT 100,
  /** 国旗 emoji (🇫🇷 等) */
  emoji text,
  /** 国カードのカバー画像 */
  hero_image_url text,
  /** 短い説明（世界ピッカーで小さく表示）*/
  short_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS countries_status_idx ON countries(status);
CREATE INDEX IF NOT EXISTS countries_continent_idx ON countries(continent);
CREATE INDEX IF NOT EXISTS countries_position_idx ON countries(position);

DROP TRIGGER IF EXISTS trg_countries_set_updated_at ON countries;
CREATE TRIGGER trg_countries_set_updated_at
  BEFORE UPDATE ON countries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "countries public read" ON countries;
CREATE POLICY "countries public read"
  ON countries FOR SELECT
  USING (true);

-- =========================================================================
-- cities (= regions) 拡張
-- =========================================================================
-- 既存: id, slug, name_ja, country (text), lat, lng, timezone, is_active, timestamps
-- 追加:
--   country_id uuid FK -> countries(id)
--   kind text ('metro' | 'area' | 'other' | 'city')
--   position int
--   name_en text
--   emoji text
--   hero_image_url text
--   parent_id uuid FK -> cities(id)  (サブエリア用、例: パリの「マレ地区」)

ALTER TABLE cities
  ADD COLUMN IF NOT EXISTS country_id uuid REFERENCES countries(id) ON DELETE RESTRICT;
ALTER TABLE cities
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'city';
ALTER TABLE cities
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 100;
ALTER TABLE cities
  ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE cities
  ADD COLUMN IF NOT EXISTS emoji text;
ALTER TABLE cities
  ADD COLUMN IF NOT EXISTS hero_image_url text;
ALTER TABLE cities
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES cities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS cities_country_idx ON cities(country_id);
CREATE INDEX IF NOT EXISTS cities_kind_idx ON cities(kind);
CREATE INDEX IF NOT EXISTS cities_parent_idx ON cities(parent_id);

-- =========================================================================
-- Seed: 主要国 + 各国の代表都市 + 各国「その他」
-- =========================================================================
-- Phase 1 として France のみ status='active'、他は coming_soon。
-- 各国に kind='other' の region を 1 つずつ作って、その他カテゴリの受け皿に。

INSERT INTO countries (code, name_ja, name_en, continent, status, position, emoji, short_description)
VALUES
  -- ヨーロッパ
  ('fr', 'フランス',     'France',          'europe',       'active',       10, '🇫🇷', 'パリを起点に、ワインの郷とプロヴァンスへ'),
  ('it', 'イタリア',     'Italy',           'europe',       'coming_soon',  20, '🇮🇹', 'ローマ・トスカーナ・南イタリア'),
  ('es', 'スペイン',     'Spain',           'europe',       'coming_soon',  30, '🇪🇸', 'バルセロナ・マドリード・アンダルシア'),
  ('gb', 'イギリス',     'United Kingdom',  'europe',       'coming_soon',  40, '🇬🇧', 'ロンドン・エディンバラ・コッツウォルズ'),
  ('de', 'ドイツ',       'Germany',         'europe',       'coming_soon',  50, '🇩🇪', 'ベルリン・ミュンヘン・ハンブルク'),
  ('nl', 'オランダ',     'Netherlands',     'europe',       'coming_soon',  60, '🇳🇱', 'アムステルダム・ユトレヒト'),
  ('pt', 'ポルトガル',   'Portugal',        'europe',       'coming_soon',  70, '🇵🇹', 'リスボン・ポルト'),

  -- アジア
  ('jp', '日本',         'Japan',           'asia',         'coming_soon', 110, '🇯🇵', '東京・京都・北海道・沖縄'),
  ('tw', '台湾',         'Taiwan',          'asia',         'coming_soon', 120, '🇹🇼', '台北・台南'),
  ('kr', '韓国',         'South Korea',     'asia',         'coming_soon', 130, '🇰🇷', 'ソウル・釜山'),
  ('th', 'タイ',         'Thailand',        'asia',         'coming_soon', 140, '🇹🇭', 'バンコク・チェンマイ・島'),
  ('vn', 'ベトナム',     'Vietnam',         'asia',         'coming_soon', 150, '🇻🇳', 'ハノイ・ホーチミン・ホイアン'),
  ('sg', 'シンガポール', 'Singapore',       'asia',         'coming_soon', 160, '🇸🇬', '都市国家の食と多文化'),
  ('id', 'インドネシア', 'Indonesia',       'asia',         'coming_soon', 170, '🇮🇩', 'バリ・ジャカルタ'),
  ('in', 'インド',       'India',           'asia',         'coming_soon', 180, '🇮🇳', 'デリー・ラジャスタン・ケーララ'),

  -- 北米
  ('us', 'アメリカ',     'United States',   'north_america','coming_soon', 210, '🇺🇸', 'NYC・SF・LA・ハワイ'),
  ('ca', 'カナダ',       'Canada',          'north_america','coming_soon', 220, '🇨🇦', 'トロント・モントリオール・バンクーバー'),
  ('mx', 'メキシコ',     'Mexico',          'north_america','coming_soon', 230, '🇲🇽', 'メキシコシティ・オアハカ'),

  -- オセアニア
  ('au', 'オーストラリア','Australia',      'oceania',      'coming_soon', 310, '🇦🇺', 'シドニー・メルボルン'),
  ('nz', 'ニュージーランド','New Zealand',  'oceania',      'coming_soon', 320, '🇳🇿', 'オークランド・クイーンズタウン'),

  -- 南米
  ('br', 'ブラジル',     'Brazil',          'south_america','coming_soon', 410, '🇧🇷', 'リオ・サンパウロ'),
  ('ar', 'アルゼンチン', 'Argentina',       'south_america','coming_soon', 420, '🇦🇷', 'ブエノスアイレス'),
  ('pe', 'ペルー',       'Peru',            'south_america','coming_soon', 430, '🇵🇪', 'クスコ・マチュピチュ・リマ'),

  -- 中東・アフリカ
  ('ma', 'モロッコ',     'Morocco',         'middle_east_africa','coming_soon', 510, '🇲🇦', 'マラケシュ・フェズ'),
  ('eg', 'エジプト',     'Egypt',           'middle_east_africa','coming_soon', 520, '🇪🇬', 'カイロ・ルクソール'),
  ('ae', 'アラブ首長国連邦','United Arab Emirates','middle_east_africa','coming_soon', 530, '🇦🇪', 'ドバイ・アブダビ'),
  ('tr', 'トルコ',       'Turkey',          'middle_east_africa','coming_soon', 540, '🇹🇷', 'イスタンブール・カッパドキア'),
  ('za', '南アフリカ',   'South Africa',    'middle_east_africa','coming_soon', 550, '🇿🇦', 'ケープタウン・サファリ')
ON CONFLICT (code) DO UPDATE SET
  name_ja           = EXCLUDED.name_ja,
  name_en           = EXCLUDED.name_en,
  continent         = EXCLUDED.continent,
  position          = EXCLUDED.position,
  emoji             = EXCLUDED.emoji,
  short_description = EXCLUDED.short_description;

-- =========================================================================
-- 既存 cities への国 FK 紐付け + 不足 region 追加
-- =========================================================================
-- 既存の cities テーブルには Paris などが入っている想定。country (text) カラムから
-- countries テーブルに繋ぎ直す。
UPDATE cities c
SET country_id = co.id,
    kind = CASE
      WHEN c.slug LIKE '%-other' THEN 'other'
      WHEN lower(c.country) IN ('france','fr','日本','japan','jp') THEN 'metro'
      ELSE 'city'
    END
FROM countries co
WHERE c.country_id IS NULL
  AND (
    lower(co.code) = lower(c.country)
    OR lower(co.name_en) = lower(c.country)
    OR lower(co.name_ja) = c.country
  );

-- フランスの代表 region を追加 / 同期。Paris+近郊 を kind='metro' に。
INSERT INTO cities (slug, name_ja, name_en, country, country_id, kind, position, lat, lng, timezone, is_active, emoji)
SELECT 'paris', 'パリ＆近郊', 'Paris & Île-de-France', 'fr', co.id, 'metro', 10, 48.8566, 2.3522, 'Europe/Paris', true, '🗼'
FROM countries co WHERE co.code = 'fr'
ON CONFLICT (slug) DO UPDATE SET
  name_ja    = EXCLUDED.name_ja,
  name_en    = EXCLUDED.name_en,
  country    = EXCLUDED.country,
  country_id = EXCLUDED.country_id,
  kind       = EXCLUDED.kind,
  position   = EXCLUDED.position,
  is_active  = EXCLUDED.is_active,
  emoji      = EXCLUDED.emoji;

-- フランスのその他カテゴリ
INSERT INTO cities (slug, name_ja, name_en, country, country_id, kind, position, timezone, is_active)
SELECT 'fr-other', 'フランスその他', 'Other regions in France', 'fr', co.id, 'other', 990, 'Europe/Paris', true
FROM countries co WHERE co.code = 'fr'
ON CONFLICT (slug) DO UPDATE SET
  country_id = EXCLUDED.country_id,
  kind       = EXCLUDED.kind,
  is_active  = EXCLUDED.is_active;

-- 残り coming_soon 国にも「その他」を 1 つずつ用意（locked 状態）
INSERT INTO cities (slug, name_ja, name_en, country, country_id, kind, position, timezone, is_active)
SELECT
  co.code || '-other',
  co.name_ja || 'その他',
  'Other regions in ' || co.name_en,
  co.code,
  co.id,
  'other',
  990,
  'UTC',
  false
FROM countries co
WHERE co.status <> 'active'
ON CONFLICT (slug) DO NOTHING;

-- 各国の代表都市プレースホルダ（locked, 後で本格的に埋める）
-- 旅行先として真っ先に思いつくところだけ最低限置いておく。
INSERT INTO cities (slug, name_ja, name_en, country, country_id, kind, position, timezone, is_active, emoji)
VALUES
  -- イタリア
  ('rome',           'ローマ',           'Rome',          'it', NULL, 'metro', 10, 'Europe/Rome',     false, '🏛️'),
  ('florence',       'フィレンツェ＆トスカーナ', 'Florence & Tuscany', 'it', NULL, 'area',  20, 'Europe/Rome',     false, '🍷'),
  ('venice',         'ヴェネツィア',     'Venice',        'it', NULL, 'metro', 30, 'Europe/Rome',     false, '🛶'),
  ('milan',          'ミラノ',           'Milan',         'it', NULL, 'metro', 40, 'Europe/Rome',     false, '👗'),
  -- スペイン
  ('barcelona',      'バルセロナ',       'Barcelona',     'es', NULL, 'metro', 10, 'Europe/Madrid',   false, '🎨'),
  ('madrid',         'マドリード',       'Madrid',        'es', NULL, 'metro', 20, 'Europe/Madrid',   false, '🥘'),
  ('san-sebastian',  'サン・セバスティアン','San Sebastián','es', NULL, 'metro', 30, 'Europe/Madrid',   false, '🦪'),
  -- イギリス
  ('london',         'ロンドン',         'London',        'gb', NULL, 'metro', 10, 'Europe/London',   false, '🎩'),
  ('edinburgh',      'エディンバラ',     'Edinburgh',     'gb', NULL, 'metro', 20, 'Europe/London',   false, '🏰'),
  -- ドイツ
  ('berlin',         'ベルリン',         'Berlin',        'de', NULL, 'metro', 10, 'Europe/Berlin',   false, '🐻'),
  ('munich',         'ミュンヘン',       'Munich',        'de', NULL, 'metro', 20, 'Europe/Berlin',   false, '🍺'),
  -- 日本
  ('tokyo',          '東京',             'Tokyo',         'jp', NULL, 'metro', 10, 'Asia/Tokyo',      false, '🗼'),
  ('osaka-kyoto',    '京阪神',           'Osaka & Kyoto', 'jp', NULL, 'area',  20, 'Asia/Tokyo',      false, '⛩️'),
  ('hokkaido',       '北海道',           'Hokkaido',      'jp', NULL, 'area',  30, 'Asia/Tokyo',      false, '🐻‍❄️'),
  ('okinawa',        '沖縄',             'Okinawa',       'jp', NULL, 'area',  40, 'Asia/Tokyo',      false, '🌺'),
  -- 台湾
  ('taipei',         '台北',             'Taipei',        'tw', NULL, 'metro', 10, 'Asia/Taipei',     false, '🥟'),
  -- 韓国
  ('seoul',          'ソウル',           'Seoul',         'kr', NULL, 'metro', 10, 'Asia/Seoul',      false, '🥢'),
  -- タイ
  ('bangkok',        'バンコク',         'Bangkok',       'th', NULL, 'metro', 10, 'Asia/Bangkok',    false, '🛺'),
  ('chiang-mai',     'チェンマイ',       'Chiang Mai',    'th', NULL, 'metro', 20, 'Asia/Bangkok',    false, '🐘'),
  -- アメリカ
  ('nyc',            'ニューヨーク',     'New York',      'us', NULL, 'metro', 10, 'America/New_York',false, '🗽'),
  ('sf-bay',         'サンフランシスコ・ベイエリア','SF Bay Area','us', NULL, 'area', 20, 'America/Los_Angeles', false, '🌉'),
  ('la',             'ロサンゼルス',     'Los Angeles',   'us', NULL, 'metro', 30, 'America/Los_Angeles', false, '🌴'),
  ('hawaii',         'ハワイ',           'Hawaii',        'us', NULL, 'area',  40, 'Pacific/Honolulu',false, '🌺'),
  -- オーストラリア
  ('sydney',         'シドニー',         'Sydney',        'au', NULL, 'metro', 10, 'Australia/Sydney',false, '🏖️'),
  ('melbourne',      'メルボルン',       'Melbourne',     'au', NULL, 'metro', 20, 'Australia/Melbourne', false, '☕')
ON CONFLICT (slug) DO NOTHING;

-- 上で挿入したやつの country_id を紐付け（INSERT 時には country_id NULL で入れているケースを救済）
UPDATE cities c
SET country_id = co.id
FROM countries co
WHERE c.country_id IS NULL
  AND lower(c.country) = lower(co.code);
