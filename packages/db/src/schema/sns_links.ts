import { pgTable, uuid, text, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { snsPlatformEnum } from './enums';

/**
 * sns_links — ライターの SNS リンクとフォロワー数。
 *
 * Founding 申請の評価や、プロフィール表示で使用。
 */
export const snsLinks = pgTable(
  'sns_links',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    platform: snsPlatformEnum('platform').notNull(),
    url: text('url').notNull(),
    followerCount: integer('follower_count'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('sns_links_user_idx').on(table.userId),
    userPlatformUq: uniqueIndex('sns_links_user_platform_uq').on(table.userId, table.platform),
  }),
);

export const snsLinksRelations = relations(snsLinks, ({ one }) => ({
  user: one(users, {
    fields: [snsLinks.userId],
    references: [users.id],
  }),
}));

export type SnsLink = typeof snsLinks.$inferSelect;
export type NewSnsLink = typeof snsLinks.$inferInsert;
