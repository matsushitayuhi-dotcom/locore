-- 0056_resident_profile_social_cover.sql
--
-- /residents/[id] のプロフィール刷新（ポートフォリオ風レイアウト）に伴う拡張。
--   1. users にヒーロー（ヘッダー）背景画像 cover_image_url を追加
--   2. users に「こんな相談に乗れます」= offerings（フリーテキスト配列）を追加
--   3. sns_platform enum にソーシャルアイコンを拡充
--      （facebook / note / website / email を追加。LINE は対象外）
--
-- 既存の sns_links テーブル + SnsLinksEditor をそのまま再利用してアイコン表示する。

-- 1 & 2. users の新カラム ------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS offerings jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN users.cover_image_url IS
  'プロフィールのヒーロー背景画像 Public URL。NULL = 未設定（表示はネットワーク演出にフォールバック）';
COMMENT ON COLUMN users.offerings IS
  '「こんな相談に乗れます」= 提供できることの箇条書き（string[]）';

-- 3. sns_platform enum に値を追加 ---------------------------------------------
-- ALTER TYPE ... ADD VALUE はトランザクション内で使用と同時にできないため、
-- 値追加のみを行う（Supabase Studio / psql でそのまま実行可能）。
ALTER TYPE sns_platform ADD VALUE IF NOT EXISTS 'facebook';
ALTER TYPE sns_platform ADD VALUE IF NOT EXISTS 'note';
ALTER TYPE sns_platform ADD VALUE IF NOT EXISTS 'website';
ALTER TYPE sns_platform ADD VALUE IF NOT EXISTS 'email';
