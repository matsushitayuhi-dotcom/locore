import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { crisisSourceFeeds } from './crisis_source_feeds';
import { users } from './users';
import { crisisCandidateStatusEnum } from './enums';

/**
 * crisis_candidates — フィードから収集した未確認の危機情報候補。
 * 編集者が確認して crisis_events に昇格させる。
 */
export const crisisCandidates = pgTable(
  'crisis_candidates',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    sourceFeedId: uuid('source_feed_id')
      .notNull()
      .references(() => crisisSourceFeeds.id, { onDelete: 'cascade' }),
    rawContent: text('raw_content').notNull(),
    parsedTitle: text('parsed_title'),
    parsedSeverity: integer('parsed_severity'),
    status: crisisCandidateStatusEnum('status').notNull().default('new'),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    feedIdx: index('crisis_candidates_feed_idx').on(table.sourceFeedId),
    statusIdx: index('crisis_candidates_status_idx').on(table.status),
  }),
);

export const crisisCandidatesRelations = relations(crisisCandidates, ({ one }) => ({
  sourceFeed: one(crisisSourceFeeds, {
    fields: [crisisCandidates.sourceFeedId],
    references: [crisisSourceFeeds.id],
  }),
  reviewer: one(users, {
    fields: [crisisCandidates.reviewedBy],
    references: [users.id],
  }),
}));

export type CrisisCandidate = typeof crisisCandidates.$inferSelect;
export type NewCrisisCandidate = typeof crisisCandidates.$inferInsert;
