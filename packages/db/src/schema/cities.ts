import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  doublePrecision,
  integer,
  index,
  AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { articles } from './articles';
import { countries } from './countries';

/**
 * cities — 地理「地域」マスタ。
 *
 * 名前は cities のままだが、Phase 2 で「国の中の旅行スコープ」を
 * 表す Region として運用する（テーブル名を変えると FK 影響が大きいため維持）。
 *
 * kind:
 *   - 'metro'  : 単一都市 + 近郊（例: パリ＆近郊、ロンドン）
 *   - 'area'   : 広めの地域（例: トスカーナ、京阪神、ハワイ）
 *   - 'other'  : 国の「その他」カテゴリ（slug = '<code>-other'）
 *   - 'city'   : サブエリア（例: パリの中のマレ地区）。parent_id を持つ
 *
 * 各国に必ず kind='other' の region を 1 つ持たせる。
 * is_active=false は coming soon 扱い（記事投稿不可）。
 */
export const cities = pgTable(
  'cities',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    slug: text('slug').notNull().unique(),
    nameJa: text('name_ja').notNull(),
    nameEn: text('name_en'),
    /** ISO 3166-1 alpha-2 lowercase。`countries.code` と一致。
     *  Phase 1 互換のため text のまま残し、新たに country_id FK も持つ。 */
    country: text('country').notNull(),
    /** 国マスタへの参照 */
    countryId: uuid('country_id').references(() => countries.id, {
      onDelete: 'restrict',
    }),
    /** 'metro' | 'area' | 'other' | 'city' */
    kind: text('kind').notNull().default('city'),
    /** 国内での並び順（昇順） */
    position: integer('position').notNull().default(100),
    /** 🗼 等の代表 emoji */
    emoji: text('emoji'),
    heroImageUrl: text('hero_image_url'),
    /** サブエリアの親 region（例: マレ地区の親はパリ）。自己参照 */
    parentId: uuid('parent_id').references((): AnyPgColumn => cities.id, {
      onDelete: 'set null',
    }),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    timezone: text('timezone').notNull().default('UTC'),
    isActive: boolean('is_active').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    activeIdx: index('cities_is_active_idx').on(table.isActive),
    countryIdx: index('cities_country_idx').on(table.countryId),
    kindIdx: index('cities_kind_idx').on(table.kind),
    parentIdx: index('cities_parent_idx').on(table.parentId),
  }),
);

export const citiesRelations = relations(cities, ({ one, many }) => ({
  country: one(countries, {
    fields: [cities.countryId],
    references: [countries.id],
  }),
  articles: many(articles),
}));

export type City = typeof cities.$inferSelect;
export type NewCity = typeof cities.$inferInsert;

/** Phase 2 で region と呼ぶための型エイリアス */
export type Region = City;
