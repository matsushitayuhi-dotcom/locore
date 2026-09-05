import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { userServices } from './user_services';
import { chatThreads } from './chat';

/**
 * consultation_bookings — 相談の予約リクエスト。
 *
 * ライフサイクル: requested（返答待ち）→ accepted（確定）/ declined / cancelled /
 * expired。'paid' / 'completed' は決済スライス用の予約語で本スライスでは未使用。
 *
 * メニュー内容（service_title / price_jpy / commission_rate / platform_fee_jpy）は
 * リクエスト時点のスナップショット — 後からメニューが変更・削除されても
 * 予約カードの表示と金額が変わらない。
 *
 * 同一エキスパートの accepted / paid 枠は EXCLUDE USING gist で時間帯の重なりを
 * DB レベルで禁止（manual/0061_booking_availability.sql）。同時承諾はどちらか一方が
 * 制約違反で失敗する。
 */
export const consultationBookings = pgTable(
  'consultation_bookings',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    serviceId: uuid('service_id').references(() => userServices.id, {
      onDelete: 'set null',
    }),
    expertId: uuid('expert_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 'requested' | 'accepted' | 'declined' | 'cancelled' | 'expired' | 'paid' | 'completed' */
    status: text('status').notNull().default('requested'),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    /** リクエスト時点のメニュー名スナップショット */
    serviceTitle: text('service_title').notNull(),
    priceJpy: integer('price_jpy').notNull(),
    /** 手数料率スナップショット（既定 0.20）。numeric は string で返る */
    commissionRate: numeric('commission_rate', { precision: 4, scale: 2 })
      .notNull()
      .default('0.20'),
    platformFeeJpy: integer('platform_fee_jpy').notNull().default(0),
    requestMessage: text('request_message'),
    chatThreadId: uuid('chat_thread_id').references(() => chatThreads.id, {
      onDelete: 'set null',
    }),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    /**
     * 参加リンク（通知スライスで実運用開始）。承諾時に users.meeting_room_url から
     * 自動コピー、または setBookingMeetUrl でエキスパートが個別設定。
     */
    meetUrl: text('meet_url'),
    /**
     * 前日リマインダー送信済み時刻（冪等キー。NULL = 未送信）。
     * manual/0082_booking_notifications.sql。
     */
    reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
    /**
     * 継続プラン契約（plan_enrollments）経由のセッション。NULL = 単発。
     * price_jpy=0 で作られ、当月残回数の算出対象。manual/0083_companion_plans.sql。
     * （FK は DB 側で定義。ここで references() すると循環 import になるため持たない）
     */
    enrollmentId: uuid('enrollment_id'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    stripeCheckoutSessionId: text('stripe_checkout_session_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    expertStartIdx: index('consultation_bookings_expert_start_idx').on(
      table.expertId,
      table.startAt,
    ),
    requesterCreatedIdx: index('consultation_bookings_requester_created_idx').on(
      table.requesterId,
      table.createdAt,
    ),
    statusIdx: index('consultation_bookings_status_idx').on(table.status),
  }),
);

export const consultationBookingsRelations = relations(
  consultationBookings,
  ({ one }) => ({
    service: one(userServices, {
      fields: [consultationBookings.serviceId],
      references: [userServices.id],
    }),
    expert: one(users, {
      fields: [consultationBookings.expertId],
      references: [users.id],
    }),
    requester: one(users, {
      fields: [consultationBookings.requesterId],
      references: [users.id],
    }),
    chatThread: one(chatThreads, {
      fields: [consultationBookings.chatThreadId],
      references: [chatThreads.id],
    }),
  }),
);

export type ConsultationBooking = typeof consultationBookings.$inferSelect;
export type NewConsultationBooking = typeof consultationBookings.$inferInsert;

/** consultation_bookings.status の取りうる値 */
export const CONSULTATION_BOOKING_STATUSES = [
  'requested',
  'accepted',
  'declined',
  'cancelled',
  'expired',
  'paid',
  'completed',
] as const;
export type ConsultationBookingStatus =
  (typeof CONSULTATION_BOOKING_STATUSES)[number];
