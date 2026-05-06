import { pgTable, uuid, text, integer, timestamp, boolean, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { foundingStatusEnum } from './enums';

/** writer_tier enum（DB 側）。@locore/shared の Tier と同期する。 */
export const writerTierEnum = pgEnum('writer_tier', ['S', 'A', 'B']);

/**
 * writer_profiles — ライターとしての追加情報。
 *
 * - tier: クリエイターランク（S/A/B）。`@locore/shared/Tier` と一致。
 * - residency_verified_at: 居住認証された日時。NULL なら未認証 = Tier B 上限。
 * - founding_*: ファウンディングメンバープログラム（PRD-DECISIONS §4.6.1）。
 */
export const writerProfiles = pgTable(
  'writer_profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tier: writerTierEnum('tier').notNull().default('B'),
    residencyCountry: text('residency_country').notNull(),
    residencyYears: integer('residency_years').notNull().default(0),
    residencyVerifiedAt: timestamp('residency_verified_at', { withTimezone: true }),
    foundingMember: boolean('founding_member').notNull().default(false),
    foundingJoinedAt: timestamp('founding_joined_at', { withTimezone: true }),
    foundingFeeWaiverUntil: timestamp('founding_fee_waiver_until', { withTimezone: true }),
    foundingStatus: foundingStatusEnum('founding_status'),
    bio: text('bio'),
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
