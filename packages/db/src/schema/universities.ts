import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * universities — 海外大学マスタ（Wikidata 由来）。
 *
 * 学歴エディタの学校オートコンプリート等の参照用（UI 連携は別タスク）。
 * wikidata_id（QID）を一意キーに seed/import-universities.ts が冪等 upsert。
 * trgm index 等の DB 側詳細は manual/0081_universities.sql。
 */
export const universities = pgTable(
  'universities',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    /** Wikidata QID（例 'Q49088' = MIT）。取り込みの一意キー */
    wikidataId: text('wikidata_id').unique(),
    nameEn: text('name_en'),
    /** 日本語名（ja ラベル）。無い大学は null で name_en を表示に使う */
    nameJa: text('name_ja'),
    /** ISO 3166-1 alpha-2 大文字（US/GB/CA...） */
    countryCode: text('country_code'),
    /** 表示用の国名（日本語） */
    country: text('country'),
    /** 所在都市（P131 のラベル。日本語優先） */
    city: text('city'),
    /** 公式サイト（P856） */
    website: text('website'),
    source: text('source').default('wikidata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    countryCodeIdx: index('universities_country_code_idx').on(
      table.countryCode,
    ),
    nameEnIdx: index('universities_name_en_idx').on(table.nameEn),
  }),
);

export type University = typeof universities.$inferSelect;
export type NewUniversity = typeof universities.$inferInsert;
