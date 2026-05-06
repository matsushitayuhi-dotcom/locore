-- 0003_rls_policies.sql
-- ARCHITECTURE.md §4.2 に基づく Row Level Security ポリシー。
--
-- Supabase 環境では auth.uid() で現在の認証ユーザー UUID を取得できる前提。
-- RLS は service_role キーではバイパスされる（バックエンド側は通常通り動く）。
--
-- 適用順：drizzle-kit 生成 SQL のあと、indexes より前後どちらでも可。

-- =====================================================
-- 全テーブル ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE writer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE residency_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sns_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE light_diaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE editor_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_moderation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE founding_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_source_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- users
-- =====================================================
DROP POLICY IF EXISTS "users self read" ON users;
CREATE POLICY "users self read"
  ON users FOR SELECT
  USING (deleted_at IS NULL);  -- 公開プロフィールは誰でも見える

DROP POLICY IF EXISTS "users self update" ON users;
CREATE POLICY "users self update"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- writer_profiles
-- =====================================================
DROP POLICY IF EXISTS "writer_profiles public read" ON writer_profiles;
CREATE POLICY "writer_profiles public read"
  ON writer_profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "writer_profiles self upsert" ON writer_profiles;
CREATE POLICY "writer_profiles self upsert"
  ON writer_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "writer_profiles self update" ON writer_profiles;
CREATE POLICY "writer_profiles self update"
  ON writer_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- residency_verifications
-- =====================================================
DROP POLICY IF EXISTS "residency self read" ON residency_verifications;
CREATE POLICY "residency self read"
  ON residency_verifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "residency self insert" ON residency_verifications;
CREATE POLICY "residency self insert"
  ON residency_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);
-- UPDATE は service_role 経由（運営）のみ。RLS では UPDATE ポリシーを明示しない
-- → RLS が ENABLE になっている以上、通常ロールからの UPDATE はすべて拒否される。

-- =====================================================
-- sns_links
-- =====================================================
DROP POLICY IF EXISTS "sns_links public read" ON sns_links;
CREATE POLICY "sns_links public read" ON sns_links FOR SELECT USING (true);

DROP POLICY IF EXISTS "sns_links self all" ON sns_links;
CREATE POLICY "sns_links self all" ON sns_links FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- cities
-- =====================================================
DROP POLICY IF EXISTS "cities public read" ON cities;
CREATE POLICY "cities public read" ON cities FOR SELECT USING (true);

-- =====================================================
-- articles
-- =====================================================
DROP POLICY IF EXISTS "public articles readable" ON articles;
CREATE POLICY "public articles readable"
  ON articles FOR SELECT
  USING (status = 'published' AND deleted_at IS NULL);

DROP POLICY IF EXISTS "draft articles by author" ON articles;
CREATE POLICY "draft articles by author"
  ON articles FOR ALL
  USING (auth.uid() = writer_id);

-- =====================================================
-- article_videos
-- =====================================================
DROP POLICY IF EXISTS "article_videos read with article" ON article_videos;
CREATE POLICY "article_videos read with article"
  ON article_videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM articles a
      WHERE a.id = article_videos.article_id
        AND (a.status = 'published' OR a.writer_id = auth.uid())
        AND a.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "article_videos by author" ON article_videos;
CREATE POLICY "article_videos by author"
  ON article_videos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM articles a
      WHERE a.id = article_videos.article_id
        AND a.writer_id = auth.uid()
    )
  );

-- =====================================================
-- spots
-- =====================================================
DROP POLICY IF EXISTS "spots read with article" ON spots;
CREATE POLICY "spots read with article"
  ON spots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM articles a
      WHERE a.id = spots.article_id
        AND (a.status = 'published' OR a.writer_id = auth.uid())
        AND a.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "spots by author" ON spots;
CREATE POLICY "spots by author"
  ON spots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM articles a
      WHERE a.id = spots.article_id
        AND a.writer_id = auth.uid()
    )
  );

-- =====================================================
-- purchases
-- =====================================================
DROP POLICY IF EXISTS "own purchases" ON purchases;
CREATE POLICY "own purchases"
  ON purchases FOR SELECT
  USING (auth.uid() = buyer_id);
-- INSERT/UPDATE は service_role（バックエンド + Stripe webhook）のみ

-- =====================================================
-- payouts
-- =====================================================
DROP POLICY IF EXISTS "own payouts" ON payouts;
CREATE POLICY "own payouts"
  ON payouts FOR SELECT
  USING (auth.uid() = writer_id);
-- INSERT/UPDATE は service_role のみ

-- =====================================================
-- reviews
-- =====================================================
DROP POLICY IF EXISTS "public reviews readable" ON reviews;
CREATE POLICY "public reviews readable" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "buyer can review" ON reviews;
CREATE POLICY "buyer can review"
  ON reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchases
      WHERE purchases.id = purchase_id
        AND purchases.buyer_id = auth.uid()
        AND purchases.status = 'completed'
    )
  );

