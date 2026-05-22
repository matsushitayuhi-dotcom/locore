import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { orders } from './orders';
import {
  orderActorEnum,
  messageModerationFlagEnum,
} from './marketplace_enums';

/**
 * order_messages — Order に紐づくスレッド形式メッセージ。
 *
 * 既存 chat_messages との関係:
 * - chat_messages は「自由なペア / グループ会話」用、user_services の問い合わせ等。
 * - order_messages は「取引コンテキストに 1:1 で縛られたスレッド」。
 *   状態遷移ログ（accepted / paid / completed）も system actor として書き込む。
 *
 * 連絡先マスキング:
 * - 受信前に regex で検出して body_masked を保存
 * - 元文も body_raw に保持（運営調査用、本人にも raw を返す）
 * - moderation_flag が none 以外なら警告 toast
 */
export const orderMessages = pgTable(
  'order_messages',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),

    /** 'buyer' | 'seller' | 'system' | 'admin' */
    actor: orderActorEnum('actor').notNull(),
    /** system / admin の場合は NULL */
    senderId: uuid('sender_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    /** 元の生テキスト（運営閲覧用） */
    bodyRaw: text('body_raw').notNull(),
    /** 連絡先をマスクした表示用テキスト */
    bodyMasked: text('body_masked').notNull(),

    /** マスキングの検出結果 */
    moderationFlag: messageModerationFlagEnum('moderation_flag')
      .notNull()
      .default('none'),
    /** 検出した詳細 [{ type: 'email', match: 'x***@y.com', span: [12,28] }] */
    moderationDetail: jsonb('moderation_detail')
      .$type<Array<{ type: string; match: string; span?: [number, number] }>>()
      .notNull()
      .default([]),

    /** system event の場合の event 種別（'order_accepted' 等）。actor='system' のみ */
    systemEvent: text('system_event'),
    /** event payload（差分など） */
    systemPayload: jsonb('system_payload').notNull().default({}),

    /** 添付ファイル（Supabase Storage URL の配列） */
    attachments: jsonb('attachments').$type<string[]>().notNull().default([]),

    /** 送信時の累積警告カウント（snapshot）。閾値超で運営フラグ */
    senderWarningCountSnapshot: integer('sender_warning_count_snapshot')
      .notNull()
      .default(0),

    readByBuyerAt: timestamp('read_by_buyer_at', { withTimezone: true }),
    readBySellerAt: timestamp('read_by_seller_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    orderCreatedIdx: index('order_messages_order_created_idx').on(
      table.orderId,
      table.createdAt,
    ),
    moderationIdx: index('order_messages_moderation_idx').on(table.moderationFlag),
  }),
);

export const orderMessagesRelations = relations(orderMessages, ({ one }) => ({
  order: one(orders, {
    fields: [orderMessages.orderId],
    references: [orders.id],
  }),
  sender: one(users, {
    fields: [orderMessages.senderId],
    references: [users.id],
  }),
}));

export type OrderMessage = typeof orderMessages.$inferSelect;
export type NewOrderMessage = typeof orderMessages.$inferInsert;
