import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { orders } from './orders';
import {
  disputeStatusEnum,
  disputeReasonEnum,
} from './marketplace_enums';

/**
 * disputes — 取引紛争（PRD §10）。
 *
 * - 1 order に複数 dispute は想定しない（再オープンは旧 dispute を archived にして新規）
 * - 提起者 (initiator) は buyer / seller どちらでも可
 * - 運営が assigned_admin として担当を持つ
 * - 解決時は orders.status を 'released' / 'refunded' に書き戻すロジック側責任
 *
 * SLA: open → investigating まで運営は 1 営業日以内。
 *      open から resolved* まで 7 営業日以内（PRD §10）。
 */
export const disputes = pgTable(
  'disputes',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),

    initiatorId: uuid('initiator_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    /** 'buyer' | 'seller' */
    initiatorRole: text('initiator_role').notNull(),

    reason: disputeReasonEnum('reason').notNull(),
    description: text('description').notNull(),

    /** 添付（画像 URL や PDF）。Storage 上のキー */
    evidence: jsonb('evidence')
      .$type<
        Array<{ kind: string; url: string; addedBy: string; addedAt: string }>
      >()
      .notNull()
      .default([]),

    status: disputeStatusEnum('status').notNull().default('open'),

    assignedAdminId: uuid('assigned_admin_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    /** 解決の判断結果メモ */
    resolutionNotes: text('resolution_notes'),
    /** 返金が partial の場合の返金額 (minor) */
    refundAmountMinor: integer('refund_amount_minor'),
    /** 紛争での platform_fee 取り扱い ('keep' | 'waive' | 'half') */
    platformFeeOutcome: text('platform_fee_outcome'),

    /** SLA 計測用 */
    firstResponseAt: timestamp('first_response_at', { withTimezone: true }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderIdx: index('disputes_order_idx').on(table.orderId),
    statusIdx: index('disputes_status_idx').on(table.status, table.createdAt),
    initiatorIdx: index('disputes_initiator_idx').on(table.initiatorId),
    assignedIdx: index('disputes_assigned_idx').on(table.assignedAdminId),
  }),
);

export const disputesRelations = relations(disputes, ({ one }) => ({
  order: one(orders, {
    fields: [disputes.orderId],
    references: [orders.id],
  }),
  initiator: one(users, {
    fields: [disputes.initiatorId],
    references: [users.id],
  }),
  assignedAdmin: one(users, {
    fields: [disputes.assignedAdminId],
    references: [users.id],
  }),
}));

export type Dispute = typeof disputes.$inferSelect;
export type NewDispute = typeof disputes.$inferInsert;
