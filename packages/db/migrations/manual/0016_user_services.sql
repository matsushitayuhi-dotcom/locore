-- 0016_user_services.sql
--
-- ユーザーが自分の "強み" でサービス出品（観光コンサル、留学コンサル、翻訳など）
-- を登録できるようにするテーブル。
--
-- - サービス自体は `user_services`
-- - 問い合わせはチャット経由（0017_chat.sql）。`chat_messages.related_service_id`
--   から逆引きで「これは○○サービスについての問い合わせ」と分かるようにする
-- - 公開判定は is_active = true の行だけ

CREATE TABLE IF NOT EXISTS user_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,                 -- 'tourism' / 'consulting' / 'study_abroad' / 'translation' / 'attend' / 'other'
  price_jpy integer,
  price_unit text,               -- 例: '1時間あたり' / '1日' / '1件' / '応相談'
  contact_method text NOT NULL DEFAULT 'chat',  -- 'chat' / 'external_url'
  external_url text,
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_services_user_idx ON user_services(user_id);
CREATE INDEX IF NOT EXISTS user_services_active_idx ON user_services(is_active) WHERE is_active;

-- updated_at の自動更新トリガー（既存の set_updated_at 関数を再利用）
DROP TRIGGER IF EXISTS trg_user_services_set_updated_at ON user_services;
CREATE TRIGGER trg_user_services_set_updated_at
  BEFORE UPDATE ON user_services
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE user_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_services public read active" ON user_services;
CREATE POLICY "user_services public read active"
  ON user_services FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "user_services owner all" ON user_services;
CREATE POLICY "user_services owner all"
  ON user_services FOR ALL
  USING (auth.uid() = user_id);
