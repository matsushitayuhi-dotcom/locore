import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { cities } from './cities';
import { crisisCandidates } from './crisis_candidates';
import { crisisFeedTypeEnum } from './enums';

/**
 * crisis_source_feeds — 危機情報のソースフィード（RATP の RSS、自治体 API、Twitter リスト等）。
 * PRD-DECISIONS §6.8.1。
 */
export const crisisSourceFeeds = pgTable(
  'crisis_source_feeds',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    cityId: uuid('city_id')
      .notNull()
      .references(() => cities.id, { onDelete: 'cascade' }),
    sourceName: text('source_name').notNull(),
    feedUrl: text('feed_url').notNull(),
    feedType: crisisFeedTypeEnum('feed_type').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    cityIdx: index('crisis_source_feeds_city_idx').on(table.cityId),
    enabledIdx: index('crisis_source_feeds_enabled_idx').on(table.enabled),
  }),
);

export const crisisSourceFeedsRelations = relations(crisisSourceFeeds, ({ one, many }) => ({
  city: one(cities, {
    fields: [crisisSourceFeeds.cityId],
    references: [cities.id],
  }),
  candidates: many(crisisCandidates),
}));

export type CrisisSourceFeed = typeof crisisSourceFeeds.$inferSelect;
export type NewCrisisSourceFeed = typeof crisisSourceFeeds.$inferInsert;
