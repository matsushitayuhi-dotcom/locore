import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  customType,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { articles } from './articles';

/**
 * PostGIS GEOGRAPHY(Point, 4326) 型。
 * Drizzle のネイティブ対応がないため customType で扱う。
 * 詳細は ARCHITECTURE-DECISIONS.md §4.6.1。
 */
export const point = customType<{
  data: { lat: number; lng: number };
  driverData: string;
}>({
  dataType() {
    return 'geography(Point,4326)';
  },
  toDriver(value) {
    return sql`ST_SetSRID(ST_MakePoint(${value.lng}, ${value.lat}), 4326)::geography`.toString();
  },
});

/**
 * spots — 記事に紐づくスポット情報。
 * 地理クエリは GIST インデックスを後続マイグレーションで追加する。
 */
export const spots = pgTable(
  'spots',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    address: text('address'),
    location: point('location').notNull(),
    category: text('category'),
    priceEstimate: text('price_estimate'),
    openingHours: text('opening_hours'),
    tags: text('tags').array().notNull().default([]),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    articleIdx: index('spots_article_id_idx').on(table.articleId),
  }),
);

export type Spot = typeof spots.$inferSelect;
export type NewSpot = typeof spots.$inferInsert;
