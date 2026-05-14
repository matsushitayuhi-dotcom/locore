import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Locore で使う Postgres ENUM の集約。
 *
 * 値そのものは @locore/shared と同期させる方針。
 * 既存の `users.ts` / `articles.ts` で定義済みの enum はそちらに残し、
 * このファイルでは「単一テーブルでしか使わないが命名衝突を避けたい」ものを集約する。
 */

// --- Identity 関連 ---
export const residencyVerificationStatusEnum = pgEnum('residency_verification_status', [
  'pending',
  'approved',
  'rejected',
]);

export const residencyDocumentTypeEnum = pgEnum('residency_document_type', [
  'visa',
  'residence_card',
  'utility_bill',
  'tax_certificate',
  'other',
]);

export const snsPlatformEnum = pgEnum('sns_platform', [
  'tiktok',
  'instagram',
  'youtube',
  'x',
  'threads',
  'blog',
]);

export const foundingStatusEnum = pgEnum('founding_status', [
  'active',
  'paused',
  'graduated',
  'revoked',
]);

// --- Catalog ---
export const spotCategoryEnum = pgEnum('spot_category', [
  'food',
  'sight',
  'shopping',
  'lodging',
  'other',
]);

export const videoPlatformEnum = pgEnum('video_platform', [
  'tiktok',
  'instagram',
  'youtube',
  'x',
  'other',
]);

// --- Commerce ---
export const purchaseStatusEnum = pgEnum('purchase_status', [
  'pending',
  'completed',
  'refunded',
]);

export const payoutStatusEnum = pgEnum('payout_status', [
  'pending',
  'initiated',
  'completed',
  'failed',
]);

// --- Trips ---
export const tripShareRoleEnum = pgEnum('trip_share_role', ['viewer', 'editor', 'none']);

export const tripCollabRoleEnum = pgEnum('trip_collab_role', ['viewer', 'editor']);

export const tripItemTypeEnum = pgEnum('trip_item_type', ['spot', 'free']);

// --- UGC / Editorial ---
export const lightDiaryStatusEnum = pgEnum('light_diary_status', [
  'draft',
  'published',
  'removed',
]);

/**
 * 記事の種別。スポット紹介 vs 旅程プラン。
 *
 * - `spot_guide`: 個別の店・場所を紹介する記事（例: 「マレ地区の隠れベーカリー5軒」）
 * - `itinerary`: 時間軸ありのコース・モデルプラン（例: 「マレ地区半日ぶらり」）
 *
 * 既存の `article_duration` enum（half_day/full_day/...）とは別概念。
 * spot_guide でも所要時間はあり得るが、明確な「コース性」が itinerary。
 */
export const articleTypeEnum = pgEnum('article_type', [
  'spot_guide',
  'itinerary',
  'expat_info',
  'photo_journal',
]);

// --- Moderation ---
export const moderationActionEnum = pgEnum('moderation_action', [
  'pass',
  'warned',
  'held',
  'overridden',
]);

export const foundingApplicationStatusEnum = pgEnum('founding_application_status', [
  'pending',
  'approved',
  'rejected',
  'waitlist',
]);

export const reportTargetTypeEnum = pgEnum('report_target_type', [
  'article',
  'user',
  'review',
  'light_diary',
  // 'other' は「お問い合わせフォーム」用。target_id は通報対象がないため
  // ダミーの UUID（NIL UUID 等）を入れて使う想定。reason 列にバグ報告 / 機能要望 等を格納。
  'other',
]);

export const reportStatusEnum = pgEnum('report_status', [
  'open',
  'investigating',
  'resolved',
  'dismissed',
]);

// --- Crisis ---
export const crisisTypeEnum = pgEnum('crisis_type', [
  'strike',
  'demo',
  'event',
  'security',
  'other',
]);

export const crisisStatusEnum = pgEnum('crisis_status', ['draft', 'published', 'archived']);

export const crisisFeedTypeEnum = pgEnum('crisis_feed_type', ['rss', 'api', 'twitter']);

export const crisisCandidateStatusEnum = pgEnum('crisis_candidate_status', [
  'new',
  'approved',
  'rejected',
  'duplicate',
]);

// --- System ---
export const notificationChannelEnum = pgEnum('notification_channel', [
  'email',
  'web_push',
  'in_app',
]);

export const notificationStatusEnum = pgEnum('notification_status', [
  'pending',
  'sent',
  'failed',
]);
