-- 0082_booking_notifications.sql
--
-- 通知スライス: 承諾 → 参加リンク → メール、で予約体験を実運用可能にする。
--   - users.meeting_room_url: エキスパートの固定の相談室 URL（Google Meet の
--     「後で使う会議を作成」等の再利用リンク）。承諾時に
--     consultation_bookings.meet_url へ自動コピーされる。
--   - consultation_bookings.reminder_sent_at: 前日リマインダーの冪等キー。
--     cron（/api/cron/booking-reminder）が送信前に guarded UPDATE でマークし、
--     2 回叩いても 2 通目が出ない。
--
-- すべて additive。既存データ・既存テーブルを破壊しない。手動適用前提
-- （0061/0062/0081 と同じ思想。0080 は別スライスで使用済み）。
--
-- 適用手順（Supabase）:
--   1. Supabase Dashboard → SQL Editor を開く。
--   2. このファイルの内容を貼り付けて Run。
--   （ローカルでは `psql "$DATABASE_URL" -f packages/db/migrations/manual/0082_booking_notifications.sql` でも可）

ALTER TABLE users ADD COLUMN IF NOT EXISTS meeting_room_url text;

COMMENT ON COLUMN users.meeting_room_url IS
  'エキスパートの固定の相談室 URL（Meet/Zoom の再利用リンク）。承諾時に consultation_bookings.meet_url へ自動コピー。';

ALTER TABLE consultation_bookings
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

COMMENT ON COLUMN consultation_bookings.reminder_sent_at IS
  '前日リマインダー送信済み時刻（冪等キー）。NULL = 未送信。';

-- リマインダー cron の対象走査用（未送信の確定予約だけを start_at で引く）
CREATE INDEX IF NOT EXISTS consultation_bookings_reminder_idx
  ON consultation_bookings (start_at)
  WHERE reminder_sent_at IS NULL AND status IN ('accepted', 'paid');
