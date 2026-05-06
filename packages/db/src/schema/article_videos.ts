import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { articles } from './articles';
import { videoPlatformEnum } from './enums';

/**
 * article_videos — 記事内に埋め込む TikTok / IG Reels / YouTube などの動画。
 */
export const articleVideos = pgTable(
  'article_videos',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    platform: videoPlatformEnum('platform').notNull(),
    embedUrl: text('embed_url').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    articleIdx: index('article_videos_article_idx').on(table.articleId),
  }),
);

export const articleVideosRelations = relations(articleVideos, ({ one }) => ({
  article: one(articles, {
    fields: [articleVideos.articleId],
    references: [articles.id],
  }),
}));

export type ArticleVideo = typeof articleVideos.$inferSelect;
export type NewArticleVideo = typeof articleVideos.$inferInsert;
