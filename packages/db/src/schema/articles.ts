import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

/** article_status enum。@locore/shared の ArticleStatus と同期 */
export const articleStatusEnum = pgEnum('article_status', [
  'draft',
  'published',
  'archived',
  'pending_review',
]);

export const articleDurationEnum = pgEnum('article_duration', [
  'under_2h',
  'half_day',
  'full_day',
  'multi_day',
]);

/**
 * cities テーブル。先行ローンチはパリのみ。
 * 詳細スキーマは Phase 1 で拡張する。
 */
export const cities = pgTable('cities', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  slug: text('slug').notNull().unique(),
  nameJa: text('name_ja').notNull(),
  country: text('country').notNull(),
  lat: text('lat'),
  lng: text('lng'),
  timezone: text('timezone').notNull().default('UTC'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * articles テーブル。
 * 公開クエリで頻出する (city_id, published_at DESC) WHERE status='published' のインデックスは
 * 後続のマイグレーションで追加する想定（部分インデックスは drizzle-kit が SQL 直書きを要求するため）。
 */
export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    writerId: uuid('writer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    cityId: uuid('city_id')
      .notNull()
      .references(() => cities.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    coverImageUrl: text('cover_image_url'),
    priceJpy: integer('price_jpy').notNull(),
    status: articleStatusEnum('status').notNull().default('draft'),
    tags: text('tags').array().notNull().default([]),
    durationType: articleDurationEnum('duration_type'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    writerIdx: index('articles_writer_id_idx').on(table.writerId),
    cityIdx: index('articles_city_id_idx').on(table.cityId),
  }),
);

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type City = typeof cities.$inferSelect;
export type NewCity = typeof cities.$inferInsert;
