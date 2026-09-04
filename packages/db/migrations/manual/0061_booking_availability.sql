-- 0061_booking_availability.sql
--
-- 予約スライス: 空き枠管理（expert_availability）＋ 相談リクエスト→承諾→確定
-- （consultation_bookings）。チャット任せだった日程調整を
-- 「空き枠 → 予約リクエスト → 承諾」の型に載せる最初のマイグレーション。
--
-- すべて additive。既存データ・既存テーブルを破壊しない。
-- コード側（lib/bookings/*）は本テーブルが未適用の環境でも例外を握りつぶして
-- 「空き枠なし（予約 CTA 非表示・従来チャット導線のみ）」として動作継続する。
-- そのため本マイグレーションは手動適用前提（自動実行しない）。0058〜0060 と同じ思想。
--
-- 決済（paid / meet_url / stripe_checkout_session_id）は次スライス用のシームで、
-- このスライスでは常に NULL / 未使用。承諾（accepted）で止まる。
--
-- 適用手順（Supabase）:
--   1. Supabase Dashboard → SQL Editor を開く。
--   2. このファイルの内容を貼り付けて Run。
--   （ローカルでは `psql "$DATABASE_URL" -f packages/db/migrations/manual/0061_booking_availability.sql` でも可）

-- uuid の等値と tstzrange の重なりを同一 GiST インデックスで扱うため（EXCLUDE 制約用）
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------------
-- users.timezone — エキスパートの現地タイムゾーン
-- ---------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone text;
COMMENT ON COLUMN users.timezone IS
  'IANA タイムゾーン（例 ''Europe/Paris''）。空き枠の入力はこの現地時間、相談者への表示は日本時間。NULL = 未設定（空き枠登録時に保存される）。';

-- ---------------------------------------------------------------------------
-- user_services.duration_minutes — 相談メニューの所要時間（分）
-- ---------------------------------------------------------------------------
ALTER TABLE user_services ADD COLUMN IF NOT EXISTS duration_minutes integer;
COMMENT ON COLUMN user_services.duration_minutes IS
  '相談メニューの所要時間（分）。空き枠からの開始時刻候補の生成に使う。NULL = 未設定（旧データ。duration_label からのバックフィル対象外だったもの）';

-- '30分' '60分' のような duration_label を数値にバックフィル
UPDATE user_services
   SET duration_minutes = (regexp_replace(duration_label, '分$', ''))::int
 WHERE duration_minutes IS NULL
   AND duration_label ~ '^\d+分$';

-- ---------------------------------------------------------------------------
-- expert_availability — エキスパートが登録する空き枠（現地時間で入力→UTC保存）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expert_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT expert_availability_end_after_start CHECK (end_at > start_at)
);

-- 同一ユーザー × 同一開始時刻の枠は 1 行（並行送信のレース対策。
-- アプリ側の重複スキップに加えた最終防衛線。検索用途も兼ねるため
-- 旧 non-unique index は不要になり削除）
DROP INDEX IF EXISTS expert_availability_user_start_idx;
CREATE UNIQUE INDEX IF NOT EXISTS expert_availability_user_start_key
  ON expert_availability (user_id, start_at);

COMMENT ON TABLE expert_availability IS
  'エキスパートの空き枠（相談を受けられる時間帯）。この window 内で 30 分刻みの開始時刻候補を生成する。';
COMMENT ON COLUMN expert_availability.start_at IS '枠の開始（UTC）。入力はエキスパートの現地時間で、users.timezone を使って UTC 展開して保存する。';

-- ---------------------------------------------------------------------------
-- consultation_bookings — 相談の予約リクエスト（requested → accepted → …）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consultation_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES user_services(id) ON DELETE SET NULL,
  expert_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','accepted','declined','cancelled','expired','paid','completed')),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  -- リクエスト時点のメニュー内容スナップショット（後からメニューが変更・削除
  -- されても予約カードの表示と金額が変わらないように非正規化して持つ）
  service_title text NOT NULL,
  price_jpy integer NOT NULL,
  commission_rate numeric(4,2) NOT NULL DEFAULT 0.20,
  platform_fee_jpy integer NOT NULL DEFAULT 0,
  request_message text,
  chat_thread_id uuid REFERENCES chat_threads(id) ON DELETE SET NULL,
  responded_at timestamptz,
  cancelled_at timestamptz,
  -- ▼ 次スライス（決済・ビデオ通話）用のシーム。本スライスでは常に NULL
  meet_url text,
  paid_at timestamptz,
  stripe_checkout_session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consultation_bookings_end_after_start CHECK (end_at > start_at)
);

-- 同一エキスパートの確定済み（accepted / paid）枠は時間帯の重なりを DB レベルで禁止。
-- 同時承諾の競合はこの制約違反として片方が失敗する（アプリ側で文言に変換）。
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'consultation_bookings_no_overlap'
  ) THEN
    ALTER TABLE consultation_bookings
      ADD CONSTRAINT consultation_bookings_no_overlap
      EXCLUDE USING gist (
        expert_id WITH =,
        tstzrange(start_at, end_at) WITH &&
      )
      WHERE (status IN ('accepted','paid'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS consultation_bookings_expert_start_idx
  ON consultation_bookings (expert_id, start_at);
CREATE INDEX IF NOT EXISTS consultation_bookings_requester_created_idx
  ON consultation_bookings (requester_id, created_at);
CREATE INDEX IF NOT EXISTS consultation_bookings_status_idx
  ON consultation_bookings (status);

COMMENT ON TABLE consultation_bookings IS
  '相談の予約。requested（返答待ち）→ accepted（確定）/ declined / cancelled / expired。paid / completed は決済スライスで使う予約語。';
COMMENT ON COLUMN consultation_bookings.status IS
  '''requested'' 返答待ち / ''accepted'' 確定 / ''declined'' 辞退 / ''cancelled'' 取り下げ / ''expired'' 期限切れ / ''paid''・''completed'' は次スライス用。';
COMMENT ON COLUMN consultation_bookings.commission_rate IS 'リクエスト時点のプラットフォーム手数料率スナップショット（既定 0.20）。';
COMMENT ON COLUMN consultation_bookings.platform_fee_jpy IS 'price_jpy × commission_rate を丸めた手数料スナップショット（円）。';
COMMENT ON COLUMN consultation_bookings.meet_url IS '次スライス用シーム（ビデオ通話 URL）。本スライスでは常に NULL。';
COMMENT ON COLUMN consultation_bookings.stripe_checkout_session_id IS '次スライス用シーム（Stripe Checkout）。本スライスでは常に NULL。';

-- ---------------------------------------------------------------------------
-- updated_at 自動更新トリガー（0004 の set_updated_at() を再利用）
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_expert_availability_set_updated_at ON expert_availability;
CREATE TRIGGER trg_expert_availability_set_updated_at
  BEFORE UPDATE ON expert_availability
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_consultation_bookings_set_updated_at ON consultation_bookings;
CREATE TRIGGER trg_consultation_bookings_set_updated_at
  BEFORE UPDATE ON consultation_bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
