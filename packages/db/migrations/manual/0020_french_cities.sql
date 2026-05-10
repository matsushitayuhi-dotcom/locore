-- 0020_french_cities.sql
--
-- フランス主要都市を cities マスタに追加（active=true）。
-- 既存の paris は ON CONFLICT で名前等を更新するに留める。
-- 編集者ホールド機能は撤廃したので、書き手はこれらの街でも自由に投稿できる。

INSERT INTO cities (slug, name_ja, country, lat, lng, timezone, is_active)
VALUES
  ('paris',       'パリ',           'FR', 48.8566,  2.3522,  'Europe/Paris', true),
  ('lyon',        'リヨン',         'FR', 45.7640,  4.8357,  'Europe/Paris', true),
  ('marseille',   'マルセイユ',     'FR', 43.2965,  5.3698,  'Europe/Paris', true),
  ('nice',        'ニース',         'FR', 43.7102,  7.2620,  'Europe/Paris', true),
  ('bordeaux',    'ボルドー',       'FR', 44.8378, -0.5792,  'Europe/Paris', true),
  ('toulouse',    'トゥールーズ',   'FR', 43.6047,  1.4442,  'Europe/Paris', true),
  ('strasbourg',  'ストラスブール', 'FR', 48.5734,  7.7521,  'Europe/Paris', true),
  ('lille',       'リール',         'FR', 50.6292,  3.0573,  'Europe/Paris', true),
  ('nantes',      'ナント',         'FR', 47.2184, -1.5536,  'Europe/Paris', true),
  ('montpellier', 'モンペリエ',     'FR', 43.6108,  3.8767,  'Europe/Paris', true),
  ('rennes',      'レンヌ',         'FR', 48.1173, -1.6778,  'Europe/Paris', true)
ON CONFLICT (slug) DO UPDATE SET
  name_ja = EXCLUDED.name_ja,
  country = EXCLUDED.country,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  timezone = EXCLUDED.timezone,
  is_active = EXCLUDED.is_active,
  updated_at = now();
