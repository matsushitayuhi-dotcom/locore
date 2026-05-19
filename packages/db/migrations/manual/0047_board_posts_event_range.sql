BEGIN;

ALTER TABLE board_posts
  ADD COLUMN IF NOT EXISTS event_start_date date,
  ADD COLUMN IF NOT EXISTS event_end_date date;

-- 既存の単日 eventDate を start/end 両方にコピー (後方互換)
UPDATE board_posts
SET event_start_date = event_date,
    event_end_date = event_date
WHERE event_date IS NOT NULL
  AND event_start_date IS NULL;

CREATE INDEX IF NOT EXISTS board_posts_event_range_idx
  ON board_posts (event_start_date, event_end_date);

COMMENT ON COLUMN board_posts.event_start_date IS '期間開始日 (single-day なら end と同値)';
COMMENT ON COLUMN board_posts.event_end_date   IS '期間終了日 (single-day なら start と同値)';

COMMIT;
