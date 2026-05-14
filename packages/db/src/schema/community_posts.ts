import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { cities } from './cities';

/**
 * community_posts — 駐在員コミュニティ系の 6 種類の投稿を 1 テーブルで管理。
 * manual/0033_community_posts.sql。
 *
 * kind ごとに metadata の中身が変わる（型は lib/community/constants.ts）。
 */

export const communityPostKindEnum = pgEnum('community_post_kind', [
  'job',
  'apartment',
  'marketplace',
  'group',
  'lesson',
  'mutual_aid',
]);

export const communityPostStatusEnum = pgEnum('community_post_status', [
  'active',
  'closed',
  'expired',
]);

export const communityPosts = pgTable(
  'community_posts',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    kind: communityPostKindEnum('kind').notNull(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    title: text('title').notNull(),
    body: text('body').notNull(),

    cityId: uuid('city_id').references(() => cities.id, { onDelete: 'set null' }),
    locationText: text('location_text'),

    priceAmount: integer('price_amount'),
    priceCurrency: text('price_currency').default('EUR'),
    priceUnit: text('price_unit'),

    photos: jsonb('photos')
      .$type<string[]>()
      .notNull()
      .default([]),

    contactMethod: text('contact_method').notNull().default('locore_message'),

    /** kind 固有のメタ。アプリ側で型付けする */
    metadata: jsonb('metadata').notNull().default({}),

    status: communityPostStatusEnum('status').notNull().default('active'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    viewCount: integer('view_count').notNull().default(0),

    isSample: boolean('is_sample').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    kindStatusIdx: index('community_posts_kind_status_idx').on(
      table.kind,
      table.status,
      table.createdAt,
    ),
    authorIdx: index('community_posts_author_idx').on(table.authorId),
    cityIdx: index('community_posts_city_idx').on(table.cityId),
  }),
);

export const communityPostsRelations = relations(communityPosts, ({ one }) => ({
  author: one(users, {
    fields: [communityPosts.authorId],
    references: [users.id],
  }),
  city: one(cities, {
    fields: [communityPosts.cityId],
    references: [cities.id],
  }),
}));

export type CommunityPost = typeof communityPosts.$inferSelect;
export type NewCommunityPost = typeof communityPosts.$inferInsert;
