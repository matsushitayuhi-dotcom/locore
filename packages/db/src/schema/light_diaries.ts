import { pgTable, uuid, text, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { cities } from './cities';
import { lightDiaryStatusEnum } from './enums';

/**
 * light_diaries — 旅行者による「ライト旅行記」（無料、UGC、PRD §6）。
 *
 * photos は URL 配列（最大 10 枚程度を想定）。
 */
export const lightDiaries = pgTable(
  'light_diaries',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    photos: jsonb('photos').$type<string[]>().notNull().default([]),
    cityId: uuid('city_id').references(() => cities.id, { onDelete: 'set null' }),
    visitedAt: timestamp('visited_at', { withTimezone: true }),
    status: lightDiaryStatusEnum('status').notNull().default('draft'),
    /** サンプルデータ識別用。`manual/0010_is_sample.sql` */
    isSample: boolean('is_sample').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    authorIdx: index('light_diaries_author_idx').on(table.authorId),
    cityIdx: index('light_diaries_city_idx').on(table.cityId),
    statusIdx: index('light_diaries_status_idx').on(table.status),
  }),
);

export const lightDiariesRelations = relations(lightDiaries, ({ one }) => ({
  author: one(users, {
    fields: [lightDiaries.authorId],
    references: [users.id],
  }),
  city: one(cities, {
    fields: [lightDiaries.cityId],
    references: [cities.id],
  }),
}));

export type LightDiary = typeof lightDiaries.$inferSelect;
export type NewLightDiary = typeof lightDiaries.$inferInsert;
