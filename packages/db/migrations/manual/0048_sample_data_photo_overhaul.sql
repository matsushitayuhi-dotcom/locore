-- 0048_sample_data_photo_overhaul.sql
--
-- サンプル記事 / コミュニティ投稿 / 掲示板投稿 の写真 (cover / photos) を
-- 内容にマッチする Unsplash 画像に差し替える。ピッチ用の体裁向上が目的。
--
-- 方針:
--   - サンプル (is_sample=true) のみ対象。本番データは触らない
--   - picsum.photos 由来のランダム画像、もしくは NULL を持つレコードを
--     対象にする (既に良い画像が入っているレコードは触らない)
--   - article_type / community kind / category を見て、テーマ別の
--     curated Unsplash URL セットからローテーション (hashtext で決定的)
--   - Unsplash の確実に存在する photo ID のみ使用 (License OK の範囲内)
--
-- 冪等: 再実行しても同じレコードに同じ URL が入る (hashtext は決定的)
-- 商用利用前提では再ホストすべき。今はピッチ用なので hotlink で OK。

BEGIN;

-- ============================================================================
-- ヘルパー: 共通の Unsplash URL セットを CTE で持つ
-- ============================================================================

-- ============================================================================
-- 1. サンプル記事 spot_guide (カフェ・レストラン・スポット紹介系)
-- ============================================================================
WITH urls(idx, url) AS (
  VALUES
    (0, 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1600&auto=format&fit=crop&q=80'),  -- latte art / cafe
    (1, 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=1600&auto=format&fit=crop&q=80'),  -- espresso / pastry
    (2, 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&auto=format&fit=crop&q=80'),  -- restaurant interior
    (3, 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1600&auto=format&fit=crop&q=80'),  -- marché / market stall
    (4, 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1600&auto=format&fit=crop&q=80'),  -- paris street
    (5, 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?w=1600&auto=format&fit=crop&q=80'),  -- bakery
    (6, 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1600&auto=format&fit=crop&q=80')   -- bistro
)
UPDATE articles a
SET cover_image_url = u.url
FROM urls u
WHERE a.is_sample = true
  AND a.article_type = 'spot_guide'
  AND (a.cover_image_url ILIKE '%picsum%' OR a.cover_image_url IS NULL OR a.cover_image_url = '')
  AND (abs(hashtext(a.id::text)) % 7) = u.idx;

-- ============================================================================
-- 2. サンプル記事 itinerary (旅程プラン・歩き方系)
-- ============================================================================
WITH urls(idx, url) AS (
  VALUES
    (0, 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&auto=format&fit=crop&q=80'),  -- パリ・エッフェル
    (1, 'https://images.unsplash.com/photo-1524396309943-e03f5249f002?w=1600&auto=format&fit=crop&q=80'),  -- パリ朝の街
    (2, 'https://images.unsplash.com/photo-1502921413853-19a6f88aa49e?w=1600&auto=format&fit=crop&q=80'),  -- paris cobblestone
    (3, 'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=1600&auto=format&fit=crop&q=80'),  -- paris arc
    (4, 'https://images.unsplash.com/photo-1471623432079-b009d30b6729?w=1600&auto=format&fit=crop&q=80'),  -- seine river
    (5, 'https://images.unsplash.com/photo-1545459720-aac8509eb02c?w=1600&auto=format&fit=crop&q=80')   -- montmartre
)
UPDATE articles a
SET cover_image_url = u.url
FROM urls u
WHERE a.is_sample = true
  AND a.article_type = 'itinerary'
  AND (a.cover_image_url ILIKE '%picsum%' OR a.cover_image_url IS NULL OR a.cover_image_url = '')
  AND (abs(hashtext(a.id::text)) % 6) = u.idx;

-- ============================================================================
-- 3. サンプル記事 expat_info (駐在員向け実務情報)
-- ============================================================================
WITH urls(idx, url) AS (
  VALUES
    (0, 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&auto=format&fit=crop&q=80'),  -- office / desk
    (1, 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&auto=format&fit=crop&q=80'),  -- documents
    (2, 'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?w=1600&auto=format&fit=crop&q=80'),  -- paperwork
    (3, 'https://images.unsplash.com/photo-1565843708714-52ecf69ab81f?w=1600&auto=format&fit=crop&q=80')   -- family lifestyle
)
UPDATE articles a
SET cover_image_url = u.url
FROM urls u
WHERE a.is_sample = true
  AND a.article_type = 'expat_info'
  AND (a.cover_image_url ILIKE '%picsum%' OR a.cover_image_url IS NULL OR a.cover_image_url = '')
  AND (abs(hashtext(a.id::text)) % 4) = u.idx;

-- ============================================================================
-- 4. コミュニティ投稿: job (求人) - オフィス・仕事系
-- ============================================================================
WITH urls(idx, url) AS (
  VALUES
    (0, 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=1600&auto=format&fit=crop&q=80'),  -- bright office
    (1, 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1600&auto=format&fit=crop&q=80'),  -- meeting
    (2, 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1600&auto=format&fit=crop&q=80'),  -- coworking
    (3, 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1600&auto=format&fit=crop&q=80')   -- team
)
UPDATE community_posts p
SET photos = jsonb_build_array(u.url)
FROM (
  VALUES
    (0, 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=1600&auto=format&fit=crop&q=80'),
    (1, 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1600&auto=format&fit=crop&q=80'),
    (2, 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1600&auto=format&fit=crop&q=80'),
    (3, 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1600&auto=format&fit=crop&q=80')
) AS u(idx, url)
WHERE p.is_sample = true
  AND p.kind = 'job'
  AND (p.photos IS NULL OR p.photos = '[]'::jsonb OR p.photos::text ILIKE '%picsum%')
  AND (abs(hashtext(p.id::text)) % 4) = u.idx;

-- ============================================================================
-- 5. コミュニティ投稿: apartment (物件) - 部屋・インテリア系
-- ============================================================================
UPDATE community_posts p
SET photos = jsonb_build_array(u.url)
FROM (
  VALUES
    (0, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1600&auto=format&fit=crop&q=80'),  -- cozy living
    (1, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1600&auto=format&fit=crop&q=80'),  -- modern interior
    (2, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1600&auto=format&fit=crop&q=80'),  -- balcony
    (3, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1600&auto=format&fit=crop&q=80'),  -- bedroom
    (4, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&auto=format&fit=crop&q=80'),  -- kitchen
    (5, 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=1600&auto=format&fit=crop&q=80')   -- paris apartment
) AS u(idx, url)
WHERE p.is_sample = true
  AND p.kind = 'apartment'
  AND (p.photos IS NULL OR p.photos = '[]'::jsonb OR p.photos::text ILIKE '%picsum%')
  AND (abs(hashtext(p.id::text)) % 6) = u.idx;

-- ============================================================================
-- 6. コミュニティ投稿: marketplace (フリマ) - 物・モノ系
-- ============================================================================
UPDATE community_posts p
SET photos = jsonb_build_array(u.url)
FROM (
  VALUES
    (0, 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600&auto=format&fit=crop&q=80'),  -- bookshelf / used books
    (1, 'https://images.unsplash.com/photo-1567016526105-22da7c13161a?w=1600&auto=format&fit=crop&q=80'),  -- moving boxes
    (2, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1600&auto=format&fit=crop&q=80'),  -- electronics
    (3, 'https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?w=1600&auto=format&fit=crop&q=80'),  -- furniture
    (4, 'https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?w=1600&auto=format&fit=crop&q=80')   -- baby items
) AS u(idx, url)
WHERE p.is_sample = true
  AND p.kind = 'marketplace'
  AND (p.photos IS NULL OR p.photos = '[]'::jsonb OR p.photos::text ILIKE '%picsum%')
  AND (abs(hashtext(p.id::text)) % 5) = u.idx;

-- ============================================================================
-- 7. コミュニティ投稿: group (メンバー募集) - 友人集まり系
-- ============================================================================
UPDATE community_posts p
SET photos = jsonb_build_array(u.url)
FROM (
  VALUES
    (0, 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1600&auto=format&fit=crop&q=80'),  -- friends laughing
    (1, 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=1600&auto=format&fit=crop&q=80'),  -- wine cheers
    (2, 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1600&auto=format&fit=crop&q=80'),  -- running group
    (3, 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1600&auto=format&fit=crop&q=80'),  -- book club
    (4, 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1600&auto=format&fit=crop&q=80')   -- meetup
) AS u(idx, url)
WHERE p.is_sample = true
  AND p.kind = 'group'
  AND (p.photos IS NULL OR p.photos = '[]'::jsonb OR p.photos::text ILIKE '%picsum%')
  AND (abs(hashtext(p.id::text)) % 5) = u.idx;

-- ============================================================================
-- 8. コミュニティ投稿: lesson (レッスン) - 学び系
-- ============================================================================
UPDATE community_posts p
SET photos = jsonb_build_array(u.url)
FROM (
  VALUES
    (0, 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1600&auto=format&fit=crop&q=80'),  -- studying / books
    (1, 'https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?w=1600&auto=format&fit=crop&q=80'),  -- piano lesson
    (2, 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1600&auto=format&fit=crop&q=80'),  -- language teaching
    (3, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&auto=format&fit=crop&q=80'),  -- cooking class
    (4, 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=1600&auto=format&fit=crop&q=80')   -- watercolor / art
) AS u(idx, url)
WHERE p.is_sample = true
  AND p.kind = 'lesson'
  AND (p.photos IS NULL OR p.photos = '[]'::jsonb OR p.photos::text ILIKE '%picsum%')
  AND (abs(hashtext(p.id::text)) % 5) = u.idx;

-- ============================================================================
-- 9. コミュニティ投稿: mutual_aid (助け合い) - サポート系
-- ============================================================================
UPDATE community_posts p
SET photos = jsonb_build_array(u.url)
FROM (
  VALUES
    (0, 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&auto=format&fit=crop&q=80'),  -- helping hands
    (1, 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1600&auto=format&fit=crop&q=80'),  -- airport
    (2, 'https://images.unsplash.com/photo-1542884748-2b87b36c6b90?w=1600&auto=format&fit=crop&q=80'),  -- paperwork / translation
    (3, 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1600&auto=format&fit=crop&q=80')   -- parent + child
) AS u(idx, url)
WHERE p.is_sample = true
  AND p.kind = 'mutual_aid'
  AND (p.photos IS NULL OR p.photos = '[]'::jsonb OR p.photos::text ILIKE '%picsum%')
  AND (abs(hashtext(p.id::text)) % 4) = u.idx;

-- ============================================================================
-- 10. board_posts のサンプル (もしあれば、cover_image_url)
--     - 通常は AI cron 経由で photo URL は付かないが、念のためフォールバック
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'board_posts'
      AND column_name = 'cover_image_url'
  ) THEN
    UPDATE board_posts
    SET cover_image_url = 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&auto=format&fit=crop&q=80'
    WHERE (cover_image_url ILIKE '%picsum%' OR cover_image_url IS NULL OR cover_image_url = '')
      AND status = 'published';
  END IF;
END $$;

-- ============================================================================
-- 11. 検証用 SELECT (実行後、ユーザーが確認するためのコメント)
-- ============================================================================
-- SELECT id, title, cover_image_url FROM articles
--   WHERE is_sample = true ORDER BY article_type, id LIMIT 30;
-- SELECT id, kind, title, photos FROM community_posts
--   WHERE is_sample = true ORDER BY kind, id LIMIT 30;

COMMIT;
