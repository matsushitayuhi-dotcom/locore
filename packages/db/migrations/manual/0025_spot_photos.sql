-- 0025_spot_photos.sql
--
-- spots テーブルに google_photo_urls (text[]) 列を追加する。
-- Place Details の photos[] を `getUrl({maxWidth})` で URL 化したものを最大 5 件保存し、
-- 記事ページ・スポット一覧で写真サムネとして表示する。

ALTER TABLE spots
  ADD COLUMN IF NOT EXISTS google_photo_urls text[];
