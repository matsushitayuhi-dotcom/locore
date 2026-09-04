import { pgTable, uuid, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

/**
 * expert_availability — エキスパートの空き枠（相談を受けられる時間帯）。
 *
 * 入力はエキスパートの現地時間（users.timezone）、保存は UTC。
 * 相談者にはこの window 内で 30 分刻みの開始時刻候補を生成し、日本時間で見せる。
 *
 * end_at > start_at の CHECK・updated_at トリガーは DB 側
 * （manual/0061_booking_availability.sql）。
 */
export const expertAvailability = pgTable(
  'expert_availability',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // 同一ユーザー × 同一開始時刻は 1 行（並行送信レースの最終防衛線）
    userStartKey: uniqueIndex('expert_availability_user_start_key').on(
      table.userId,
      table.startAt,
    ),
  }),
);

export const expertAvailabilityRelations = relations(
  expertAvailability,
  ({ one }) => ({
    user: one(users, {
      fields: [expertAvailability.userId],
      references: [users.id],
    }),
  }),
);

export type ExpertAvailability = typeof expertAvailability.$inferSelect;
export type NewExpertAvailability = typeof expertAvailability.$inferInsert;
