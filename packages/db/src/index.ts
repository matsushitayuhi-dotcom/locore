export * from './client';
export * as schema from './schema';

// 通知設定の型・デフォルト値はアプリ側からも参照したいので個別に再エクスポート
export {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from './schema/users';
