import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { purchases } from './purchases';

/**
 * reviews — 購入後のレビュー（PRD §6.5）。
 *
 * - purchase_id は UNIQUE。1購入につき1レビュー。
 * - local_score: 0–100（ローカル度合いの自己評価）
 * - satisfaction_stars: 1–5（5段階）
 * - tags: ReviewTag のうち最大3つ（@locore/shared/ReviewTag）
 */
export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    purchaseId: uuid('purchase_id')
      .notNull()
      .references(() => purchases.id, { onDelete: 'cascade' }),
    localScore: integer('local_score').notNull(),
    satisfactionStars: integer('satisfaction_stars').notNull(),
    tags: text('tags').array().notNull().default([]),
    body: text('body'),
    visitedAt: timestamp('visited_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    purchaseUq: uniqueIndex('reviews_purchase_uq').on(table.purchaseId),
    localScoreCheck: check(
      'reviews_local_score_chk',
      sql`${table.localScore} BETWEEN 0 AND 100`,
    ),
    satisfactionCheck: check(
      'reviews_satisfaction_chk',
      sql`${table.satisfactionStars} BETWEEN 1 AND 5`,
    ),
    tagsCountCheck: check(
      'reviews_tags_count_chk',
      sql`array_length(${table.tags}, 1) IS NULL OR array_length(${table.tags}, 1) <= 3`,
    ),
    createdAtIdx: index('reviews_created_at_idx').on(table.createdAt),
  }),
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  purchase: one(purchases, {
    fields: [reviews.purchaseId],
    references: [purchases.id],
  }),
}));

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
