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
import { relations } from 'drizzle-orm';
import { articles } from './articles';
import { spotCategoryEnum } from './enums';

/**
 * PostGIS GEOGRAPHY(Point, 4326) 型。
 * EWKT (Extended Well-Known Text) 形式で送る。
 * 例: "SRID=4326;POINT(2.3522 48.8566)"
 * PostGIS は EWKT を自動的に geography に変換する。
 */
export const point = customType<{
  data: { lat: number; lng: number };
  driverData: string;
}>({
  dataType() {
    // PostGIS は public スキーマに入ってる前提（Supabase Dashboard の
    // Extensions UI で ON にした場合の標準）。
    return 'geography(Point,4326)';
  },
  toDriver(value) {
    return `SRID=4326;POINT(${value.lng} ${value.lat})`;
  },
  fromDriver(value) {
    // 読み出し時の変換は SELECT 側で ST_X/ST_Y を使うのが一般的。
    // ここでは driverData をそのまま返す（必要なら ST_AsGeoJSON 等で別実装）。
    return value as unknown as { lat: number; lng: number };
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
