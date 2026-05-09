-- 0017_chat.sql
--
-- チャット機能の最小スキーマ。
--   chat_threads        : 会話のコンテナ（1:1 はもちろん、将来の n 人会話も同じ表）
--   chat_thread_members : 参加メンバー + last_read_at（未読カウント用）
--   chat_messages       : 投稿本文
--
-- 1:1 重複防止のため、`direct_pair_key` を sorted("uuidA","uuidB").join(":") で持ち、
-- UNIQUE 制約をつける。グループ会話のときは NULL。

CREATE TABLE IF NOT EXISTS chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direct_pair_key text UNIQUE,    -- 1:1 のとき sortedユーザーIDのコロン連結
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_threads_last_message_idx
  ON chat_threads(last_message_at DESC);

CREATE TABLE IF NOT EXISTS chat_thread_members (
  thread_id uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS chat_thread_members_user_idx
  ON chat_thread_members(user_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body text NOT NULL,
  -- サービス問い合わせから生まれたメッセージは紐付けておく
  related_service_id uuid REFERENCES user_services(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS chat_messages_thread_created_idx
  ON chat_messages(thread_id, created_at);

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- threads: 自分がメンバーのスレッドだけ見える
DROP POLICY IF EXISTS "chat_threads member read" ON chat_threads;
CREATE POLICY "chat_threads member read"
  ON chat_threads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_thread_members m
      WHERE m.thread_id = chat_threads.id AND m.user_id = auth.uid()
    )
  );

-- threads: 認証ユーザーは新規スレッドを作れる（メンバーは別途 INSERT）
DROP POLICY IF EXISTS "chat_threads auth insert" ON chat_threads;
CREATE POLICY "chat_threads auth insert"
  ON chat_threads FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- members: 自分のメンバー行と、同じスレッドの他メンバーは見える
DROP POLICY IF EXISTS "chat_thread_members read" ON chat_thread_members;
CREATE POLICY "chat_thread_members read"
  ON chat_thread_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM chat_thread_members m2
      WHERE m2.thread_id = chat_thread_members.thread_id AND m2.user_id = auth.uid()
    )
  );

-- members: 自分自身を任意のスレッドに加える（スレッド作成者が両者を入れる用途）
DROP POLICY IF EXISTS "chat_thread_members self insert" ON chat_thread_members;
CREATE POLICY "chat_thread_members self insert"
  ON chat_thread_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- last_read_at の更新は本人のみ
DROP POLICY IF EXISTS "chat_thread_members self update" ON chat_thread_members;
CREATE POLICY "chat_thread_members self update"
  ON chat_thread_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- messages: メンバーだけ読める
DROP POLICY IF EXISTS "chat_messages member read" ON chat_messages;
CREATE POLICY "chat_messages member read"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_thread_members m
      WHERE m.thread_id = chat_messages.thread_id AND m.user_id = auth.uid()
    )
  );

-- messages: 自分が送信者で、かつスレッドのメンバー
DROP POLICY IF EXISTS "chat_messages member insert" ON chat_messages;
CREATE POLICY "chat_messages member insert"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_thread_members m
      WHERE m.thread_id = chat_messages.thread_id AND m.user_id = auth.uid()
    )
  );

-- 編集 / 論理削除は自分のメッセージのみ
DROP POLICY IF EXISTS "chat_messages own update" ON chat_messages;
CREATE POLICY "chat_messages own update"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid());
