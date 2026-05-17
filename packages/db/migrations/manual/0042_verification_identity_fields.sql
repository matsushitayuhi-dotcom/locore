-- 0042_verification_identity_fields.sql
--
-- 居住確認に「本人特定に必要な最小限の個人情報」を追加。
-- 海外運用なので名前は英語表記 (Roman) が必須、日本語表記 (Kanji/Kana)
-- は任意とする。住所・電話番号は照合のため必須。
--
-- これらは GDPR 配慮のため 30 日後にファイルと一緒に物理削除はしないが、
-- ユーザーが申請を「取り下げ」した場合は履歴行ごと削除可能。
-- 表示は editor 専用画面のみ。

ALTER TABLE residency_verifications
  ADD COLUMN IF NOT EXISTS legal_name_roman text,
  ADD COLUMN IF NOT EXISTS legal_name_native text,
  ADD COLUMN IF NOT EXISTS address_line text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS phone_number text;

COMMENT ON COLUMN residency_verifications.legal_name_roman IS
  '英語表記の氏名 (パスポート等の Roman 表記)。原則必須';
COMMENT ON COLUMN residency_verifications.legal_name_native IS
  '日本語 / 母語表記の氏名 (任意)。漢字・かな・現地語など';
COMMENT ON COLUMN residency_verifications.address_line IS
  '在住地の住所 (番地・通り名・市区町村まで)';
COMMENT ON COLUMN residency_verifications.postal_code IS
  '郵便番号 (国によりフォーマット異なる)';
COMMENT ON COLUMN residency_verifications.phone_number IS
  '電話番号 (国コード含む E.164 形式推奨、例: +33612345678)';
