import { pgTable, uuid, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { foundingApplicationStatusEnum } from './enums';

/**
 * founding_applications — ファウンディングメンバー応募（PRD-DECISIONS §4.6.1）。
 *
 * 申請段階では users にレコードがないので reporter のような外部キーは持たない。
 * email + display_name + 自己申告データ。
 */
export const foundingApplications = pgTable(
  'founding_applications',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull(),
    snsLinks: jsonb('sns_links').$type<Array<{ platform: string; url: string; followers?: number }>>(),
    residencyCountry: text('residency_country').notNull(),
    residencyYearsSelfReported: integer('residency_years_self_reported').notNull(),
    motivation: text('motivation').notNull(),
    topics: text('topics').array().notNull().default([]),
    writingSamples: text('writing_samples'),
    status: foundingApplicationStatusEnum('status').notNull().default('pending'),
    reviewerNotes: text('reviewer_notes'),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index('founding_applications_email_idx').on(table.email),
    statusIdx: index('founding_applications_status_idx').on(table.status),
  }),
);

export const foundingApplicationsRelations = relations(foundingApplications, ({ one }) => ({
  reviewer: one(users, {
    fields: [foundingApplications.reviewedBy],
    references: [users.id],
  }),
}));

export type FoundingApplication = typeof foundingApplications.$inferSelect;
export type NewFoundingApplication = typeof foundingApplications.$inferInsert;
