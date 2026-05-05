import { pgTable, uuid, text, timestamp, integer, pgEnum, index } from 'drizzle-orm/pg-core';

/** writer_role enum（DB 側）。@locore/shared の WriterRole と同期する */
export const writerRoleEnum = pgEnum('writer_role', [
  'resident_writer',
  'editor',
  'light_diarist',
  'reader',
]);

/** writer_tier enum（DB 側）。@locore/shared の Tier と同期する */
export const writerTierEnum = pgEnum('writer_tier', ['S', 'A', 'B']);

/**
 * users — Supabase auth.users と 1:1。
 * Supabase の認証行とは別に、アプリ独自のプロフィールを格納。
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().notNull(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    role: writerRoleEnum('role').notNull().default('reader'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
  }),
);

/**
 * writer_profiles — ライターとしての追加情報（居住認証など）。
 */
export const writerProfiles = pgTable('writer_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tier: writerTierEnum('tier').notNull().default('B'),
  residencyCountry: text('residency_country').notNull(),
  residencyYears: integer('residency_years').notNull().default(0),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  bio: text('bio'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type WriterProfile = typeof writerProfiles.$inferSelect;
export type NewWriterProfile = typeof writerProfiles.$inferInsert;
