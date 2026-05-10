import {
  pgTable,
  uuid,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { articles } from './articles';

/**
 * article_likes — 記事への "いいね" 反応。
 *
 * 1 ユーザー × 1 記事 = 1 票（PK で重複防止）。
 * RLS は自分のいいねのみ操作可。COUNT(*) はサーバ側で集計して公開する。
 *
 * マイグレーション: `manual/0022_follows_and_likes.sql`
 */
export const articleLikes = pgTable(
  'article_likes',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.articleId] }),
    articleIdx: index('article_likes_article_idx').on(table.articleId),
  }),
);

export const articleLikesRelations = relations(articleLikes, ({ one }) => ({
  user: one(users, {
    fields: [articleLikes.userId],
    references: [users.id],
  }),
  article: one(articles, {
    fields: [articleLikes.articleId],
    references: [articles.id],
  }),
}));

export type ArticleLike = typeof articleLikes.$inferSelect;
export type NewArticleLike = typeof articleLikes.$inferInsert;
