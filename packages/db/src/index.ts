export * from './client';
export * as schema from './schema';

// 通知設定の型・デフォルト値はアプリ側からも参照したいので個別に再エクスポート
export {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
  type EducationEntry,
  type WorkEntry,
} from './schema/users';

// 予約ステータスはアプリ側のラベル・分岐で使うので個別に再エクスポート
export {
  CONSULTATION_BOOKING_STATUSES,
  type ConsultationBookingStatus,
} from './schema/consultation_bookings';

// 継続プラン（伴走）ステータスも同様に再エクスポート
export {
  PLAN_ENROLLMENT_STATUSES,
  type PlanEnrollmentStatus,
} from './schema/plan_enrollments';
