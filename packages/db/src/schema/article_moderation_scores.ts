import { pgTable, uuid, integer, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { articles } from './articles';
import { users } from './users';
import { moderationActionEnum } from './enums';

/**
 * article_moderation_scores — 自動／半自動モデレーションのスコア履歴
 * （PRD-DECISIONS §3.6.1）。
 *
 * - tourist_score / visual_score / text_score: 各サブスコア
 * - final_score: 重み付け後の最終スコア
 * - visual_breakdown / text_breakdown: 内訳 JSON（モデルごとの詳細）
 * - action: そのスコアでとった措置
 */
export const articleModerationScores = pgTable(
  'article_moderation_scores',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    touristScore: integer('tourist_score').notNull(),
    visualScore: integer('visual_score').notNull(),
    textScore: integer('text_score').notNull(),
    finalScore: integer('final_score').notNull(),
    visualBreakdown: jsonb('visual_breakdown'),
    textBreakdown: jsonb('text_breakdown'),
    action: moderationActionEnum('action').notNull(),
    reviewerId: uuid('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    overrideReason: text('override_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    articleIdx: index('article_moderation_scores_article_idx').on(table.articleId),
    finalScoreIdx: index('article_moderation_scores_final_score_idx').on(table.finalScore),
  }),
);

export const articleModerationScoresRelations = relations(
  articleModerationScores,
  ({ one }) => ({
    article: one(articles, {
      fields: [articleModerationScores.articleId],
      references: [articles.id],
    }),
    reviewer: one(users, {
      fields: [articleModerationScores.reviewerId],
      references: [users.id],
    }),
  }),
);

export type ArticleModerationScore = typeof articleModerationScores.$inferSelect;
export type NewArticleModerationScore = typeof articleModerationScores.$inferInsert;
