import {
  pgTable,
  uuid,
  text,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { userServices } from './user_services';

/**
 * chat_threads — 会話のコンテナ。
 *
 * 1:1 のスレッドは `direct_pair_key` を sorted([userA, userB]).join(':') で持ち、
 * UNIQUE 制約で同一ペアの重複生成を防ぐ。グループ会話のときは NULL。
 *
 * マイグレーション: `manual/0017_chat.sql`
 */
export const chatThreads = pgTable(
  'chat_threads',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    /** 1:1 ペアの一意識別子。グループ会話のときは NULL */
    directPairKey: text('direct_pair_key').unique(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    lastMsgIdx: index('chat_threads_last_message_idx').on(table.lastMessageAt),
  }),
);

/**
 * chat_thread_members — スレッドの参加メンバー。last_read_at で未読カウントを算出。
 */
export const chatThreadMembers = pgTable(
  'chat_thread_members',
  {
    threadId: uuid('thread_id')
      .notNull()
      .references(() => chatThreads.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.threadId, table.userId] }),
    userIdx: index('chat_thread_members_user_idx').on(table.userId),
  }),
);

/**
 * chat_messages — 1 通の発言。サービス問い合わせから生まれた場合は
 * `related_service_id` で元サービスを参照できる。
 */
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => chatThreads.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    body: text('body').notNull(),
    relatedServiceId: uuid('related_service_id').references(
      () => userServices.id,
      { onDelete: 'set null' },
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    threadCreatedIdx: index('chat_messages_thread_created_idx').on(
      table.threadId,
      table.createdAt,
    ),
  }),
);

export const chatThreadsRelations = relations(chatThreads, ({ many }) => ({
  members: many(chatThreadMembers),
  messages: many(chatMessages),
}));

export const chatThreadMembersRelations = relations(
  chatThreadMembers,
  ({ one }) => ({
    thread: one(chatThreads, {
      fields: [chatThreadMembers.threadId],
      references: [chatThreads.id],
    }),
    user: one(users, {
      fields: [chatThreadMembers.userId],
      references: [users.id],
    }),
  }),
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  thread: one(chatThreads, {
    fields: [chatMessages.threadId],
    references: [chatThreads.id],
  }),
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.id],
  }),
  relatedService: one(userServices, {
    fields: [chatMessages.relatedServiceId],
    references: [userServices.id],
  }),
}));

export type ChatThread = typeof chatThreads.$inferSelect;
export type NewChatThread = typeof chatThreads.$inferInsert;
export type ChatThreadMember = typeof chatThreadMembers.$inferSelect;
export type NewChatThreadMember = typeof chatThreadMembers.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
