import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { commissionRuleKindEnum } from './marketplace_enums';
import { listingCategoryEnum } from './marketplace_enums';

/**
 * commission_rules — 料率エンジンの設定テーブル（PRD §6）。
 *
 * 評価優先順位（高→低）:
 *   1. founder_grant（user_grants と JOIN）
 *   2. promotion（期間限定キャンペーン、active && now() in window）
 *   3. repeat_discount（buyer×seller 累計取引数で適用）
 *   4. category_base（listings.category で適用）
 *   5. global_cap（最終結果に絶対上限）
 *
 * 取引時に最初にヒットしたルールを `orders.commission_rule_snapshot` に
 * シリアライズして保持する（後から料率テーブルを変えても整合が崩れない）。
 *
 * フィールド設計:
 * - `kind` でルール種別を識別
 * - `category` は category_base のときのみ意味を持つ（それ以外は NULL）
 * - `params` JSONB で kind ごとの可変ロジック保持:
 *   - category_base: { pct: 12 }
 *   - repeat_discount: { tiers: [{ minRepeat: 1, pct: 12 }, { minRepeat: 2, pct: 8 }, { minRepeat: 3, pct: 5 }] }
 *   - global_cap: { maxAmountMinor: 50000, currency: 'EUR' }  (cap=this を超える手数料は cap に丸める)
 *   - promotion: { pct: 0, code: 'LAUNCH50' }
 *   - founder_grant: { pct: 0, scope: 'all' }
 */
export const commissionRules = pgTable(
  'commission_rules',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    kind: commissionRuleKindEnum('kind').notNull(),

    /** カテゴリ別ルール用 (kind='category_base' のときのみ) */
    category: listingCategoryEnum('category'),

    /** 優先順位の数値表現。小さい方を優先 */
    priority: integer('priority').notNull().default(100),

    /** 適用期間（NULL = 無期限） */
    activeFrom: timestamp('active_from', { withTimezone: true }),
    activeUntil: timestamp('active_until', { withTimezone: true }),

    /** kind 固有パラメータ */
    params: jsonb('params').notNull().default({}),

    /** 説明（運営 UI 表示用） */
    description: text('description').notNull(),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    kindActiveIdx: index('commission_rules_kind_active_idx').on(
      table.kind,
      table.isActive,
    ),
    priorityIdx: index('commission_rules_priority_idx').on(table.priority),
    categoryIdx: index('commission_rules_category_idx').on(table.category),
  }),
);

export type CommissionRule = typeof commissionRules.$inferSelect;
export type NewCommissionRule = typeof commissionRules.$inferInsert;
