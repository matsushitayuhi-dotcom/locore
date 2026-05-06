import { pgTable, uuid, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { trips } from './trips';
import { users } from './users';
import { tripCollabRoleEnum } from './enums';

/**
 * trip_collaborators — 旅程の共同編集者（オーナー以外）。
 * 複合主キー (trip_id, user_id)。
 */
export const tripCollaborators = pgTable(
  'trip_collaborators',
  {
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: tripCollabRoleEnum('role').notNull().default('viewer'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.tripId, table.userId] }),
  }),
);

export const tripCollaboratorsRelations = relations(tripCollaborators, ({ one }) => ({
  trip: one(trips, {
    fields: [tripCollaborators.tripId],
    references: [trips.id],
  }),
  user: one(users, {
    fields: [tripCollaborators.userId],
    references: [users.id],
  }),
}));

export type TripCollaborator = typeof tripCollaborators.$inferSelect;
export type NewTripCollaborator = typeof tripCollaborators.$inferInsert;
