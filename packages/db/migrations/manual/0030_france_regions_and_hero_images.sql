-- 0030_france_regions_and_hero_images.sql
--
-- フランス国内に複数地域を最初から登録する（パリ以外のクリエイターも巻き込むため）。
-- あわせて countries / cities の hero_image_url を curated Unsplash URL に更新し、
-- 国旗 emoji だけの寂しい世界ピッカーをやめる。
--
-- 画像は Unsplash の安定した CDN URL（photo-XXX 形式）を使用。
--   - フォーマット: https://images.unsplash.com/photo-{ID}?w=1200&auto=format&fit=crop&q=80
--   - 著作権上、商用利用も Unsplash License で OK
--   - 撮影者クレジットを表示したい場合は別途 photographer カラムを追加して保持
--
-- これは破壊的変更ではなく ON CONFLICT UPDATE で冪等。

-- =========================================================================
-- 国に hero_image_url を割り振る（ヨーロッパは特に丁寧に）
-- =========================================================================
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&auto=format&fit=crop&q=80' WHERE code = 'fr'; -- エッフェル塔
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=1200&auto=format&fit=crop&q=80' WHERE code = 'it'; -- コロッセオ
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&auto=format&fit=crop&q=80' WHERE code = 'es'; -- サグラダファミリア
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&auto=format&fit=crop&q=80' WHERE code = 'gb'; -- ロンドン
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1587330979470-3016b6702d89?w=1200&auto=format&fit=crop&q=80' WHERE code = 'de'; -- ブランデンブルク門
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1534351590666-13e3e96c5017?w=1200&auto=format&fit=crop&q=80' WHERE code = 'nl'; -- アムステルダム運河
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1200&auto=format&fit=crop&q=80' WHERE code = 'pt'; -- リスボン
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1200&auto=format&fit=crop&q=80' WHERE code = 'jp'; -- 東京
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1552919572-be9c89bfe05c?w=1200&auto=format&fit=crop&q=80' WHERE code = 'tw'; -- 台北101
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1538485399081-7c8978d28b9b?w=1200&auto=format&fit=crop&q=80' WHERE code = 'kr'; -- ソウル
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=1200&auto=format&fit=crop&q=80' WHERE code = 'th'; -- ワットアルン
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1528127269322-539801943592?w=1200&auto=format&fit=crop&q=80' WHERE code = 'vn'; -- ベトナム
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&auto=format&fit=crop&q=80' WHERE code = 'sg'; -- マリーナベイ
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&auto=format&fit=crop&q=80' WHERE code = 'id'; -- バリ
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1200&auto=format&fit=crop&q=80' WHERE code = 'in'; -- タージマハル
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1496588152823-86ff7695e68f?w=1200&auto=format&fit=crop&q=80' WHERE code = 'us'; -- NYC
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1503614472-8c93d56cd9b6?w=1200&auto=format&fit=crop&q=80' WHERE code = 'ca'; -- バンフ
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=1200&auto=format&fit=crop&q=80' WHERE code = 'mx'; -- メキシコ
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1200&auto=format&fit=crop&q=80' WHERE code = 'au'; -- シドニーオペラ
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1469521669194-babb45599def?w=1200&auto=format&fit=crop&q=80' WHERE code = 'nz'; -- ミルフォードサウンド
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1200&auto=format&fit=crop&q=80' WHERE code = 'br'; -- リオ
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=1200&auto=format&fit=crop&q=80' WHERE code = 'ar'; -- ブエノスアイレス
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=1200&auto=format&fit=crop&q=80' WHERE code = 'pe'; -- マチュピチュ
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=1200&auto=format&fit=crop&q=80' WHERE code = 'ma'; -- マラケシュ
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=1200&auto=format&fit=crop&q=80' WHERE code = 'eg'; -- ピラミッド
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200&auto=format&fit=crop&q=80' WHERE code = 'ae'; -- ドバイ
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&auto=format&fit=crop&q=80' WHERE code = 'tr'; -- イスタンブール
UPDATE countries SET hero_image_url = 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1200&auto=format&fit=crop&q=80' WHERE code = 'za'; -- ケープタウン

