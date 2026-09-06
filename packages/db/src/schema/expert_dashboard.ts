import { pgTable, uuid, date, integer, text, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * エキスパートのマイページ（/dashboard）用テーブル（manual/0090_expert_dashboard.sql）。
 *
 * - profile_view_daily: /experts/[id] の閲覧数を日次（UTC）で集計。本人・editor・bot は除外。
 * - expert_milestones : 達成したマイルストーン（初回達成時に 1 行）。判定は
 *                       apps/web/lib/dashboard/milestones.ts。
 */
export const profileViewDaily = pgTable(
  'profile_view_daily',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
    views: integer('views').notNull().default(0),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.day] }) }),
);

export const expertMilestones = pgTable(
  'expert_milestones',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    achievedAt: timestamp('achieved_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.code] }) }),
);

export type ExpertMilestoneRow = typeof expertMilestones.$inferSelect;
