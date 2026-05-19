import {
  pgTable,
  uuid,
  text,
  date,
  timestamp,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { cities } from './cities';

/**
 * board_posts — 都市掲示板。manual/0028_board_posts.sql。
 *
 * - 編集部 / クリエイターが「今日マルシェ来てます」みたいな短尺な告知を投稿
 * - AI cron がパリの当日イベント情報を自動収集し、auto_collected=true で投稿
 * - ヘッダー / ホームには title だけ 10 件並べ、クリックで /board/[id] に遷移
 *
 * source は 'manual' | 'ai_event' | 'ai_news'。
 * status は 'draft' | 'published' | 'archived'。RLS で published のみ public read。
 */
export const boardPosts = pgTable(
  'board_posts',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    cityId: uuid('city_id').references(() => cities.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    /** 投稿者。AI 投稿は NULL（system 扱い）*/
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    source: text('source').notNull().default('manual'),
    /**
     * カテゴリ。manual/0032_board_categories_audience.sql。
     * 'event' | 'admin' | 'food_season' | 'community' | 'family_edu' | 'health_weather'
     */
    category: text('category').notNull().default('event'),
    /**
     * 対象読者。'both' | 'traveler' | 'resident'。
     * 旅行者向けタグは event カテゴリにだけ付与される想定。
     */
    audience: text('audience').notNull().default('both'),
    /**
     * @deprecated 後方互換のため残置。新規挿入では event_start_date /
     * event_end_date を使うこと。manual/0047_board_posts_event_range.sql で
     * 旧 event_date を start/end に複製済み。
     */
    eventDate: date('event_date'),
    /** 期間開始日 (single-day なら end と同値)。manual/0047 で追加。 */
    eventStartDate: date('event_start_date'),
    /** 期間終了日 (single-day なら start と同値)。manual/0047 で追加。 */
    eventEndDate: date('event_end_date'),
    eventLocation: text('event_location'),
    sourceUrls: jsonb('source_urls').$type<Array<{ name: string; url: string }>>(),
    status: text('status').notNull().default('published'),
    autoCollected: boolean('auto_collected').notNull().default(false),
    isSample: boolean('is_sample').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    cityIdx: index('board_posts_city_idx').on(table.cityId),
    statusIdx: index('board_posts_status_idx').on(table.status),
    publishedAtIdx: index('board_posts_published_at_idx').on(table.publishedAt),
    eventDateIdx: index('board_posts_event_date_idx').on(table.eventDate),
    eventRangeIdx: index('board_posts_event_range_idx').on(
      table.eventStartDate,
      table.eventEndDate,
    ),
    categoryIdx: index('board_posts_category_idx').on(table.category),
    audienceIdx: index('board_posts_audience_idx').on(table.audience),
  }),
);

export const boardPostsRelations = relations(boardPosts, ({ one }) => ({
  city: one(cities, {
    fields: [boardPosts.cityId],
    references: [cities.id],
  }),
  author: one(users, {
    fields: [boardPosts.authorId],
    references: [users.id],
  }),
}));

export type BoardPost = typeof boardPosts.$inferSelect;
export type NewBoardPost = typeof boardPosts.$inferInsert;
