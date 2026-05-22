import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { kycStatusEnum } from './marketplace_enums';

/**
 * seller_profiles — マーケットプレイス出品者プロフィール拡張。
 *
 * - users と 1:1（user_id がプライマリ）。出品しない一般ユーザーは行を持たない。
 * - Stripe Connect Express account_id を保持。後付け OK のため NULLABLE。
 * - languages_offered / response_time_hours は買い手向けの「目利き」情報。
 *
 * 関連: manual/0052_marketplace_schema.sql
 */
export const sellerProfiles = pgTable(
  'seller_profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    /** 商号 / 屋号。display_name とは別の「事業者名」表示用。NULL なら display_name を使う */
    businessName: text('business_name'),

    /** Stripe Connect Express の account_id (acct_xxx)。未連携は NULL */
    stripeConnectAccountId: text('stripe_connect_account_id'),

    /** Connect の charges_enabled / payouts_enabled をキャッシュ。本物は Stripe 側 */
    stripeChargesEnabled: boolean('stripe_charges_enabled').notNull().default(false),
    stripePayoutsEnabled: boolean('stripe_payouts_enabled').notNull().default(false),

    /** 売上を受け取る通貨 (ISO 4217)。EU 在住 = 'EUR'、日本帰任 = 'JPY' 等 */
    payoutCurrency: text('payout_currency').notNull().default('EUR'),

    /** Locore 独自審査ステータス。Stripe の verification とは別軸 */
    kycStatus: kycStatusEnum('kyc_status').notNull().default('not_started'),
    kycReviewedAt: timestamp('kyc_reviewed_at', { withTimezone: true }),
    kycReviewedBy: uuid('kyc_reviewed_by').references(() => users.id, {
      onDelete: 'set null',
    }),

    /** 提供言語 [{ code: 'ja', level: 'native' }, ...] */
    languagesOffered: jsonb('languages_offered')
      .$type<Array<{ code: string; level: string }>>()
      .notNull()
      .default([]),

    /** 平均応答時間（時間単位）。Order 作成時の median を非同期更新 */
    responseTimeHours: integer('response_time_hours'),

    /** リピート率 (%) ・累計取引件数 (集計キャッシュ。バッチで更新) */
    totalOrders: integer('total_orders').notNull().default(0),
    completedOrders: integer('completed_orders').notNull().default(0),
    repeatRatePct: integer('repeat_rate_pct'),

    /** 双方向レビュー集計 */
    avgRating: integer('avg_rating'), // 0–500 (5.00 を 500 で保存)
    reviewCount: integer('review_count').notNull().default(0),

    /** 紛争率 (%)。閾値超で出品停止候補に */
    disputeRatePct: integer('dispute_rate_pct'),

    /** 業界資格 / 公的資格メモ（運営確認用）。jsonb で自由 */
    credentials: jsonb('credentials')
      .$type<Array<{ kind: string; ref: string; verifiedAt?: string }>>()
      .notNull()
      .default([]),

    /** 「現在受付不可」フラグ。出品単位ではなくセラー単位の bus signal */
    acceptingOrders: boolean('accepting_orders').notNull().default(true),

    /** 自己紹介（marketplace 向け、bio とは別） */
    sellerBio: text('seller_bio'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    stripeAcctIdx: index('seller_profiles_stripe_acct_idx').on(
      table.stripeConnectAccountId,
    ),
    kycStatusIdx: index('seller_profiles_kyc_status_idx').on(table.kycStatus),
    acceptingIdx: index('seller_profiles_accepting_idx').on(table.acceptingOrders),
  }),
);

export const sellerProfilesRelations = relations(sellerProfiles, ({ one }) => ({
  user: one(users, {
    fields: [sellerProfiles.userId],
    references: [users.id],
  }),
}));

export type SellerProfile = typeof sellerProfiles.$inferSelect;
export type NewSellerProfile = typeof sellerProfiles.$inferInsert;
