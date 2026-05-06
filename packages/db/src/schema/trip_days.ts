import { pgTable, uuid, integer, timestamp, date, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { trips } from './trips';
import { tripItems } from './trip_items';

/**
 * trip_days — 旅程の各日。trips に紐づく。
 */
export const tripDays = pgTable(
  'trip_days',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    dayNumber: integer('day_number').notNull(),
    date: date('date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tripIdx: index('trip_days_trip_idx').on(table.tripId),
    tripDayUq: uniqueIndex('trip_days_trip_day_uq').on(table.tripId, table.dayNumber),
  }),
);

export const tripDaysRelations = relations(tripDays, ({ one, many }) => ({
  trip: one(trips, {
    fields: [tripDays.tripId],
    references: [trips.id],
  }),
  items: many(tripItems),
}));

export type TripDay = typeof tripDays.$inferSelect;
export type NewTripDay = typeof tripDays.$inferInsert;
