import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { articles } from './articles';

/**
 * bookmark_folders — 記事 / 旅程ブックマーク用の 1 階層フォルダ。
 * ユーザーごとに自由に色付け・並び替え可能。spot_folders とパラレルな構造。
 *
 * マイグレーション: `manual/0024_bookmark_folders.sql`
 */
export const bookmarkFolders = pgTable(
  'bookmark_folders',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** トークン名（'emerald' / 'sage' / 'sky' 等）or HEX */
    color: text('color'),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index('bookmark_folders_user_idx').on(table.userId),
  }),
);

/**
 * bookmarks — ユーザーが「保存した」記事のリスト（ライブラリ機能）。
 *
 * - 主キーは (user_id, article_id) の複合
 * - DELETE は記事 / ユーザー削除時に CASCADE
 * - folder_id は任意（未分類 = NULL）。フォルダが消えると set null。
 *
 * RLS は manual/0008_bookmarks.sql で `auth.uid() = user_id` ベースのポリシーを
 * SELECT / INSERT / DELETE に設定する（UPDATE は folder 移動用に追加で許可）。
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
    folderId: uuid('folder_id').references(() => bookmarkFolders.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.articleId] }),
    userIdx: index('bookmarks_user_created_idx').on(table.userId, table.createdAt),
    folderIdx: index('bookmarks_folder_idx').on(table.folderId),
  }),
);

export const bookmarkFoldersRelations = relations(
  bookmarkFolders,
  ({ one, many }) => ({
    user: one(users, {
      fields: [bookmarkFolders.userId],
      references: [users.id],
    }),
    bookmarks: many(bookmarks),
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
  folder: one(bookmarkFolders, {
    fields: [bookmarks.folderId],
    references: [bookmarkFolders.id],
  }),
}));

export type BookmarkFolder = typeof bookmarkFolders.$inferSelect;
export type NewBookmarkFolder = typeof bookmarkFolders.$inferInsert;
export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
