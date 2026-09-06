import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { snsPlatformEnum } from './enums';

/**
 * sns_links — ユーザーの SNS リンクとフォロワー数。
 *
 * - 1 ユーザーあたり同じプラットフォームを複数登録可能
 *   （個人 / 仕事用 / サブアカウント等）
 * - 識別は `id` 単位で。プロフィール表示でもこの id をキーに削除する。
 */
export const snsLinks = pgTable(
  'sns_links',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    platform: snsPlatformEnum('platform').notNull(),
    url: text('url').notNull(),
    followerCount: integer('follower_count'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),

    /**
     * 「発信・メディア」表示用（manual/0088_sns_link_previews.sql）。
     * kind は URL から自動判定（profile / video / article / post / podcast）。
     * title / description / imageUrl / siteName は OG・oEmbed をサーバー側で 1 回取得した
     * 結果（本人が上書き可）。display は auto / icon / button / card / featured / embed。
     */
    kind: text('kind').notNull().default('profile'),
    title: text('title'),
    description: text('description'),
    imageUrl: text('image_url'),
    siteName: text('site_name'),
    display: text('display').notNull().default('auto'),
    sortOrder: integer('sort_order').notNull().default(0),
    previewFetchedAt: timestamp('preview_fetched_at', { withTimezone: true }),
    previewStatus: text('preview_status'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('sns_links_user_idx').on(table.userId),
  }),
);

export const snsLinksRelations = relations(snsLinks, ({ one }) => ({
  user: one(users, {
    fields: [snsLinks.userId],
    references: [users.id],
  }),
}));

export type SnsLink = typeof snsLinks.$inferSelect;
export type NewSnsLink = typeof snsLinks.$inferInsert;
