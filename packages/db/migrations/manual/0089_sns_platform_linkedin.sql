-- 0089_sns_platform_linkedin.sql
--
-- SNS リンクに LinkedIn を追加（2026-09-06）。facebook / email は UI の選択肢から外すが、
-- 既存行を壊さないよう enum 値は残す（表示側 SocialIcons の ORDER から外して非表示にする）。
--
-- additive。ALTER TYPE ... ADD VALUE はトランザクション外で実行する（psql -f は自動コミットなのでそのままで可）。
-- 適用手順（Supabase）: SQL Editor に貼り付けて Run。

ALTER TYPE sns_platform ADD VALUE IF NOT EXISTS 'linkedin';
