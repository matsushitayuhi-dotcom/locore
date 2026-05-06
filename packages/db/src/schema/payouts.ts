import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { payoutStatusEnum } from './enums';

/**
 * payouts — ライターへの月次払い出し（Wise 経由）。
 *
 * 期間内 (period_start–period_end) の純額をまとめて送金。
 */
export const payouts = pgTable(
  'payouts',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    writerId: uuid('writer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    amountJpy: integer('amount_jpy').notNull(),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    status: payoutStatusEnum('status').notNull().default('pending'),
    wiseTransferId: text('wise_transfer_id'),
    initiatedAt: timestamp('initiated_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    writerIdx: index('payouts_writer_idx').on(table.writerId),
    statusIdx: index('payouts_status_idx').on(table.status),
    periodIdx: index('payouts_period_idx').on(table.periodStart, table.periodEnd),
  }),
);

export const payoutsRelations = relations(payouts, ({ one }) => ({
  writer: one(users, {
    fields: [payouts.writerId],
    references: [users.id],
  }),
}));

export type Payout = typeof payouts.$inferSelect;
export type NewPayout = typeof payouts.$inferInsert;
