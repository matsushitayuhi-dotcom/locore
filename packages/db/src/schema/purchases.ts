import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { articles } from './articles';
import { purchaseStatusEnum } from './enums';

/**
 * purchases — 記事購入の記録（Stripe）。
 *
 * - amount_jpy: 売上総額
 * - fee_jpy: プラットフォーム手数料
 * - payout_jpy: ライターへの支払い額（amount - fee - 決済手数料）
 */
export const purchases = pgTable(
  'purchases',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    buyerId: uuid('buyer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'restrict' }),
    amountJpy: integer('amount_jpy').notNull(),
    feeJpy: integer('fee_jpy').notNull().default(0),
    payoutJpy: integer('payout_jpy').notNull().default(0),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    status: purchaseStatusEnum('status').notNull().default('pending'),
    purchasedAt: timestamp('purchased_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    buyerIdx: index('purchases_buyer_idx').on(table.buyerId),
    articleIdx: index('purchases_article_idx').on(table.articleId),
    statusIdx: index('purchases_status_idx').on(table.status),
    stripePiIdx: index('purchases_stripe_pi_idx').on(table.stripePaymentIntentId),
  }),
);

export const purchasesRelations = relations(purchases, ({ one }) => ({
  buyer: one(users, {
    fields: [purchases.buyerId],
    references: [users.id],
  }),
  article: one(articles, {
    fields: [purchases.articleId],
    references: [articles.id],
  }),
}));

export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;
