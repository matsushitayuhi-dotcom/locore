-- 0021_spot_favorites.sql
--
-- スポット個別のお気に入り + 1 階層フォルダ管理。
--   spot_folders     : ユーザー × フォルダ（1 階層、親子なし）
--   spot_bookmarks   : ユーザー × スポット × フォルダ（任意）
--
-- 旅程記事からのスポット選別保存もこのテーブルに紐付ければ完了。
-- 既存の bookmarks（記事 / 旅程記事用）とは別レイヤー。

CREATE TABLE IF NOT EXISTS spot_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  /** 表示色（emerald/coral/sun などのトークン名 or HEX）*/
  color text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS spot_folders_user_idx ON spot_folders(user_id);

CREATE TABLE IF NOT EXISTS spot_bookmarks (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spot_id uuid NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES spot_folders(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, spot_id)
);

CREATE INDEX IF NOT EXISTS spot_bookmarks_folder_idx ON spot_bookmarks(folder_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_spot_folders_set_updated_at ON spot_folders;
CREATE TRIGGER trg_spot_folders_set_updated_at
  BEFORE UPDATE ON spot_folders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE spot_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spot_folders self all" ON spot_folders;
CREATE POLICY "spot_folders self all"
  ON spot_folders FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "spot_bookmarks self all" ON spot_bookmarks;
CREATE POLICY "spot_bookmarks self all"
  ON spot_bookmarks FOR ALL
  USING (auth.uid() = user_id);
