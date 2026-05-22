import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { cities } from './cities';
import { listingOptions } from './listing_options';
import { orders } from './orders';
import {
  listingStatusEnum,
  pricingModelEnum,
  listingCategoryEnum,
} from './marketplace_enums';

/**
 * listings — 出品（スキル / 人脈マーケットプレイス）。
 *
 * 旧 user_services は「無料の名刺ページ」だが、listings は
 * 「Stripe 決済を伴う取引可能な出品」。両者は今後も並存する
 * （詳細は PRD §17・user_services は legacy 扱い、移行 UI で誘導）。
 *
 * price_currency は seller の payout 通貨に揃える（マルチカレンシー）。
 * price_amount_minor は 通貨の最小単位（JPY=1, EUR=cents）で保持。
 */
export const listings = pgTable(
  'listings',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    title: text('title').notNull(),
    /** 短い summary。検索結果カードに表示 */
    summary: text('summary'),
    /** 本文 Markdown */
    description: text('description').notNull(),

    category: listingCategoryEnum('category').notNull(),
    /** カテゴリを跨ぐ自由タグ（最大 10） */
    tags: text('tags').array().notNull().default([]),

    /** 提供都市 (cities) ・複数都市対応は v2。現状 1 都市 */
    cityId: uuid('city_id').references(() => cities.id, { onDelete: 'set null' }),
    /** 「現地集合 / オンライン / 国際発送」等のフラグ */
    deliveryMode: text('delivery_mode').notNull().default('in_person'),
    // 'in_person' | 'online' | 'shipping' | 'hybrid'

    /** 価格モデル。tiered なら listing_options に詳細 */
    pricingModel: pricingModelEnum('pricing_model').notNull(),

    /** 基本価格（fixed / hourly / daily / per_item の単価）。tiered/quote_only は NULL 可 */
    priceAmountMinor: integer('price_amount_minor'),
    priceCurrency: text('price_currency').notNull(),

    /** quote_only のときの参考レンジ（UI 表示用、見積前提） */
    priceRangeMinMinor: integer('price_range_min_minor'),
    priceRangeMaxMinor: integer('price_range_max_minor'),

    /** 最小ロット（per_item の最小数量、hourly の最小時間 等） */
    minQuantity: integer('min_quantity'),
    /** 最大ロット。NULL は無制限 */
    maxQuantity: integer('max_quantity'),

    /** カバー画像 URL */
    coverImageUrl: text('cover_image_url'),
    /** ギャラリー画像（最大 10） */
    galleryImages: jsonb('gallery_images').$type<string[]>().notNull().default([]),

    /** 出品者が示す「事前回答」FAQ */
    faq: jsonb('faq')
      .$type<Array<{ q: string; a: string }>>()
      .notNull()
      .default([]),

    /** 提供条件・キャンセルポリシー等の構造化メタ */
    metadata: jsonb('metadata').notNull().default({}),

    /** 公開ステータス */
    status: listingStatusEnum('status').notNull().default('draft'),

    /** 公開日時。検索順序にも使う */
    publishedAt: timestamp('published_at', { withTimezone: true }),

    /** 集計キャッシュ */
    viewCount: integer('view_count').notNull().default(0),
    orderCount: integer('order_count').notNull().default(0),

    /** サンプルデータ識別用 */
    isSample: boolean('is_sample').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    sellerIdx: index('listings_seller_idx').on(table.sellerId),
    statusIdx: index('listings_status_idx').on(table.status, table.publishedAt),
    cityIdx: index('listings_city_idx').on(table.cityId),
    categoryIdx: index('listings_category_idx').on(
      table.category,
      table.status,
      table.publishedAt,
    ),
    isSampleIdx: index('listings_is_sample_idx').on(table.isSample),
  }),
);

export const listingsRelations = relations(listings, ({ one, many }) => ({
  seller: one(users, {
    fields: [listings.sellerId],
    references: [users.id],
  }),
  city: one(cities, {
    fields: [listings.cityId],
    references: [cities.id],
  }),
  options: many(listingOptions),
  orders: many(orders),
}));

export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
