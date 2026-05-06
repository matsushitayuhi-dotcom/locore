import { pgTable, uuid, text, numeric, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

/**
 * exchange_rates — 通貨レートの取得履歴（OpenExchangeRates 等）。
 *
 * 1行 = 1時点のスナップショット。最新は MAX(fetched_at) で取る。
 * 複合 UNIQUE は (from, to, fetched_at) で一意（同時刻に同ペアを2回登録しない）。
 */
export const exchangeRates = pgTable(
  'exchange_rates',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    fromCurrency: text('from_currency').notNull(),
    toCurrency: text('to_currency').notNull(),
    rate: numeric('rate', { precision: 20, scale: 10 }).notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
    source: text('source').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pairFetchedUq: uniqueIndex('exchange_rates_pair_fetched_uq').on(
      table.fromCurrency,
      table.toCurrency,
      table.fetchedAt,
    ),
    pairIdx: index('exchange_rates_pair_idx').on(table.fromCurrency, table.toCurrency),
  }),
);

export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type NewExchangeRate = typeof exchangeRates.$inferInsert;
