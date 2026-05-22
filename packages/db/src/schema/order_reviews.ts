import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { orders } from './orders';

/**
 * order_reviews — マーケットプレイス取引のレビュー（PRD §9）。
 *
 * 設計ポイント:
 * - 双方向（buyer→seller / seller→buyer）。direction 列で区別、(order_id, direction) UNIQUE。
 * - 既存の `reviews` テーブル（記事購入レビュー）と完全分離する。
 *   articles の reviews は読者→記事、order_reviews は取引相手→相手の信頼スコア。
 * - 14 日後の締切は visible_at で管理。visible_at <= now() でのみ表示。
 *   双方提出 or 締切到達のどちらか早い方で公開（同時提出は相互ネガティブ抑止）。
 */
export const orderReviews = pgTable(
  'order_reviews',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),

    /** 'buyer_to_seller' | 'seller_to_buyer' */
    direction: text('direction').notNull(),
    /** レビューを書いた人 */
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    /** レビューされた相手 */
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    /** 1–5 星 */
    rating: integer('rating').notNull(),

    /** 軸別評価 1–5（任意）。buyer→seller のみ使用 */
    communicationRating: integer('communication_rating'),
    qualityRating: integer('quality_rating'),
    valueRating: integer('value_rating'),

    body: text('body'),

    /** タグ（買い手用: 'recommended', 'access_unique' 等。最大 3） */
    tags: text('tags').array().notNull().default([]),

    /** 公開タイミング。両者提出 or 締切時点で更新 */
    visibleAt: timestamp('visible_at', { withTimezone: true }),
    /** 提出締切（completed_at + 14d） */
    deadlineAt: timestamp('deadline_at', { withTimezone: true }).notNull(),

    isPublic: boolean('is_public').notNull().default(false),

    isSample: boolean('is_sample').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderDirectionUq: uniqueIndex('order_reviews_order_direction_uq').on(
      table.orderId,
      table.direction,
    ),
    subjectIdx: index('order_reviews_subject_idx').on(table.subjectId),
    authorIdx: index('order_reviews_author_idx').on(table.authorId),
    ratingChk: check(
      'order_reviews_rating_chk',
      sql`${table.rating} BETWEEN 1 AND 5`,
    ),
    directionChk: check(
      'order_reviews_direction_chk',
      sql`${table.direction} IN ('buyer_to_seller', 'seller_to_buyer')`,
    ),
    tagsLenChk: check(
      'order_reviews_tags_len_chk',
      sql`array_length(${table.tags}, 1) IS NULL OR array_length(${table.tags}, 1) <= 3`,
    ),
  }),
);

export const orderReviewsRelations = relations(orderReviews, ({ one }) => ({
  order: one(orders, {
    fields: [orderReviews.orderId],
    references: [orders.id],
  }),
  author: one(users, {
    fields: [orderReviews.authorId],
    references: [users.id],
  }),
  subject: one(users, {
    fields: [orderReviews.subjectId],
    references: [users.id],
  }),
}));

export type OrderReview = typeof orderReviews.$inferSelect;
export type NewOrderReview = typeof orderReviews.$inferInsert;
