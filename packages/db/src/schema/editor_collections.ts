import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { cities } from './cities';
import { collectionArticles } from './collection_articles';

/**
 * editor_collections — 編集チームによるキュレーション（特集・ガイド集）。
 */
export const editorCollections = pgTable(
  'editor_collections',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    title: text('title').notNull(),
    body: text('body'),
    coverImageUrl: text('cover_image_url'),
    editorId: uuid('editor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    cityId: uuid('city_id').references(() => cities.id, { onDelete: 'set null' }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    /** サンプルデータ識別用。`manual/0010_is_sample.sql` */
    isSample: boolean('is_sample').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    editorIdx: index('editor_collections_editor_idx').on(table.editorId),
    cityIdx: index('editor_collections_city_idx').on(table.cityId),
    publishedAtIdx: index('editor_collections_published_at_idx').on(table.publishedAt),
  }),
);

export const editorCollectionsRelations = relations(editorCollections, ({ one, many }) => ({
  editor: one(users, {
    fields: [editorCollections.editorId],
    references: [users.id],
  }),
  city: one(cities, {
    fields: [editorCollections.cityId],
    references: [cities.id],
  }),
  collectionArticles: many(collectionArticles),
}));

export type EditorCollection = typeof editorCollections.$inferSelect;
export type NewEditorCollection = typeof editorCollections.$inferInsert;
