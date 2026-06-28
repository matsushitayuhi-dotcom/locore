import {
  pgTable,
  uuid,
  text,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { communityPosts } from './community_posts';

/**
 * community_event_rsvps — 集まり（community_posts.kind = 'group'）の参加表明（RSVP）。
 *
 * manual/0060_community_event_rsvps.sql。手動適用前提。
 *
 * - 参加予定メンバー数・残り枠は、この実 RSVP の集計のみで算出する（偽データを出さない）。
 * - (post_id, user_id) で一意。同一ユーザーは 1 投稿に 1 行（status を upsert で更新）。
 * - status: 'going'（参加・残り枠の対象） / 'interested'（興味あり・残り枠には数えない）。
 * - 未適用環境では lib/community/rsvp.ts 側で例外を握りつぶして count=0 / null で継続する。
 */
export const communityEventRsvps = pgTable(
  'community_event_rsvps',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => communityPosts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('going'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    postUserUnique: unique('community_event_rsvps_post_user_key').on(
      table.postId,
      table.userId,
    ),
    postStatusIdx: index('community_event_rsvps_post_status_idx').on(
      table.postId,
      table.status,
    ),
  }),
);

export const communityEventRsvpsRelations = relations(
  communityEventRsvps,
  ({ one }) => ({
    post: one(communityPosts, {
      fields: [communityEventRsvps.postId],
      references: [communityPosts.id],
    }),
    user: one(users, {
      fields: [communityEventRsvps.userId],
      references: [users.id],
    }),
  }),
);

export type CommunityEventRsvp = typeof communityEventRsvps.$inferSelect;
export type NewCommunityEventRsvp = typeof communityEventRsvps.$inferInsert;
