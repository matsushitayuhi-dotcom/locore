-- 0036_photo_journal_articles.sql
--
-- 旅行者側の記事に「インスタ風のビジュアル記事」を追加。
--
-- 既存の本文 (body, body_paid) は普通のブログ風。
-- このタイプは「写真 1 枚ごとにキャプション + 場所タグ」を持つエントリの配列で
-- 表現する。読み手側は縦スクロール（scroll-snap）で 1 枚ずつ没入型に見る。
--
-- 最大 10 エントリ、各エントリの構造:
--   {
--     image_url: string,          // Supabase Storage 公開 URL
--     caption: string,            // 〜280 字
--     location_name: string|null, // 自由記入の場所名 ("マレ地区のパン屋" 等)
--     spot_id: uuid|null,         // 既存 spots テーブルへの参照（任意）
--     lat: number|null,           // 緯度（spot_id が無い場合の代替）
--     lng: number|null,
--     position: number            // 0-9 の順番
--   }

-- =========================================================================
-- 1. article_type enum に photo_journal を追加
-- =========================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'photo_journal'
      AND enumtypid = 'article_type'::regtype
  ) THEN
    ALTER TYPE article_type ADD VALUE 'photo_journal';
  END IF;
END $$;

-- =========================================================================
-- 2. articles.photo_entries jsonb 列を追加
-- =========================================================================
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS photo_entries jsonb NOT NULL DEFAULT '[]'::jsonb;

-- インデックスは不要（記事 1 つに紐づくだけなので scan で OK）
