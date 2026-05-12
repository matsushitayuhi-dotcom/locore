-- 0031_expat_info_article_type.sql
--
-- 記事タイプに 'expat_info' を追加。駐在員・在外邦人向けの「生活雑学」
-- カテゴリ（殺虫剤どこで買う？医療保険の手続きは？など）。
--
-- spot_guide / itinerary とは性質が違い、場所への深い物語ではなく
-- 「生活で困った時の実用情報」を共有する記事として運用する。
-- 価格設定は 0 円（無料）も含めた幅広い運用を想定。

-- PostgreSQL enum に値を追加（既存値を維持したまま）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'expat_info'
      AND enumtypid = 'article_type'::regtype
  ) THEN
    ALTER TYPE article_type ADD VALUE 'expat_info';
  END IF;
END $$;
