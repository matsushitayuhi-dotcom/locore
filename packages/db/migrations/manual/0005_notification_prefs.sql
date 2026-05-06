-- 0005_notification_prefs.sql
-- users テーブルに通知設定 JSONB を追加。
-- Supabase SQL Editor で実行（drizzle-kit 生成 SQL の後・既存 manual と並ぶ位置）。
--
-- 構造:
--   {
--     "web_push": { "article_published": bool, "trip_reminder": bool,
--                   "crisis_alert": bool, "purchase_completed": bool },
--     "email":    { "article_published": bool, "trip_reminder": bool,
--                   "crisis_alert": bool, "purchase_completed": bool }
--   }
--
-- 既存ユーザーには下記デフォルト値（Web Push は全 ON、Email は新着記事のみ OFF）を入れる。
-- これは TypeScript 側の DEFAULT_NOTIFICATION_PREFERENCES と一致させること。

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB
  NOT NULL DEFAULT '{
    "web_push": {
      "article_published": true,
      "trip_reminder": true,
      "crisis_alert": true,
      "purchase_completed": true
    },
    "email": {
      "article_published": false,
      "trip_reminder": true,
      "crisis_alert": true,
      "purchase_completed": true
    }
  }'::jsonb;
