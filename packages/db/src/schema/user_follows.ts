import {
  pgTable,
  uuid,
  timestamp,
  primaryKey,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';

/**
 * user_follows — ユーザー同士のフォロー関係。
 *
 * - follower_id がフォローする側、followee_id がされる側
 * - 1 ペア × 1 行（重複は PK で防止）
 * - 自己フォローは check 制約で禁止
 *
 * フォロー / フォロワーリスト自体は当事者にしか見えない（RLS）。
 * サーバ側のクエリで COUNT(*) するときは DATABASE_URL 直結で RLS をバイパス。
 *
 * マイグレーション: `manual/0022_follows_and_likes.sql`
 */
export const userFollows = pgTable(
  'user_follows',
  {
    followerId: uuid('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followeeId: uuid('followee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.followerId, table.followeeId] }),
    followeeIdx: index('user_follows_followee_idx').on(table.followeeId),
    noSelfFollow: check(
      'no_self_follow',
      sql`${table.followerId} <> ${table.followeeId}`,
    ),
  }),
);

export const userFollowsRelations = relations(userFollows, ({ one }) => ({
  follower: one(users, {
    fields: [userFollows.followerId],
    references: [users.id],
  }),
  followee: one(users, {
    fields: [userFollows.followeeId],
    references: [users.id],
  }),
}));

export type UserFollow = typeof userFollows.$inferSelect;
export type NewUserFollow = typeof userFollows.$inferInsert;
