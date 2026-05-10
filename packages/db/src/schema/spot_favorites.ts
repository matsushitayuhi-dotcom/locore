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
import { spots } from './spots';

/**
 * spot_folders — お気に入りスポットの 1 階層フォルダ。
 * ユーザーごとに自由にカラーリング・並び替え可能。
 *
 * マイグレーション: `manual/0021_spot_favorites.sql`
 */
export const spotFolders = pgTable(
  'spot_folders',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** トークン名（'emerald' / 'coral' / 'sun' / 'sage' / 'sky' 等）or HEX */
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
    userIdx: index('spot_folders_user_idx').on(table.userId),
  }),
);

/**
 * spot_bookmarks — スポット個別お気に入り。folder_id は任意（未分類 = NULL）。
 */
export const spotBookmarks = pgTable(
  'spot_bookmarks',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    spotId: uuid('spot_id')
      .notNull()
      .references(() => spots.id, { onDelete: 'cascade' }),
    folderId: uuid('folder_id').references(() => spotFolders.id, {
      onDelete: 'set null',
    }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.spotId] }),
    folderIdx: index('spot_bookmarks_folder_idx').on(table.folderId),
  }),
);

export const spotFoldersRelations = relations(spotFolders, ({ one, many }) => ({
  user: one(users, {
    fields: [spotFolders.userId],
    references: [users.id],
  }),
  bookmarks: many(spotBookmarks),
}));

export const spotBookmarksRelations = relations(spotBookmarks, ({ one }) => ({
  user: one(users, {
    fields: [spotBookmarks.userId],
    references: [users.id],
  }),
  spot: one(spots, {
    fields: [spotBookmarks.spotId],
    references: [spots.id],
  }),
  folder: one(spotFolders, {
    fields: [spotBookmarks.folderId],
    references: [spotFolders.id],
  }),
}));

export type SpotFolder = typeof spotFolders.$inferSelect;
export type NewSpotFolder = typeof spotFolders.$inferInsert;
export type SpotBookmark = typeof spotBookmarks.$inferSelect;
export type NewSpotBookmark = typeof spotBookmarks.$inferInsert;
