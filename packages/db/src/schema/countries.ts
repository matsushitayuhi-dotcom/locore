import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { cities } from './cities';

/**
 * countries — 国マスタ。
 *
 * 世界ピッカー画面で「どの国に行く？」を選ぶエントリ。
 * status='active' な国だけがクリック可能で、それ以外は Coming Soon。
 *
 * code は ISO 3166-1 alpha-2 を小文字で。
 */
export const countries = pgTable(
  'countries',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    /** ISO 3166-1 alpha-2 を lowercase で (例: 'fr', 'jp', 'us') */
    code: text('code').notNull().unique(),
    nameJa: text('name_ja').notNull(),
    nameEn: text('name_en').notNull(),
    /** 'europe' | 'asia' | 'north_america' | 'oceania' | 'south_america' | 'middle_east_africa' */
    continent: text('continent').notNull(),
    /** 'active' | 'coming_soon' | 'hidden' */
    status: text('status').notNull().default('coming_soon'),
    /** 世界ピッカー UI で大陸内の並び順を制御 */
    position: integer('position').notNull().default(100),
    /** 🇫🇷 等の国旗 emoji */
    emoji: text('emoji'),
    /** 国カードのカバー画像 URL */
    heroImageUrl: text('hero_image_url'),
    /** 「パリを起点に、ワインの郷とプロヴァンスへ」のような短い説明 */
    shortDescription: text('short_description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index('countries_status_idx').on(table.status),
    continentIdx: index('countries_continent_idx').on(table.continent),
    positionIdx: index('countries_position_idx').on(table.position),
  }),
);

export const countriesRelations = relations(countries, ({ many }) => ({
  cities: many(cities),
}));

export type Country = typeof countries.$inferSelect;
export type NewCountry = typeof countries.$inferInsert;
