import { pgTable, uuid, integer, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { editorCollections } from './editor_collections';
import { articles } from './articles';

/**
 * collection_articles — コレクション ↔ 記事の中間テーブル。
 *
 * - position: コレクション内での並び順
 * - revenue_share_pct: 編集チームへの配分%（デフォルト 30）
 */
export const collectionArticles = pgTable(
  'collection_articles',
  {
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => editorCollections.id, { onDelete: 'cascade' }),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    revenueSharePct: integer('revenue_share_pct').notNull().default(30),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.collectionId, table.articleId] }),
  }),
);

export const collectionArticlesRelations = relations(collectionArticles, ({ one }) => ({
  collection: one(editorCollections, {
    fields: [collectionArticles.collectionId],
    references: [editorCollections.id],
  }),
  article: one(articles, {
    fields: [collectionArticles.articleId],
    references: [articles.id],
  }),
}));

export type CollectionArticle = typeof collectionArticles.$inferSelect;
export type NewCollectionArticle = typeof collectionArticles.$inferInsert;
