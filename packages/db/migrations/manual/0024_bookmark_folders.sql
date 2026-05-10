-- 0024_bookmark_folders.sql
--
-- 記事 / 旅程ブックマーク用の 1 階層フォルダ。
-- 既存の bookmarks テーブルに folder_id 列を追加して、新規 bookmark_folders と関連付ける。

BEGIN;

CREATE TABLE IF NOT EXISTS bookmark_folders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text,
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookmark_folders_user_idx
  ON bookmark_folders(user_id);

-- bookmarks に folder_id 列を追加（既存行は NULL = 未分類）
ALTER TABLE bookmarks
  ADD COLUMN IF NOT EXISTS folder_id uuid
    REFERENCES bookmark_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bookmarks_folder_idx
  ON bookmarks(folder_id);

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE bookmark_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookmark_folders self read" ON bookmark_folders;
CREATE POLICY "bookmark_folders self read"
  ON bookmark_folders FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "bookmark_folders self insert" ON bookmark_folders;
CREATE POLICY "bookmark_folders self insert"
  ON bookmark_folders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "bookmark_folders self update" ON bookmark_folders;
CREATE POLICY "bookmark_folders self update"
  ON bookmark_folders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "bookmark_folders self delete" ON bookmark_folders;
CREATE POLICY "bookmark_folders self delete"
  ON bookmark_folders FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- bookmarks の UPDATE は既存の RLS には無いはずなので、folder 移動用に許可
DROP POLICY IF EXISTS "bookmarks self update" ON bookmarks;
CREATE POLICY "bookmarks self update"
  ON bookmarks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

COMMIT;
