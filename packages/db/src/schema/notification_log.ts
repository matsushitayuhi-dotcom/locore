import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { notificationChannelEnum, notificationStatusEnum } from './enums';

/**
 * notification_log — 通知の送信履歴（メール / Web Push / アプリ内）。
 *
 * type は文字列にしておく（種別はアプリ側でアサート）。
 */
export const notificationLog = pgTable(
  'notification_log',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    payload: jsonb('payload'),
    channel: notificationChannelEnum('channel').notNull(),
    status: notificationStatusEnum('status').notNull().default('pending'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('notification_log_user_idx').on(table.userId),
    statusIdx: index('notification_log_status_idx').on(table.status),
    typeIdx: index('notification_log_type_idx').on(table.type),
  }),
);

export const notificationLogRelations = relations(notificationLog, ({ one }) => ({
  user: one(users, {
    fields: [notificationLog.userId],
    references: [users.id],
  }),
}));

export type NotificationLog = typeof notificationLog.$inferSelect;
export type NewNotificationLog = typeof notificationLog.$inferInsert;
