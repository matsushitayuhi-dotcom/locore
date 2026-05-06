import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { reportTargetTypeEnum, reportStatusEnum } from './enums';

/**
 * reports — 通報。匿名通報も許容するため reporter_id は NULL 可。
 *
 * - target_type / target_id でポリモーフィック参照
 * - status: open → investigating → resolved/dismissed
 */
export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    reporterId: uuid('reporter_id').references(() => users.id, { onDelete: 'set null' }),
    targetType: reportTargetTypeEnum('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    reason: text('reason').notNull(),
    body: text('body'),
    status: reportStatusEnum('status').notNull().default('open'),
    resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    targetIdx: index('reports_target_idx').on(table.targetType, table.targetId),
    statusIdx: index('reports_status_idx').on(table.status),
    reporterIdx: index('reports_reporter_idx').on(table.reporterId),
  }),
);

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, {
    fields: [reports.reporterId],
    references: [users.id],
    relationName: 'report_reporter',
  }),
  resolver: one(users, {
    fields: [reports.resolvedBy],
    references: [users.id],
    relationName: 'report_resolver',
  }),
}));

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
