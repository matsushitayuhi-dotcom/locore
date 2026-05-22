import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { listings } from './listings';

/**
 * listing_options — Listing の階層オプション。
 *
 * pricing_model = 'tiered' のときに利用。
 * 例:
 *   - ベーシック撮影 €300 (1h)
 *   - 標準 €600 (2h + 編集 10 枚)
 *   - プレミアム €1200 (4h + 編集 30 枚 + 動画 30s)
 *
 * tiered 以外でも「オプション追加（例: 配送オプション +€20）」として使える。
 */
export const listingOptions = pgTable(
  'listing_options',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    description: text('description'),

    /** 追加金額（基本価格に上乗せ） or 絶対金額（tier の場合） */
    priceAmountMinor: integer('price_amount_minor').notNull(),
    /** true なら listings.price_currency を上書きしない（常に同じ通貨） */
    isAbsolute: boolean('is_absolute').notNull().default(true),

    /** 並び順 */
    position: integer('position').notNull().default(0),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    listingIdx: index('listing_options_listing_idx').on(table.listingId),
    listingPosIdx: index('listing_options_listing_pos_idx').on(
      table.listingId,
      table.position,
    ),
  }),
);

export const listingOptionsRelations = relations(listingOptions, ({ one }) => ({
  listing: one(listings, {
    fields: [listingOptions.listingId],
    references: [listings.id],
  }),
}));

export type ListingOption = typeof listingOptions.$inferSelect;
export type NewListingOption = typeof listingOptions.$inferInsert;
