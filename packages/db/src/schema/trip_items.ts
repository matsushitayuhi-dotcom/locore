import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  doublePrecision,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tripDays } from './trip_days';
import { spots } from './spots';
import { tripItemTypeEnum } from './enums';

/**
 * trip_items — 1日の中の各アイテム。
 *
 * - type='spot': spot_id を参照（記事 spots テーブルから）
 * - type='free': custom_name + custom_lat/lng で自由記入
 * - scheduled_time: 予定時刻（HH:MM 文字列、その日の中の順）
 * - position: 同時刻の中での並び順
 */
export const tripItems = pgTable(
  'trip_items',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    tripDayId: uuid('trip_day_id')
      .notNull()
      .references(() => tripDays.id, { onDelete: 'cascade' }),
    type: tripItemTypeEnum('type').notNull(),
    spotId: uuid('spot_id').references(() => spots.id, { onDelete: 'set null' }),
    customName: text('custom_name'),
    customLat: doublePrecision('custom_lat'),
    customLng: doublePrecision('custom_lng'),
    scheduledTime: text('scheduled_time'),
    position: integer('position').notNull().default(0),
    notes: text('notes'),
    budgetJpy: integer('budget_jpy'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    dayIdx: index('trip_items_day_idx').on(table.tripDayId),
    spotIdx: index('trip_items_spot_idx').on(table.spotId),
  }),
);

export const tripItemsRelations = relations(tripItems, ({ one }) => ({
  day: one(tripDays, {
    fields: [tripItems.tripDayId],
    references: [tripDays.id],
  }),
  spot: one(spots, {
    fields: [tripItems.spotId],
    references: [spots.id],
  }),
}));

export type TripItem = typeof tripItems.$inferSelect;
export type NewTripItem = typeof tripItems.$inferInsert;
