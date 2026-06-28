import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  doublePrecision,
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
    /** ===== 0058 で追加: Airbnb 風 体験詳細ページ用のフィールド群 =====
     *  すべて additive・nullable / default。未適用環境でもコード側 try/catch で安全。 */
    /** 追加写真 URL の配列（cover とは別。表示時は cover を先頭に連結） */
    galleryImages: text('gallery_images').array().default([]),
    /** 所要時間ラベル（例 "約2時間"） */
    durationLabel: text('duration_label'),
    /** 最少 / 最多人数 */
    minParticipants: integer('min_participants'),
    maxParticipants: integer('max_participants'),
    /** 対応言語（例 ['日本語','フランス語']） */
    languages: text('languages').array().default([]),
    /** 体験の特徴（ライムチェックで表示） */
    highlights: text('highlights').array().default([]),
    /** 含まれるもの（ライムチェックで表示） */
    inclusions: text('inclusions').array().default([]),
    /** 集合場所名 + 緯度経度（キーレス Google Maps embed 用） */
    meetingPointName: text('meeting_point_name'),
    meetingPointLat: doublePrecision('meeting_point_lat'),
    meetingPointLng: doublePrecision('meeting_point_lng'),
    /** キャンセルポリシー（安心注記で表示） */
    cancellationPolicy: text('cancellation_policy'),
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
