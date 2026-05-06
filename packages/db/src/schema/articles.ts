import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { cities } from './cities';
import { spots } from './spots';
import { articleVideos } from './article_videos';
import { purchases } from './purchases';
import { articleModerationScores } from './article_moderation_scores';

/** article_status enum。@locore/shared の ArticleStatus と同期。 */
export const articleStatusEnum = pgEnum('article_status', [
  'draft',
  'published',
  'archived',
  'pending_review',
]);

/** 所要時間タイプ（PRD では `半日 / 終日 / 数時間 / その他`）。 */
export const articleDurationEnum = pgEnum('article_duration', [
  'half_day',
  'full_day',
  'few_hours',
  'other',
]);

/**
 * articles — 旅行記事のメインテーブル。
 *
 * 公開クエリ向けの (city_id, published_at DESC) 部分インデックスは
 * 別途 manual SQL マイグレーションで追加する。
 *
 * - moderation_score: AI モデレーションの最終スコア（最新スコアの非正規化キャッシュ）
 * - warned: 警告済みフラグ（Tourist 度合いが高いなど）
 * - deleted_at: 論理削除（記事は購入履歴と紐づくため）
 */
export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    writerId: uuid('writer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    cityId: uuid('city_id')
      .notNull()
      .references(() => cities.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    coverImageUrl: text('cover_image_url'),
    priceJpy: integer('price_jpy').notNull(),
    status: articleStatusEnum('status').notNull().default('draft'),
    tags: text('tags').array().notNull().default([]),
    durationType: articleDurationEnum('duration_type'),
    warned: boolean('warned').notNull().default(false),
    moderationScore: integer('moderation_score'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    writerIdx: index('articles_writer_id_idx').on(table.writerId),
    cityIdx: index('articles_city_id_idx').on(table.cityId),
    statusIdx: index('articles_status_idx').on(table.status),
    publishedAtIdx: index('articles_published_at_idx').on(table.publishedAt),
  }),
);

export const articlesRelations = relations(articles, ({ one, many }) => ({
  writer: one(users, {
    fields: [articles.writerId],
    references: [users.id],
  }),
  city: one(cities, {
    fields: [articles.cityId],
    references: [cities.id],
  }),
  spots: many(spots),
  videos: many(articleVideos),
  purchases: many(purchases),
  moderationScores: many(articleModerationScores),
}));

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
