-- 0028_board_posts.sql
--
-- 掲示板（board_posts）— 都市別の短尺な「お知らせ / イベント / 速報」掲示板。
--
-- 用途:
--   - 編集部 / クリエイターが「今日マルシェ来てます」のような短尺情報を投稿
--   - AI が現地ニュース・イベント情報を自動収集して投稿（auto_collected=true）
--   - ヘッダー /ホームに 10 件タイトルだけ並ぶ → クリックで /board/[id] 詳細
--
-- crisis_events と用途が近いが、こちらは「軽い告知 / イベント」、
-- crisis_events は「ストライキ / デモ / 災害」と分けて RLS と通知ロジックを別管理。

CREATE TABLE IF NOT EXISTS board_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid REFERENCES cities(id) ON DELETE SET NULL,
  title text NOT NULL,
  /** Markdown 本文。AI 投稿はここに整形された段落 + リンクが入る */
  body text NOT NULL,
  /** 投稿者。AI 投稿は NULL（system 扱い）*/
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  /** 'manual' | 'ai_event' | 'ai_news' */
  source text NOT NULL DEFAULT 'manual',
  /** イベント開催日（イベント以外は NULL）*/
  event_date date,
  /** 「Place de la République 周辺」など短い場所説明 */
  event_location text,
  /** 参照元 URL の配列 [{name, url}] */
  source_urls jsonb,
  /** 'draft' | 'published' | 'archived' */
  status text NOT NULL DEFAULT 'published',
  /** AI が自動収集して投稿したかどうか */
  auto_collected boolean NOT NULL DEFAULT false,
  /** サンプル識別 */
  is_sample boolean NOT NULL DEFAULT false,
  published_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS board_posts_city_idx ON board_posts(city_id);
CREATE INDEX IF NOT EXISTS board_posts_status_idx ON board_posts(status);
CREATE INDEX IF NOT EXISTS board_posts_published_at_idx ON board_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS board_posts_event_date_idx ON board_posts(event_date);

DROP TRIGGER IF EXISTS trg_board_posts_set_updated_at ON board_posts;
CREATE TRIGGER trg_board_posts_set_updated_at
  BEFORE UPDATE ON board_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY;

-- 公開済みは誰でも読める
DROP POLICY IF EXISTS "board_posts public read published" ON board_posts;
CREATE POLICY "board_posts public read published"
  ON board_posts FOR SELECT
  USING (status = 'published');

-- 自分の投稿は本人だけ読める（下書き含む）
DROP POLICY IF EXISTS "board_posts author read own" ON board_posts;
CREATE POLICY "board_posts author read own"
  ON board_posts FOR SELECT
  USING (auth.uid() = author_id);

-- 認証済みユーザーは自分名義で投稿できる
DROP POLICY IF EXISTS "board_posts insert self" ON board_posts;
CREATE POLICY "board_posts insert self"
  ON board_posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- 自分の投稿は更新・削除可
DROP POLICY IF EXISTS "board_posts update own" ON board_posts;
CREATE POLICY "board_posts update own"
  ON board_posts FOR UPDATE
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "board_posts delete own" ON board_posts;
CREATE POLICY "board_posts delete own"
  ON board_posts FOR DELETE
  USING (auth.uid() = author_id);

-- AI 投稿 (author_id IS NULL) はサーバアクション / cron が service-role で挿入する想定。
-- service-role はそもそも RLS をバイパスするので追加ポリシー不要。
