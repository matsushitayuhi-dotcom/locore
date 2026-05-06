import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  customType,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { articles } from './articles';
import { spotCategoryEnum } from './enums';

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
 * 営業時間 JSONB の構造（参考）：
 * { mon: ["09:00-18:00"], tue: [...], ..., note?: string }
 */
export type OpeningHours = {
  mon?: string[];
  tue?: string[];
  wed?: string[];
  thu?: string[];
  fri?: string[];
  sat?: string[];
  sun?: string[];
  note?: string;
};

/**
 * spots — 記事に紐づくスポット情報。
 * 地理クエリは GIST インデックスを別途マイグレーションで追加する。
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
    category: spotCategoryEnum('category'),
    priceEstimate: text('price_estimate'),
    openingHours: jsonb('opening_hours').$type<OpeningHours>(),
    tags: text('tags').array().notNull().default([]),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    articleIdx: index('spots_article_id_idx').on(table.articleId),
    categoryIdx: index('spots_category_idx').on(table.category),
  }),
);

export const spotsRelations = relations(spots, ({ one }) => ({
  article: one(articles, {
    fields: [spots.articleId],
    references: [articles.id],
  }),
}));

export type Spot = typeof spots.$inferSelect;
export type NewSpot = typeof spots.$inferInsert;
