-- 0045_region_hero_images_and_new_cities.sql
--
-- フランス都市のヘッダー画像を Unsplash URL から、自前の `apps/web/public/regions/`
-- 配下のリサイズ済み JPG に差し替える。あわせて:
--   - ニース (nice-cote-azur) とフレンチアルプス (french-alps) を非アクティブ化
--   - 新規 4 都市 (lille / montpellier / nantes / rennes) を追加
--
-- ユーザーが C:\Users\yuhij\Desktop\locore\ に置いた 18 枚の JPG を、
-- PowerShell (System.Drawing) で 1600px 幅にリサイズしてから
-- `apps/web/public/regions/<City>.jpg` として配置した。
-- URL は相対パス `/regions/<City>.jpg` で参照する。
--
-- ON CONFLICT DO UPDATE で冪等。再実行 OK。

BEGIN;

-- =========================================================================
-- 1. 既存フランス都市の hero_image_url を /regions/<City>.jpg に差し替え
-- =========================================================================
UPDATE cities SET hero_image_url = '/regions/Paris.jpg'      WHERE slug = 'paris';
UPDATE cities SET hero_image_url = '/regions/Lyon.jpg'       WHERE slug = 'lyon';
UPDATE cities SET hero_image_url = '/regions/Marseille.jpg'  WHERE slug = 'marseille';
UPDATE cities SET hero_image_url = '/regions/Bordeaux.jpg'   WHERE slug = 'bordeaux';
UPDATE cities SET hero_image_url = '/regions/Strasbourg.jpg' WHERE slug = 'strasbourg';
UPDATE cities SET hero_image_url = '/regions/Toulouse.jpg'   WHERE slug = 'toulouse';
UPDATE cities SET hero_image_url = '/regions/Provence.jpg'   WHERE slug = 'provence';
UPDATE cities SET hero_image_url = '/regions/Loire.jpg'      WHERE slug = 'loire-valley';
UPDATE cities SET hero_image_url = '/regions/Normandie.jpg'  WHERE slug = 'normandy';
UPDATE cities SET hero_image_url = '/regions/Bretagne.jpg'   WHERE slug = 'brittany';
UPDATE cities SET hero_image_url = '/regions/Champagne.jpg'  WHERE slug = 'champagne';
UPDATE cities SET hero_image_url = '/regions/Dordogne.jpg'   WHERE slug = 'dordogne';
UPDATE cities SET hero_image_url = '/regions/Other.jpg'      WHERE slug = 'fr-other';

-- =========================================================================
-- 2. ニース と フレンチアルプス を非アクティブ化 (UI で消すための DB 側の操作)
--    完全削除はしない (将来 active に戻せるよう)。
--    is_active=false にすると /region/[slug] は Coming Soon 画面、
--    国詳細 /country/fr の「準備中の地域」セクションに移動する。
-- =========================================================================
UPDATE cities SET is_active = false WHERE slug IN ('nice-cote-azur', 'french-alps');

-- =========================================================================
-- 3. 新規 4 都市 (リール / モンペリエ / ナント / レンヌ) を追加
--    既存の 0030 と同じパターン。is_active=true で出すが、
--    まだコンテンツが無いので region-content gate により実際の選択肢には
--    出ない (記事 / コミュニティ投稿が紐付くまで隠れる)。
-- =========================================================================
INSERT INTO cities (slug, name_ja, name_en, country, country_id, kind, position, lat, lng, timezone, is_active, emoji, hero_image_url)
SELECT v.r_slug, v.r_name_ja, v.r_name_en, 'fr', co.id, v.r_kind, v.r_position, v.r_lat, v.r_lng, 'Europe/Paris', true, v.r_emoji, v.r_hero_image_url
FROM countries co, (VALUES
  ('lille',       'リール',     'Lille',       'metro', 150, 50.6292,  3.0573, '🏛️', '/regions/Lille.jpg'),
  ('montpellier', 'モンペリエ', 'Montpellier', 'metro', 160, 43.6108,  3.8767, '☀️', '/regions/Montpellier.jpg'),
  ('nantes',      'ナント',     'Nantes',      'metro', 170, 47.2184, -1.5536, '🌿', '/regions/Nantes.jpg'),
  ('rennes',      'レンヌ',     'Rennes',      'metro', 180, 48.1173, -1.6778, '🍎', '/regions/Rennes.jpg')
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
-- 4. ニースに紐付くサンプル記事 (もしあれば) は新しい slug に巻き取らない。
--    現状の 0044 はボルドー記事のみなので影響なし。検証用 SELECT:
-- =========================================================================
-- SELECT slug, name_ja, is_active, hero_image_url FROM cities WHERE country = 'fr' ORDER BY position;

COMMIT;
