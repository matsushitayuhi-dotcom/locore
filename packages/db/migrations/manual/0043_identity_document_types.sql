-- 0043_identity_document_types.sql
--
-- 「居住確認 (residency verification)」から「本人確認 (identity verification)」
-- への方針転換に伴い、受理書類の種類を拡張する。
--
-- 既存テーブル `residency_verifications` と enum `residency_document_type`
-- は内部実装としてそのまま残し (UI 表示だけ「本人確認」化)、enum 値だけ
-- 追加で本人確認に必要な書類を表現できるようにする。
--
-- 純加算なので既存データには影響しない。アプリ側コードは 0043 適用前でも
-- 動くが、新しい書類タイプは選べない。
--
-- 適用方法: Supabase Studio の SQL Editor にそのまま貼り付けて実行。
--

-- 顔写真付き身分証 (日本ユーザー向けの主軸)
ALTER TYPE residency_document_type ADD VALUE IF NOT EXISTS 'passport';
ALTER TYPE residency_document_type ADD VALUE IF NOT EXISTS 'my_number_card';
ALTER TYPE residency_document_type ADD VALUE IF NOT EXISTS 'driver_license';

-- 確認用クエリ (実行後にコメントアウトを外して試せる)
-- SELECT unnest(enum_range(NULL::residency_document_type));
