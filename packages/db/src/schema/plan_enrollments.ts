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
 * plan_enrollments — 継続プラン（伴走）の契約。
 *
 * ライフサイクル: requested（申込中）→ active（承諾・伴走中）/ declined /
 * cancelled（申込側取り下げ）/ ended（伴走終了）。'past_due' は決済スライス用の
 * 予約語で本スライスでは未使用。
 *
 * plan_title / monthly_price_jpy / sessions_per_month / duration_minutes は
 * 申込時点のスナップショット（consultation_bookings と同じ哲学）。
 *
 * 同一プラン × 同一メンバーの requested/active は EXCLUDE 制約で 1 件まで
 * （manual/0083_companion_plans.sql）。
 */
export const planEnrollments = pgTable(
  'plan_enrollments',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    serviceId: uuid('service_id').references(() => userServices.id, {
      onDelete: 'set null',
    }),
    expertId: uuid('expert_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 'requested' | 'active' | 'declined' | 'cancelled' | 'ended' | 'past_due' */
    status: text('status').notNull().default('requested'),
    /** ▼ 申込時点のスナップショット */
    planTitle: text('plan_title').notNull(),
    monthlyPriceJpy: integer('monthly_price_jpy').notNull(),
    sessionsPerMonth: integer('sessions_per_month').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    /** numeric は string で返る */
    commissionRate: numeric('commission_rate', { precision: 4, scale: 2 })
      .notNull()
      .default('0.20'),
    platformFeeJpy: integer('platform_fee_jpy').notNull().default(0),
    requestMessage: text('request_message'),
    chatThreadId: uuid('chat_thread_id').references(() => chatThreads.id, {
      onDelete: 'set null',
    }),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    /** 決済スライス用シーム（本スライスでは NULL 運用） */
    stripeSubscriptionId: text('stripe_subscription_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    expertStatusIdx: index('plan_enrollments_expert_status_idx').on(
      table.expertId,
      table.status,
    ),
    memberStatusIdx: index('plan_enrollments_member_status_idx').on(
      table.memberId,
      table.status,
    ),
  }),
);

export const planEnrollmentsRelations = relations(planEnrollments, ({ one }) => ({
  service: one(userServices, {
    fields: [planEnrollments.serviceId],
    references: [userServices.id],
  }),
  expert: one(users, {
    fields: [planEnrollments.expertId],
    references: [users.id],
  }),
  member: one(users, {
    fields: [planEnrollments.memberId],
    references: [users.id],
  }),
  chatThread: one(chatThreads, {
    fields: [planEnrollments.chatThreadId],
    references: [chatThreads.id],
  }),
}));

export type PlanEnrollment = typeof planEnrollments.$inferSelect;
export type NewPlanEnrollment = typeof planEnrollments.$inferInsert;

/** plan_enrollments.status の取りうる値 */
export const PLAN_ENROLLMENT_STATUSES = [
  'requested',
  'active',
  'declined',
  'cancelled',
  'ended',
  'past_due',
] as const;
export type PlanEnrollmentStatus = (typeof PLAN_ENROLLMENT_STATUSES)[number];
