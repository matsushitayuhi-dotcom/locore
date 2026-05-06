-- 0006_extend_reports_reason.sql
-- お問い合わせフォーム / 拡張通報フォームへの対応:
--
-- 1) `report_target_type` enum に `'other'` を追加
--    （お問い合わせフォームは記事・ユーザー等の特定対象を持たないため、
--     target_type='other' & target_id=NIL UUID で保存する）
--
-- 2) `reports.reason` カラムは text 型のため enum 拡張は不要。
--    アプリ側で zod により以下の値を許容する:
--      通報用: spam / inappropriate / misinformation / copyright / other
--      お問い合わせ用: bug / feature / terms / payment / other
--
-- ALTER TYPE ... ADD VALUE は同一トランザクション内で再利用できないため、
-- このファイルは個別実行（drizzle-kit migrate と分けて）すること。
--
-- 注意: PostgreSQL 12+ なら IF NOT EXISTS が使える。

ALTER TYPE report_target_type ADD VALUE IF NOT EXISTS 'other';
