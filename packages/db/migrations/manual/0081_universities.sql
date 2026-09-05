-- 0081_universities.sql
--
-- 海外大学マスタ: Wikidata から取り込む大学の参照テーブル。
-- 留学特化リポジショニングで、学歴エディタの学校オートコンプリート等の
-- 基盤データにする（UI 連携は別タスク。本マイグレーションはテーブルのみ）。
--
-- すべて additive。既存データ・既存テーブルを破壊しない。手動適用前提
-- （0058〜0062 と同じ思想。0063〜0080 は他スライスで予約・使用済み）。
--
-- データ投入: packages/db/seed/import-universities.ts
--   （pnpm --filter @locore/db db:import-universities）
--   wikidata_id を一意キーに ON CONFLICT DO UPDATE で冪等 upsert する。
--
-- 適用手順（Supabase）:
--   1. Supabase Dashboard → SQL Editor を開く。
--   2. このファイルの内容を貼り付けて Run。
--   （ローカルでは `psql "$DATABASE_URL" -f packages/db/migrations/manual/0081_universities.sql` でも可）

CREATE TABLE IF NOT EXISTS universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Wikidata の QID（例 'Q49088' = MIT）。取り込みの一意キー
  wikidata_id text UNIQUE,
  name_en text,
  name_ja text,
  -- ISO 3166-1 alpha-2 大文字（US / GB / CA ...）
  country_code text,
  -- 表示用の国名（日本語ラベル）
  country text,
  -- 所在都市（Wikidata P131 のラベル。日本語優先・無ければ英語、それも無ければ NULL）
  city text,
  -- 公式サイト（Wikidata P856）
  website text,
  source text DEFAULT 'wikidata',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE universities IS
  '海外大学マスタ（Wikidata 由来）。学歴オートコンプリート等の参照用。wikidata_id を一意キーに import-universities.ts が冪等 upsert する。';
COMMENT ON COLUMN universities.wikidata_id IS 'Wikidata QID（例 Q49088）。取り込みの一意キー';
COMMENT ON COLUMN universities.name_ja IS '日本語名（Wikidata ja ラベル）。無い大学は NULL で name_en を表示に使う';
COMMENT ON COLUMN universities.country_code IS 'ISO 3166-1 alpha-2 大文字（US/GB/CA...）';

CREATE INDEX IF NOT EXISTS universities_country_code_idx
  ON universities (country_code);

-- 名前検索用。pg_trgm が使えれば部分一致に強い gin(trgm) を張り、
-- 使えない環境（権限なし等）でも本体スクリプトを落とさない。
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_trgm を作成できませんでした（%）。通常 index にフォールバックします。', SQLERRM;
  END;
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS universities_name_en_trgm_idx ON universities USING gin (name_en gin_trgm_ops)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS universities_name_ja_trgm_idx ON universities USING gin (name_ja gin_trgm_ops)';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'trgm index を作成できませんでした（%）。', SQLERRM;
    END;
  END IF;
END $$;

-- pg_trgm が無い環境向けの前方一致用フォールバック index（重複しても無害）
CREATE INDEX IF NOT EXISTS universities_name_en_idx ON universities (name_en);
