-- 0046_user_services_city_audience.sql
--
-- user_services に city_id (どこで提供しているか) と audience (誰向けか) を追加。
-- 既存行は両方 NULL のまま (UI 側でフォールバック)。
--
-- 適用手順: Supabase Studio の SQL Editor でこのファイルを丸ごと貼り付けて実行してください。
-- 冪等: ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS で再実行 OK。

BEGIN;

ALTER TABLE user_services
  ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS audience text;

CREATE INDEX IF NOT EXISTS user_services_city_idx ON user_services (city_id);
CREATE INDEX IF NOT EXISTS user_services_audience_idx ON user_services (audience);

COMMENT ON COLUMN user_services.city_id IS 'cities.id への FK。提供している都市 / 地域。NULL = 指定なし (旧データ含む)';
COMMENT ON COLUMN user_services.audience IS 'traveler | resident | both | NULL (旧データ)';

COMMIT;