-- =====================================================
-- trips
-- =====================================================
DROP POLICY IF EXISTS "trip access" ON trips;
CREATE POLICY "trip access"
  ON trips FOR ALL
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM trip_collaborators
      WHERE trip_id = trips.id AND user_id = auth.uid()
    )
  );

-- =====================================================
-- trip_days / trip_items / trip_collaborators
-- =====================================================
DROP POLICY IF EXISTS "trip_days access" ON trip_days;
CREATE POLICY "trip_days access"
  ON trip_days FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = trip_days.trip_id
        AND (
          t.owner_id = auth.uid() OR
          EXISTS (SELECT 1 FROM trip_collaborators tc WHERE tc.trip_id = t.id AND tc.user_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "trip_items access" ON trip_items;
CREATE POLICY "trip_items access"
  ON trip_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trip_days d
      JOIN trips t ON t.id = d.trip_id
      WHERE d.id = trip_items.trip_day_id
        AND (
          t.owner_id = auth.uid() OR
          EXISTS (SELECT 1 FROM trip_collaborators tc WHERE tc.trip_id = t.id AND tc.user_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "trip_collaborators read by member" ON trip_collaborators;
CREATE POLICY "trip_collaborators read by member"
  ON trip_collaborators FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_collaborators.trip_id AND t.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "trip_collaborators owner write" ON trip_collaborators;
CREATE POLICY "trip_collaborators owner write"
  ON trip_collaborators FOR ALL
  USING (
    EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_collaborators.trip_id AND t.owner_id = auth.uid())
  );

-- =====================================================
-- light_diaries
-- =====================================================
DROP POLICY IF EXISTS "light_diaries public read" ON light_diaries;
CREATE POLICY "light_diaries public read"
  ON light_diaries FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "light_diaries author all" ON light_diaries;
CREATE POLICY "light_diaries author all"
  ON light_diaries FOR ALL
  USING (auth.uid() = author_id);

-- =====================================================
-- editor_collections / collection_articles
-- =====================================================
DROP POLICY IF EXISTS "editor_collections public read" ON editor_collections;
CREATE POLICY "editor_collections public read"
  ON editor_collections FOR SELECT
  USING (published_at IS NOT NULL);

DROP POLICY IF EXISTS "collection_articles public read" ON collection_articles;
CREATE POLICY "collection_articles public read"
  ON collection_articles FOR SELECT USING (true);

-- 編集系の書き込みは service_role 経由

-- =====================================================
-- article_moderation_scores
-- =====================================================
DROP POLICY IF EXISTS "moderation own article read" ON article_moderation_scores;
CREATE POLICY "moderation own article read"
  ON article_moderation_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM articles a
      WHERE a.id = article_moderation_scores.article_id
        AND a.writer_id = auth.uid()
    )
  );
-- 書き込みは service_role 経由

-- =====================================================
-- founding_applications
-- =====================================================
-- 公開フォームから誰でも INSERT 可能（reviewer_notes 等を漏らさない為 SELECT は禁止）
DROP POLICY IF EXISTS "founding_applications public insert" ON founding_applications;
CREATE POLICY "founding_applications public insert"
  ON founding_applications FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- reports
-- =====================================================
DROP POLICY IF EXISTS "reports anyone insert" ON reports;
CREATE POLICY "reports anyone insert"
  ON reports FOR INSERT
  WITH CHECK (true);  -- 匿名通報も許容（reporter_id IS NULL）

DROP POLICY IF EXISTS "reports own read" ON reports;
CREATE POLICY "reports own read"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- =====================================================
-- crisis_events
-- =====================================================
DROP POLICY IF EXISTS "crisis_events public read" ON crisis_events;
CREATE POLICY "crisis_events public read"
  ON crisis_events FOR SELECT
  USING (status = 'published');

-- crisis_source_feeds / crisis_candidates は運営専用（service_role のみ）

-- =====================================================
-- push_subscriptions
-- =====================================================
DROP POLICY IF EXISTS "push_subscriptions self all" ON push_subscriptions;
CREATE POLICY "push_subscriptions self all"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- notification_log
-- =====================================================
DROP POLICY IF EXISTS "notification_log self read" ON notification_log;
CREATE POLICY "notification_log self read"
  ON notification_log FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================
-- exchange_rates
-- =====================================================
DROP POLICY IF EXISTS "exchange_rates public read" ON exchange_rates;
CREATE POLICY "exchange_rates public read" ON exchange_rates FOR SELECT USING (true);

-- =====================================================
-- audit_logs
-- 通常ロールからは見えない（service_role 経由のみ）
-- =====================================================
-- ポリシーを定義しない = RLS ENABLE で全拒否
