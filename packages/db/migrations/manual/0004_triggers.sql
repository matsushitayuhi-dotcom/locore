-- 0004_triggers.sql
-- updated_at の自動更新トリガー。
-- updated_at カラムを持つテーブルすべてに適用する。

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'users',
    'writer_profiles',
    'sns_links',
    'cities',
    'articles',
    'spots',
    'purchases',
    'payouts',
    'trips',
    'trip_items',
    'light_diaries',
    'editor_collections',
    'crisis_events',
    'crisis_source_feeds'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_set_updated_at ON %I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t, t
    );
  END LOOP;
END $$;
