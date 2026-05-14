-- 0038_resident_profile_fields.sql
--
-- 駐在員コミュニティでの「住人どうしの交流」を促進するためのプロフィール拡張。
-- /residents の検索画面と /writers/[id] の公開プロフィールから利用する。
--
-- 設計の根拠（MIXB / Bilingirl / Meetup の項目を参照しつつ、Locore 用に最小化）:
--   - 出身地       … 同郷ネタが最大のアイスブレイク
--   - 在住開始年   … 「新人」「ベテラン」が一目で分かる
--   - 在住国 / 都市 … 写真ライターでない一般読者でも自己申告で持てるように
--   - 業種・職業   … 仕事つながりのオファーが生まれる
--   - 興味         … 趣味で繋がる（タグ）
--   - 探しているもの … 「ママ友」「ワイン仲間」など明示シグナル
--   - 家族構成     … 子持ち同士などのマッチング
--   - 話せる言語   … 言語交換オファーの種
--   - 気軽に会える … はっきりした OK サイン

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS home_country text,
  ADD COLUMN IF NOT EXISTS home_region text,
  ADD COLUMN IF NOT EXISTS residency_country text,
  ADD COLUMN IF NOT EXISTS residency_city text,
  ADD COLUMN IF NOT EXISTS arrival_year integer,
  ADD COLUMN IF NOT EXISTS family_stage text,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS languages jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS interests jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS looking_for jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS open_to_meetups boolean NOT NULL DEFAULT false;

-- family_stage は限られた値しか想定しないがチェック制約まではかけない
-- ('single' | 'couple' | 'family_kids' | 'empty_nest' | NULL) を許容

CREATE INDEX IF NOT EXISTS users_residency_country_idx
  ON users(residency_country) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS users_open_to_meetups_idx
  ON users(open_to_meetups) WHERE open_to_meetups = true AND deleted_at IS NULL;

COMMENT ON COLUMN users.home_country IS '出身国（ISO 2 letter）。デフォルト想定は JP';
COMMENT ON COLUMN users.home_region IS '出身地 / 都道府県（例: "東京", "大阪府"）。フリーテキスト';
COMMENT ON COLUMN users.residency_country IS '現在の在住国（ISO 2 letter）';
COMMENT ON COLUMN users.residency_city IS '現在の在住都市。フリーテキスト';
COMMENT ON COLUMN users.arrival_year IS '在住開始年（西暦 4 桁）';
COMMENT ON COLUMN users.family_stage IS 'single | couple | family_kids | empty_nest（任意）';
COMMENT ON COLUMN users.occupation IS '業種・職業のフリーテキスト';
COMMENT ON COLUMN users.languages IS '[{code: "fr", level: "business"}, ...] レベルは native|business|conversation|basic';
COMMENT ON COLUMN users.interests IS '興味タグ string[]';
COMMENT ON COLUMN users.looking_for IS '探していること string[]（友達 / 仕事仲間 / 習い事仲間 / etc.）';
COMMENT ON COLUMN users.open_to_meetups IS '気軽に会えるか。/residents で「会える人だけ」フィルタに使う';
