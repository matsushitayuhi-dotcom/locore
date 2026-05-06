import { pgTable, uuid, text, timestamp, boolean, doublePrecision, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { articles } from './articles';

/**
 * cities — 対応都市マスタ。
 * Phase 1 はパリのみ active、London/NYC は coming soon（is_active=false）。
 */
export const cities = pgTable(
  'cities',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    slug: text('slug').notNull().unique(),
    nameJa: text('name_ja').notNull(),
    country: text('country').notNull(),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    timezone: text('timezone').notNull().default('UTC'),
    isActive: boolean('is_active').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    activeIdx: index('cities_is_active_idx').on(table.isActive),
  }),
);

export const citiesRelations = relations(cities, ({ many }) => ({
  articles: many(articles),
}));

export type City = typeof cities.$inferSelect;
export type NewCity = typeof cities.$inferInsert;
