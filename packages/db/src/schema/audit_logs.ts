import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

/**
 * audit_logs — 監査ログ。actor_id は NULL 可（システム自動アクション）。
 *
 * action 例: user.created / user.deleted / article.published / payout.completed / ...
 *
 * IP アドレスは inet ではなく text に格納（v4/v6 / プロキシ経由表現を許容）。
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: uuid('target_id'),
    metadata: jsonb('metadata'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    actorIdx: index('audit_logs_actor_idx').on(table.actorId),
    actionIdx: index('audit_logs_action_idx').on(table.action),
    targetIdx: index('audit_logs_target_idx').on(table.targetType, table.targetId),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  }),
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
