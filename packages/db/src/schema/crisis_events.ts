import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { cities } from './cities';
import { crisisTypeEnum, crisisStatusEnum } from './enums';

/**
 * crisis_events — 都市の危機・イベント情報（ストライキ、デモ、テロ警報等）。
 * PRD §6.8.1。日本語サマリ付きで通知される。
 */
export const crisisEvents = pgTable(
  'crisis_events',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    cityId: uuid('city_id')
      .notNull()
      .references(() => cities.id, { onDelete: 'restrict' }),
    type: crisisTypeEnum('type').notNull(),
    severity: integer('severity').notNull().default(1),
    title: text('title').notNull(),
    description: text('description'),
    japaneseSummary: text('japanese_summary'),
    sources: jsonb('sources').$type<Array<{ name: string; url: string }>>(),
    affectedAreas: jsonb('affected_areas'),
    affectedLines: text('affected_lines').array(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    status: crisisStatusEnum('status').notNull().default('draft'),
    publishedBy: uuid('published_by').references(() => users.id, { onDelete: 'set null' }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    autoCollected: boolean('auto_collected').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    cityIdx: index('crisis_events_city_idx').on(table.cityId),
    statusIdx: index('crisis_events_status_idx').on(table.status),
    severityIdx: index('crisis_events_severity_idx').on(table.severity),
    timeIdx: index('crisis_events_time_idx').on(table.startsAt, table.endsAt),
  }),
);

export const crisisEventsRelations = relations(crisisEvents, ({ one }) => ({
  city: one(cities, {
    fields: [crisisEvents.cityId],
    references: [cities.id],
  }),
  publisher: one(users, {
    fields: [crisisEvents.publishedBy],
    references: [users.id],
  }),
}));

export type CrisisEvent = typeof crisisEvents.$inferSelect;
export type NewCrisisEvent = typeof crisisEvents.$inferInsert;
