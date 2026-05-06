import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  date,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { cities } from './cities';
import { tripDays } from './trip_days';
import { tripCollaborators } from './trip_collaborators';
import { tripShareRoleEnum } from './enums';

/**
 * trips — 旅程プランナーのメイン（PRD §6.7）。
 *
 * - share_token: 共有用 UUID（URL に乗せる）
 * - share_role: トークン保持者に許可されるアクセス（none = 共有無効）
 */
export const trips = pgTable(
  'trips',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    cityId: uuid('city_id')
      .notNull()
      .references(() => cities.id, { onDelete: 'restrict' }),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    partySize: integer('party_size').notNull().default(1),
    shareToken: uuid('share_token').notNull().defaultRandom(),
    shareRole: tripShareRoleEnum('share_role').notNull().default('none'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIdx: index('trips_owner_idx').on(table.ownerId),
    cityIdx: index('trips_city_idx').on(table.cityId),
    shareTokenIdx: index('trips_share_token_idx').on(table.shareToken),
  }),
);

export const tripsRelations = relations(trips, ({ one, many }) => ({
  owner: one(users, {
    fields: [trips.ownerId],
    references: [users.id],
  }),
  city: one(cities, {
    fields: [trips.cityId],
    references: [cities.id],
  }),
  days: many(tripDays),
  collaborators: many(tripCollaborators),
}));

export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
