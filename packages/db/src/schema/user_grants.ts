import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import {
  userGrantTypeEnum,
  userGrantStatusEnum,
} from './marketplace_enums';

/**
 * user_grants — ユーザーに付与する期間限定 / 回数限定の特典（PRD §11）。
 *
 * 主用途:
 * - 創業 50 取引まで手数料 0%（founder_50）
 * - 創業期 6 ヶ月料率半額（founder_half）
 * - 紹介プログラムの初回手数料無料（referral_bonus）
 * - 運営手動補填（manual_override）
 *
 * 料率エンジンとの接続:
 *   commission_rules.kind = 'founder_grant' を最優先で評価する際、
 *   このテーブルに「該当 grant が active かつ未消費」の行があれば適用。
 *
 * scope = 'seller' / 'buyer' / 'both' でどちらの取引で消費するか制御。
 */
export const userGrants = pgTable(
  'user_grants',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    grantType: userGrantTypeEnum('grant_type').notNull(),

    /** 'seller' | 'buyer' | 'both'。取引上のどの側で消費するか */
    scope: text('scope').notNull().default('seller'),

    /** 適用ルールの中身（kind ごとに変わる）
     *   founder_50:   { pct: 0, remainingOrders: 50 }
     *   founder_half: { multiplier: 0.5 }
     *   referral_bonus: { pct: 0, remainingOrders: 1 }
     *   manual_override: { pct: 0, note: '運営判断' }
     */
    params: jsonb('params').notNull().default({}),

    /** 残り使用回数（無制限は NULL）。デクリメント方式 */
    remainingUses: integer('remaining_uses'),
    /** 既使用回数（履歴） */
    consumedCount: integer('consumed_count').notNull().default(0),

    status: userGrantStatusEnum('status').notNull().default('active'),

    /** 期間限定の場合の有効期限 */
    validFrom: timestamp('valid_from', { withTimezone: true })
      .notNull()
      .defaultNow(),
    validUntil: timestamp('valid_until', { withTimezone: true }),

    /** 付与理由 / 運営メモ */
    reason: text('reason'),
    grantedBy: uuid('granted_by').references(() => users.id, {
      onDelete: 'set null',
    }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userActiveIdx: index('user_grants_user_active_idx').on(
      table.userId,
      table.status,
    ),
    grantTypeIdx: index('user_grants_grant_type_idx').on(table.grantType),
    validUntilIdx: index('user_grants_valid_until_idx').on(table.validUntil),
  }),
);

export const userGrantsRelations = relations(userGrants, ({ one }) => ({
  user: one(users, {
    fields: [userGrants.userId],
    references: [users.id],
  }),
  granter: one(users, {
    fields: [userGrants.grantedBy],
    references: [users.id],
  }),
}));

export type UserGrant = typeof userGrants.$inferSelect;
export type NewUserGrant = typeof userGrants.$inferInsert;
