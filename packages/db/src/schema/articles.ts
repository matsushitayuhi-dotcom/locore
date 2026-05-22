import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { cities } from './cities';
import { spots } from './spots';
import { articleVideos } from './article_videos';
import { purchases } from './purchases';
import { articleModerationScores } from './article_moderation_scores';
import { articleTypeEnum } from './enums';

/**
 * 旅程ブロックの構造（articles.itinerary_blocks JSONB の中身）。
 *
 * - 1 ブロック = 1 つの「時間帯にどこに行くか」
 * - `spotId` を入れると spots テーブルの行と紐付く（座標 / 営業時間など Google から取った情報を共有）
 * - `freeName` はまだ spot を作っていない場合のフォールバック
 * - `transportToNext` は「このブロックから次のブロックへの移動手段」
 */
/**
 * 写真ジャーナル形式記事の 1 エントリ（articles.photo_entries JSONB の中身）。
 *
 * - articleType='photo_journal' のときに最大 10 件保存
 * - 読み手側は縦スクロール (scroll-snap) で 1 枚ずつ全画面表示
 * - `spotId` を入れると spots テーブルと紐付く（地図上に出せる）
 * - `locationName` は自由記述のフォールバック
 */
export type PhotoEntry = {
  /** Supabase Storage の公開 URL */
  imageUrl: string;
  /** キャプション。Markdown は使わず、改行可のプレーンテキスト推奨 */
  caption: string;
  /** 場所名（自由記述）。"マレ地区 Du Pain et des Idées" など */
  locationName?: string | null;
  /** spots テーブルと紐付く場合 */
  spotId?: string | null;
  /** spot 紐付け無しのときの代替座標 */
  lat?: number | null;
  lng?: number | null;
  /** 並び順 0-9 */
  position: number;
};

export type ItineraryBlock = {
  /** クライアント側の一意識別子（保存後は固定） */
  id: string;
  /** 開始時刻 'HH:MM'（必須） */
  startTime: string;
  /** 終了時刻 'HH:MM'（任意） */
  endTime?: string | null;
  /** spots テーブルの行を参照する場合 */
  spotId?: string | null;
  /** spot を作っていない / 自由記述の場合の場所名 */
  freeName?: string | null;
  notes?: string | null;
  transportToNext?:
    | 'walk'
    | 'metro'
    | 'bus'
    | 'taxi'
    | 'bike'
    | 'train'
    | 'other'
    | null;
  /** 「Métro 12号線」のような自由テキスト */
  transportNote?: string | null;
  /** 次のブロックへの移動所要時間（分） */
  travelMinutesAfter?: number | null;
};

/** article_status enum。@locore/shared の ArticleStatus と同期。 */
export const articleStatusEnum = pgEnum('article_status', [
  'draft',
  'published',
  'archived',
  'pending_review',
]);

/** 所要時間タイプ（PRD では `半日 / 終日 / 数時間 / その他`）。 */
export const articleDurationEnum = pgEnum('article_duration', [
  'half_day',
  'full_day',
  'few_hours',
  'other',
]);

/**
 * articles — 旅行記事のメインテーブル。
 *
 * 公開クエリ向けの (city_id, published_at DESC) 部分インデックスは
 * 別途 manual SQL マイグレーションで追加する。
 *
 * - moderation_score: AI モデレーションの最終スコア（最新スコアの非正規化キャッシュ）
 * - warned: 警告済みフラグ（Tourist 度合いが高いなど）
 * - deleted_at: 論理削除（記事は購入履歴と紐づくため）
 */
export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    writerId: uuid('writer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    cityId: uuid('city_id')
      .notNull()
      .references(() => cities.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    /** 無料プレビュー本文（購入前にも見える）。Markdown。 */
    body: text('body').notNull(),
    /**
     * 有料部分本文（購入後表示）。NULL のときは旧ロジック（body の途中で自動分割）に
     * フォールバック。マイグレーション: `manual/0012_body_paid.sql`
     */
    bodyPaid: text('body_paid'),
    coverImageUrl: text('cover_image_url'),
    priceJpy: integer('price_jpy').notNull(),
    status: articleStatusEnum('status').notNull().default('draft'),
    tags: text('tags').array().notNull().default([]),
    durationType: articleDurationEnum('duration_type'),
    /**
     * 記事の種別タグ。スポット紹介 vs 旅程プラン。
     * 既存記事は spot_guide でデフォルト（後方互換）。
     */
    articleType: articleTypeEnum('article_type').notNull().default('spot_guide'),
    /**
     * 本文スタイル。'photo_journal' (default) or 'classic'。
     * articleType と直交する概念で、どのカテゴリでも 2 つの本文表現を選べる。
     * manual/0037_body_style.sql。
     */
    bodyStyle: text('body_style').notNull().default('photo_journal'),
    /**
     * 旅程プラン用の構造化ブロック配列（articleType='itinerary' のとき使う）。
     * { startTime, endTime, spotId|freeName, transportToNext, travelMinutesAfter, notes }[]
     * マイグレーション: `manual/0018_itinerary_blocks.sql`
     */
    itineraryBlocks: jsonb('itinerary_blocks').$type<ItineraryBlock[]>(),
    /**
     * 写真ジャーナル形式（articleType='photo_journal'）のエントリ配列。最大 10。
     * マイグレーション: `manual/0036_photo_journal_articles.sql`
     */
    photoEntries: jsonb('photo_entries')
      .$type<PhotoEntry[]>()
      .notNull()
      .default([]),
    warned: boolean('warned').notNull().default(false),
    moderationScore: integer('moderation_score'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    /**
     * 共有プレビュー用トークン (UUID v4)。NULL なら共有リンク無効。
     * `manual/0049_article_preview_token.sql`
     */
    previewToken: uuid('preview_token'),
    /** プレビューリンクの有効期限。NULL は実質無期限（運用上は常に値ありで発行）。 */
    previewTokenExpiresAt: timestamp('preview_token_expires_at', {
      withTimezone: true,
    }),
    /**
     * 関連する listings.id（任意）。記事末尾に Listing カードを差し込む UX。
     * 記事は集客窓口、Listing は決済導線という二段構えのリンク。
     * manual/0052_marketplace_schema.sql。
     */
    relatedListingId: uuid('related_listing_id'),
    /** サンプルデータ識別用。`manual/0010_is_sample.sql` */
    isSample: boolean('is_sample').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    writerIdx: index('articles_writer_id_idx').on(table.writerId),
    cityIdx: index('articles_city_id_idx').on(table.cityId),
    statusIdx: index('articles_status_idx').on(table.status),
    publishedAtIdx: index('articles_published_at_idx').on(table.publishedAt),
    typeIdx: index('articles_type_idx').on(table.articleType, table.publishedAt),
    isSampleIdx: index('articles_is_sample_idx').on(table.isSample),
  }),
);

export const articlesRelations = relations(articles, ({ one, many }) => ({
  writer: one(users, {
    fields: [articles.writerId],
    references: [users.id],
  }),
  city: one(cities, {
    fields: [articles.cityId],
    references: [cities.id],
  }),
  spots: many(spots),
  videos: many(articleVideos),
  purchases: many(purchases),
  moderationScores: many(articleModerationScores),
}));

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
