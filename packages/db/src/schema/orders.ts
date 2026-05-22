import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { listings } from './listings';
import { listingOptions } from './listing_options';
import { orderStatusEnum } from './marketplace_enums';

/**
 * orders — マーケットプレイス取引のメインテーブル。
 *
 * 設計の中核（PRD §4 / §6 / §12）:
 * - 通貨は seller 側通貨で確定し、`amount_total_minor` に保持
 * - `commission_rule_snapshot` はその取引時点の料率ルール一式を JSONB で保存。
 *   後から料率テーブルを変えても過去取引の整合は崩れない。
 * - Stripe Connect (Separate Charges & Transfers) との対応:
 *   `stripe_payment_intent_id`: 買い手 → Platform への charge
 *   `stripe_transfer_id`: Platform → Seller への transfer（release 時に確定）
 *   `stripe_refund_id`: 返金の Stripe ID
 */
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    /** ヒューマンリーダブルな表示用番号（"LOC-2026-000123"）。アプリ層で採番 */
    orderNumber: text('order_number').notNull().unique(),

    buyerId: uuid('buyer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'restrict' }),
    /** tier 選択時の listing_option（任意） */
    listingOptionId: uuid('listing_option_id').references(() => listingOptions.id, {
      onDelete: 'set null',
    }),

    /** Listing スナップショット（タイトル / 価格モデル / 内容）。後の表示・紛争用 */
    listingSnapshot: jsonb('listing_snapshot').notNull().default({}),

    /** 状態 */
    status: orderStatusEnum('status').notNull().default('requested'),

    /** 金額（minor unit）。currency は seller の payout_currency */
    currency: text('currency').notNull(),
    /** 単価 × 数量（オプション込み）。手数料・税抜き前 */
    amountSubtotalMinor: integer('amount_subtotal_minor').notNull(),
    /** プラットフォーム手数料（platform_fee） */
    amountPlatformFeeMinor: integer('amount_platform_fee_minor').notNull().default(0),
    /** 税（適用するなら）。多くの個人取引では 0 */
    amountTaxMinor: integer('amount_tax_minor').notNull().default(0),
    /** 買い手請求総額（charge する金額） */
    amountTotalMinor: integer('amount_total_minor').notNull(),
    /** 売り手払出額（transfer する金額。subtotal - platform_fee - stripe_fee の見込み） */
    amountSellerNetMinor: integer('amount_seller_net_minor').notNull().default(0),

    /** 数量 / 時間 / 日数 */
    quantity: integer('quantity').notNull().default(1),

    /** 料率ルールのスナップショット。
     *  例: { kind: 'repeat_discount', base_pct: 12, applied_pct: 8, repeat_count: 2 } */
    commissionRuleSnapshot: jsonb('commission_rule_snapshot').notNull().default({}),

    /** 買い手から見たレートで表示する想定額（UI 補助）。
     *  例: 取引 €120 / 表示 ¥19,500（rate=162.5）*/
    buyerDisplayCurrency: text('buyer_display_currency'),
    buyerDisplayAmountMinor: integer('buyer_display_amount_minor'),
    buyerDisplayFxRate: text('buyer_display_fx_rate'), // numeric を text で保持

    /** リクエスト時に買い手が記入したフリー文（要件・希望日時等） */
    buyerNote: text('buyer_note'),
    /** quote_only / 当日変更時に seller が出した見積もり */
    sellerQuoteNote: text('seller_quote_note'),

    /** スケジュール（in_person 系で利用）。複数日や時間帯は metadata で */
    scheduledStart: timestamp('scheduled_start', { withTimezone: true }),
    scheduledEnd: timestamp('scheduled_end', { withTimezone: true }),

    /** Stripe 連携 ID（未確定段階は NULL） */
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    stripeChargeId: text('stripe_charge_id'),
    stripeTransferId: text('stripe_transfer_id'),
    stripeRefundId: text('stripe_refund_id'),

    /** 完了 / リリース / キャンセル等の主要タイムスタンプ */
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    refundedAt: timestamp('refunded_at', { withTimezone: true }),
    declinedAt: timestamp('declined_at', { withTimezone: true }),

    /** 自動 release 期限。completed_at + 48h 等。バッチが拾ってリリースする */
    autoReleaseAt: timestamp('auto_release_at', { withTimezone: true }),
    /** 自動 decline 期限。requested_at + 72h 等 */
    autoDeclineAt: timestamp('auto_decline_at', { withTimezone: true }),

    /** リピート判定：同じ buyer×seller の累計取引回数（料率計算に使用） */
    repeatIndex: integer('repeat_index').notNull().default(1),

    /** 自由メタ。配送追跡番号 / 駐車場メモ等 */
    metadata: jsonb('metadata').notNull().default({}),

    isSample: boolean('is_sample').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    buyerIdx: index('orders_buyer_idx').on(table.buyerId, table.createdAt),
    sellerIdx: index('orders_seller_idx').on(table.sellerId, table.createdAt),
    listingIdx: index('orders_listing_idx').on(table.listingId),
    statusIdx: index('orders_status_idx').on(table.status),
    stripePiIdx: index('orders_stripe_pi_idx').on(table.stripePaymentIntentId),
    autoReleaseIdx: index('orders_auto_release_idx').on(table.autoReleaseAt),
    autoDeclineIdx: index('orders_auto_decline_idx').on(table.autoDeclineAt),
  }),
);

export const ordersRelations = relations(orders, ({ one }) => ({
  buyer: one(users, {
    fields: [orders.buyerId],
    references: [users.id],
  }),
  seller: one(users, {
    fields: [orders.sellerId],
    references: [users.id],
  }),
  listing: one(listings, {
    fields: [orders.listingId],
    references: [listings.id],
  }),
  listingOption: one(listingOptions, {
    fields: [orders.listingOptionId],
    references: [listingOptions.id],
  }),
}));

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
