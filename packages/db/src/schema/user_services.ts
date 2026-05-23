import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { cities } from './cities';

/**
 * user_services — ユーザーが自分の "強み" で出品するサービス。
 *
 * 例: 「マレ地区半日アテンド」「日仏翻訳・通訳」「フランス留学相談」
 *
 * - 公開判定は is_active = true のみ
 * - contact_method='chat' なら問い合わせは内部チャットで進む
 * - contact_method='external_url' なら external_url にリンクするだけ
 *
 * マイグレーション: `manual/0016_user_services.sql`
 */
export const userServices = pgTable(
  'user_services',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    /** 'tourism' / 'consulting' / 'study_abroad' / 'translation' / 'attend' / 'other' */
    category: text('category'),
    priceJpy: integer('price_jpy'),
    /** 例: '1時間あたり' / '1日' / '1件' / '応相談' */
    priceUnit: text('price_unit'),
    /** 'chat' / 'external_url' */
    contactMethod: text('contact_method').notNull().default('chat'),
    externalUrl: text('external_url'),
    /** どの都市 / 地域で提供しているか。NULL = 指定なし（0046 で追加） */
    cityId: uuid('city_id').references(() => cities.id, {
      onDelete: 'set null',
    }),
    /** 'traveler' | 'resident' | 'both' | null（0046 で追加）。
     *  NULL は「旧データ」扱い。/explore /expat 両方にフォールバックで載せる。 */
    audience: text('audience'),
    /** カバー画像 URL (0050 で追加)。NULL = 未設定 (プレースホルダー表示) */
    coverImageUrl: text('cover_image_url'),
    /** タグ複数指定 (0055 で追加)。category は「主」、tags は補助 + フリーキーワード。
     *  フィルタは ?tags=consulting,study_abroad のように複数指定可。
     *  クエリは postgres array && (overlap) を Drizzle の sql テンプレートで組む。 */
    tags: text('tags').array().notNull().default([]),
    isActive: boolean('is_active').notNull().default(true),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index('user_services_user_idx').on(table.userId),
    activeIdx: index('user_services_active_idx').on(table.isActive),
    cityIdx: index('user_services_city_idx').on(table.cityId),
    audienceIdx: index('user_services_audience_idx').on(table.audience),
  }),
);

export const userServicesRelations = relations(userServices, ({ one }) => ({
  user: one(users, {
    fields: [userServices.userId],
    references: [users.id],
  }),
  city: one(cities, {
    fields: [userServices.cityId],
    references: [cities.id],
  }),
}));

export type UserService = typeof userServices.$inferSelect;
export type NewUserService = typeof userServices.$inferInsert;
