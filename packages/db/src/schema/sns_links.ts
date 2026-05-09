import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { snsPlatformEnum } from './enums';

/**
 * sns_links — ユーザーの SNS リンクとフォロワー数。
 *
 * - 1 ユーザーあたり同じプラットフォームを複数登録可能
 *   （個人 / 仕事用 / サブアカウント等）
 * - 識別は `id` 単位で。プロフィール表示でもこの id をキーに削除する。
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
