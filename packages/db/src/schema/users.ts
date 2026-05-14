import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  index,
  jsonb,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { writerProfiles } from './writer_profiles';
import { articles } from './articles';
import { purchases } from './purchases';
import { trips } from './trips';
import { lightDiaries } from './light_diaries';
import { snsLinks } from './sns_links';
import { residencyVerifications } from './residency_verifications';

/** writer_role enum（DB 側）。@locore/shared の WriterRole と同期する。 */
export const writerRoleEnum = pgEnum('writer_role', [
  'resident_writer',
  'editor',
  'light_diarist',
  'reader',
]);

/**
 * 通知設定（JSONB）の TS 型。
 * Server / Client の両方から参照される構造リテラル。
 *
 * - web_push: ブラウザ Push 通知のチャンネル別 ON/OFF
 * - email: メール通知のチャンネル別 ON/OFF
 *
 * チャンネル名は `notification_log.type` enum 相当で
 * `article_published / trip_reminder / crisis_alert / purchase_completed` の 4 種を扱う。
 */
export type NotificationPreferences = {
  web_push: {
    article_published: boolean;
    trip_reminder: boolean;
    crisis_alert: boolean;
    purchase_completed: boolean;
  };
  email: {
    article_published: boolean;
    trip_reminder: boolean;
    crisis_alert: boolean;
    purchase_completed: boolean;
  };
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  web_push: {
    article_published: true,
    trip_reminder: true,
    crisis_alert: true,
    purchase_completed: true,
  },
  email: {
    article_published: false,
    trip_reminder: true,
    crisis_alert: true,
    purchase_completed: true,
  },
};

/**
 * users — Supabase auth.users と 1:1。
 * Supabase の認証行とは別に、アプリ独自のプロフィールを格納。
 * 論理削除は deleted_at を採用（コア User データは復元可能性を残す）。
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().notNull(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    bio: text('bio'),
    role: writerRoleEnum('role').notNull().default('reader'),
    notificationPreferences: jsonb('notification_preferences')
      .$type<NotificationPreferences>()
      .notNull()
      .default(DEFAULT_NOTIFICATION_PREFERENCES),
    /**
     * 駐在員コミュニティ向けプロフィール拡張（manual/0038_resident_profile_fields.sql）。
     * /residents の検索 + /writers/[id] の公開プロフィールに表示する。
     */
    homeCountry: text('home_country'),
    homeRegion: text('home_region'),
    residencyCountry: text('residency_country'),
    residencyCity: text('residency_city'),
    arrivalYear: integer('arrival_year'),
    /** 'single' | 'couple' | 'family_kids' | 'empty_nest' （未設定は NULL） */
    familyStage: text('family_stage'),
    occupation: text('occupation'),
    languages: jsonb('languages')
      .$type<Array<{ code: string; level: string }>>()
      .notNull()
      .default([]),
    interests: jsonb('interests')
      .$type<string[]>()
      .notNull()
      .default([]),
    lookingFor: jsonb('looking_for')
      .$type<string[]>()
      .notNull()
      .default([]),
    openToMeetups: boolean('open_to_meetups').notNull().default(false),

    /**
     * サンプルデータ識別用フラグ。
     * 投入時 true、`DELETE FROM ... WHERE is_sample = true` で一括クリーンアップ可能。
     * 本番アカウントは常に false。マイグレーション: `manual/0010_is_sample.sql`
     */
    isSample: boolean('is_sample').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
    roleIdx: index('users_role_idx').on(table.role),
    isSampleIdx: index('users_is_sample_idx').on(table.isSample),
  }),
);

export const usersRelations = relations(users, ({ one, many }) => ({
  writerProfile: one(writerProfiles, {
    fields: [users.id],
    references: [writerProfiles.userId],
  }),
  authoredArticles: many(articles),
  purchases: many(purchases),
  trips: many(trips),
  lightDiaries: many(lightDiaries),
  snsLinks: many(snsLinks),
  residencyVerifications: many(residencyVerifications),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
