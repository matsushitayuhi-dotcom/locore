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
import { orders } from './orders';
import { users } from './users';
import { escrowEntryTypeEnum } from './marketplace_enums';

/**
 * escrow_ledger — エスクロー資金移動の内部台帳（PRD §5）。
 *
 * Stripe Connect の Separate Charges & Transfers モデルを写し取った
 * append-only ledger。月次レポート・税務・運営ダッシュボードの根拠データ。
 *
 * - 1 取引（order）あたり複数行（charge → hold → transfer → platform_fee 等）
 * - 金額は order の通貨に揃え、`currency` は冗長に持つ（料率検証時の楽さ優先）
 * - 修正は行追加で表現（adjustment エントリ）。UPDATE 禁止運用を想定
 */
export const escrowLedger = pgTable(
  'escrow_ledger',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),

    entryType: escrowEntryTypeEnum('entry_type').notNull(),

    /** 当該エントリの金額。符号付き minor unit。
     *   charge (+), hold (+/− は方針次第、便宜上 +)、transfer (−), refund (−) */
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').notNull(),

    /** 関連する Stripe オブジェクト ID（PaymentIntent / Charge / Transfer / Refund） */
    stripeObjectId: text('stripe_object_id'),

    /** 入金 / 出金の相手側ユーザー（buyer or seller）。platform_fee は NULL */
    counterpartyId: uuid('counterparty_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    /** バッチや手動操作の説明 */
    memo: text('memo'),
    /** Stripe webhook payload の主要メタ */
    metadata: jsonb('metadata').notNull().default({}),

    /** 実際の経済イベント時刻（Stripe イベント時刻に合わせる） */
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderIdx: index('escrow_ledger_order_idx').on(table.orderId, table.occurredAt),
    entryTypeIdx: index('escrow_ledger_entry_type_idx').on(table.entryType),
    stripeObjIdx: index('escrow_ledger_stripe_obj_idx').on(table.stripeObjectId),
  }),
);

export const escrowLedgerRelations = relations(escrowLedger, ({ one }) => ({
  order: one(orders, {
    fields: [escrowLedger.orderId],
    references: [orders.id],
  }),
  counterparty: one(users, {
    fields: [escrowLedger.counterpartyId],
    references: [users.id],
  }),
}));

export type EscrowLedgerEntry = typeof escrowLedger.$inferSelect;
export type NewEscrowLedgerEntry = typeof escrowLedger.$inferInsert;
