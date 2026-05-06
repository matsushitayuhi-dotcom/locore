import { pgTable, uuid, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { articles } from './articles';

/**
 * bookmarks — ユーザーが「保存した」記事のリスト（ライブラリ機能）。
 *
 * - 主キーは (user_id, article_id) の複合
 * - DELETE は記事 / ユーザー削除時に CASCADE
 * - 並び替え用に (user_id, created_at DESC) のインデックスを別途張る
 *
 * RLS は manual/0008_bookmarks.sql で `auth.uid() = user_id` ベースのポリシーを
 * SELECT / INSERT / DELETE に設定する（UPDATE は不要）。
 */
export const bookmarks = pgTable(
  'bookmarks',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.articleId] }),
    userIdx: index('bookmarks_user_created_idx').on(table.userId, table.createdAt),
  }),
);

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
  article: one(articles, {
    fields: [bookmarks.articleId],
    references: [articles.id],
  }),
}));

export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
