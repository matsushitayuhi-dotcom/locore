-- 0060_community_event_rsvps.sql
--
-- 集まり（community_posts.kind = 'group'）の「参加表明（RSVP）」を保存するテーブル。
-- 参加予定メンバー数・残り枠の集計はすべてこの実 RSVP から計算する（偽データは出さない）。
--
-- すべて additive。既存データ・既存テーブルを破壊しない。
-- コード側（lib/community/rsvp.ts の getEventRsvpSummary / rsvpToEvent / cancelRsvp）は
-- 本テーブルが未適用の環境でも例外を握りつぶして
-- 「RSVP 無効（going=0・interested=0・viewerStatus=null）」として動作継続する。
-- そのため本マイグレーションは手動適用前提（自動実行しない）。0058 / 0059 と同じ思想。
--
-- status:
--   'going'      … 参加する（残り枠の計算対象）
--   'interested' … 興味あり / 保存（残り枠には数えない）
--
-- 適用手順（Supabase）:
--   1. Supabase Dashboard → SQL Editor を開く。
--   2. このファイルの内容を貼り付けて Run。
--   （ローカルでは `psql "$DATABASE_URL" -f packages/db/migrations/manual/0060_community_event_rsvps.sql` でも可）

CREATE TABLE IF NOT EXISTS community_event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'going',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS community_event_rsvps_post_status_idx
  ON community_event_rsvps (post_id, status);

COMMENT ON TABLE community_event_rsvps IS '集まり（kind=group）の参加表明。参加予定数・残り枠の集計の唯一の実データ源。';
COMMENT ON COLUMN community_event_rsvps.status IS '''going''（参加・残り枠の対象） / ''interested''（興味あり・残り枠には数えない）。';
