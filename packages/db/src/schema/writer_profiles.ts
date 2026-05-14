import { pgTable, uuid, text, integer, timestamp, boolean, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { foundingStatusEnum } from './enums';

/** writer_tier enum（DB 側）。@locore/shared の Tier と同期する。 */
export const writerTierEnum = pgEnum('writer_tier', ['S', 'A', 'B']);

/**
 * writer_profiles — ライターとしての追加情報。
 *
 * - tier: クリエイターランク（S/A/B）。手数料率の差で扱う（価格上限は廃止）
 * - residency_status: 'current_resident' / 'past_resident' / 'traveler' / 'unspecified'
 * - commission_rate_pct: 手数料率（%）。founder=10 / S=15 / A=20 / B=25 が既定
 * - lifetime_sales_count / lifetime_revenue_jpy: tier 自動昇格判定用のキャッシュ
 * - residency_verified_at: 居住認証された日時。バッジ表示用
 * - founding_*: ファウンディングメンバープログラム
 *
 * manual/0034_writer_status_and_commission.sql で residency_status,
 * commission_rate_pct, lifetime_* カラムを追加。
 */
export const writerProfiles = pgTable(
  'writer_profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tier: writerTierEnum('tier').notNull().default('B'),
    /** 'current_resident' | 'past_resident' | 'traveler' | 'unspecified' */
    residencyStatus: text('residency_status').notNull().default('unspecified'),
    residencyCountry: text('residency_country').notNull(),
    residencyYears: integer('residency_years').notNull().default(0),
    residencyVerifiedAt: timestamp('residency_verified_at', { withTimezone: true }),
    /** 手数料率（%）。価格 × (commission_rate_pct/100) が運営取り分 */
    commissionRatePct: integer('commission_rate_pct').notNull().default(25),
    /** 自動昇格判定のキャッシュ。月次 cron で更新 */
    lifetimeSalesCount: integer('lifetime_sales_count').notNull().default(0),
    lifetimeRevenueJpy: integer('lifetime_revenue_jpy').notNull().default(0),
    tierEvaluatedAt: timestamp('tier_evaluated_at', { withTimezone: true }),
    foundingMember: boolean('founding_member').notNull().default(false),
    foundingJoinedAt: timestamp('founding_joined_at', { withTimezone: true }),
    foundingFeeWaiverUntil: timestamp('founding_fee_waiver_until', { withTimezone: true }),
    foundingStatus: foundingStatusEnum('founding_status'),
    bio: text('bio'),
    /** サンプルデータ識別用。`manual/0010_is_sample.sql` */
    isSample: boolean('is_sample').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tierIdx: index('writer_profiles_tier_idx').on(table.tier),
    foundingIdx: index('writer_profiles_founding_idx').on(table.foundingMember),
  }),
);

export const writerProfilesRelations = relations(writerProfiles, ({ one }) => ({
  user: one(users, {
    fields: [writerProfiles.userId],
    references: [users.id],
  }),
}));

export type WriterProfile = typeof writerProfiles.$inferSelect;
export type NewWriterProfile = typeof writerProfiles.$inferInsert;