-- =========================================================================
-- フランス国内の地域を一気に追加（パリ以外の人も巻き込む）
-- =========================================================================
-- France country_id を一旦キャッシュするのに WITH を使う代わりに INSERT FROM。
-- VALUES 側の列名を r_slug / r_name_ja ... のように prefix することで、
-- countries.name_ja / cities.name_ja との「ambiguous reference」を回避。
INSERT INTO cities (slug, name_ja, name_en, country, country_id, kind, position, lat, lng, timezone, is_active, emoji, hero_image_url)
SELECT v.r_slug, v.r_name_ja, v.r_name_en, 'fr', co.id, v.r_kind, v.r_position, v.r_lat, v.r_lng, 'Europe/Paris', true, v.r_emoji, v.r_hero_image_url
FROM countries co, (VALUES
  ('paris',           'パリ＆近郊',           'Paris & Île-de-France',  'metro',  10, 48.8566,  2.3522, '🗼', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&auto=format&fit=crop&q=80'),
  ('lyon',            'リヨン',               'Lyon',                   'metro',  20, 45.7640,  4.8357, '🍷', 'https://images.unsplash.com/photo-1524396309943-e03f5249f002?w=1200&auto=format&fit=crop&q=80'),
  ('marseille',       'マルセイユ',           'Marseille',              'metro',  30, 43.2965,  5.3698, '⛵', 'https://images.unsplash.com/photo-1599991005465-7e2eb8f15db5?w=1200&auto=format&fit=crop&q=80'),
  ('nice-cote-azur',  'ニース・コートダジュール', 'Nice & Côte d''Azur', 'area',   40, 43.7102,  7.2620, '🌊', 'https://images.unsplash.com/photo-1503917988258-f87a78e3c995?w=1200&auto=format&fit=crop&q=80'),
  ('bordeaux',        'ボルドー',             'Bordeaux',               'metro',  50, 44.8378, -0.5792, '🍇', 'https://images.unsplash.com/photo-1583266488953-7d3e3a32f5b1?w=1200&auto=format&fit=crop&q=80'),
  ('strasbourg',      'ストラスブール',       'Strasbourg & Alsace',    'area',   60, 48.5734,  7.7521, '🥨', 'https://images.unsplash.com/photo-1559717237-c0e635a47fbd?w=1200&auto=format&fit=crop&q=80'),
  ('provence',        'プロヴァンス',         'Provence',               'area',   70, 43.9352,  6.0679, '💜', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&auto=format&fit=crop&q=80'),
  ('loire-valley',    'ロワール渓谷',         'Loire Valley',           'area',   80, 47.3941,  0.6848, '🏰', 'https://images.unsplash.com/photo-1581784368651-8916092072cf?w=1200&auto=format&fit=crop&q=80'),
  ('normandy',        'ノルマンディー',       'Normandy',               'area',   90, 49.1829,  -0.3707,'⛪', 'https://images.unsplash.com/photo-1581450239849-3aae74b5f02d?w=1200&auto=format&fit=crop&q=80'),
  ('brittany',        'ブルターニュ',         'Brittany',               'area',  100, 48.2020, -2.9326, '🦪', 'https://images.unsplash.com/photo-1597595272404-fb1b0b146f04?w=1200&auto=format&fit=crop&q=80'),
  ('french-alps',     'フレンチアルプス',     'French Alps & Annecy',   'area',  110, 45.9237,  6.8694, '🏔️', 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1200&auto=format&fit=crop&q=80'),
  ('toulouse',        'トゥールーズ',         'Toulouse',               'metro', 120, 43.6047,  1.4442, '🌹', 'https://images.unsplash.com/photo-1591289297030-9e92a8e9c673?w=1200&auto=format&fit=crop&q=80'),
  ('champagne',       'シャンパーニュ',       'Champagne & Reims',      'area',  130, 49.2583,  4.0317, '🥂', 'https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?w=1200&auto=format&fit=crop&q=80'),
  ('dordogne',        'ドルドーニュ',         'Dordogne',               'area',  140, 45.0386,  0.7270, '🍯', 'https://images.unsplash.com/photo-1551634979-2b11f8c946fe?w=1200&auto=format&fit=crop&q=80')
) AS v(r_slug, r_name_ja, r_name_en, r_kind, r_position, r_lat, r_lng, r_emoji, r_hero_image_url)
WHERE co.code = 'fr'
ON CONFLICT (slug) DO UPDATE SET
  name_ja        = EXCLUDED.name_ja,
  name_en        = EXCLUDED.name_en,
  country_id     = EXCLUDED.country_id,
  kind           = EXCLUDED.kind,
  position       = EXCLUDED.position,
  lat            = EXCLUDED.lat,
  lng            = EXCLUDED.lng,
  is_active      = EXCLUDED.is_active,
  emoji          = EXCLUDED.emoji,
  hero_image_url = EXCLUDED.hero_image_url;

-- =========================================================================
-- 既存の主要都市プレースホルダ（locked）にもヘッダー画像を割当て
-- =========================================================================
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'rome';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1543429776-2782fc8e1acd?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'florence';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'venice';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1520176617533-c1f0c4f4d2dc?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'milan';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'barcelona';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'madrid';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1551465253-04a87cd0a44d?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'san-sebastian';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'london';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1506377585622-bedcbb027afc?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'edinburgh';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1587330979470-3016b6702d89?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'berlin';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1599982252814-749a3a0b9b1b?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'munich';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'tokyo';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1493997181344-712f2f19d87a?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'osaka-kyoto';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'hokkaido';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'okinawa';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1552919572-be9c89bfe05c?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'taipei';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1538485399081-7c8978d28b9b?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'seoul';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'bangkok';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1598935898639-81586f7d2129?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'chiang-mai';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1496588152823-86ff7695e68f?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'nyc';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'sf-bay';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'la';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1542259009477-d625272157b7?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'hawaii';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'sydney';
UPDATE cities SET hero_image_url = 'https://images.unsplash.com/photo-1514395462725-fb4566210144?w=1200&auto=format&fit=crop&q=80' WHERE slug = 'melbourne';
