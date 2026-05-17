import { pgTable, uuid, text, timestamp, index, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { residencyVerificationStatusEnum, residencyDocumentTypeEnum } from './enums';

/**
 * residency_verifications — 居住認証の申請・結果。
 *
 * manual/0041 で拡張: 複数ファイル対応 (document_paths jsonb)、自己申告
 * の country/city/user_note、編集者用 reviewer_note/rejected_reason、
 * GDPR 配慮の files_deleted_at を追加。
 *
 * 旧フィールド document_url_enc は当面残すが NULL 可能。新規申請では
 * document_paths を使う。
 */
export const residencyVerifications = pgTable(
  'residency_verifications',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    documentType: residencyDocumentTypeEnum('document_type').notNull(),
    /** @deprecated 新規は document_paths を使う。旧データ閲覧用に保持 */
    documentUrlEnc: text('document_url_enc'),
    /**
     * Supabase Storage パスの配列。例:
     *   ["b3f.../utility-bill.pdf", "b3f.../residence-card.jpg"]
     * 1〜3 ファイル想定。各パスは bucket='verification-docs' 配下。
     */
    documentPaths: jsonb('document_paths')
      .$type<string[]>()
      .notNull()
      .default([]),
    /** 自己申告: 在住国 (ISO 2 文字) */
    country: text('country'),
    /** 自己申告: 都市 */
    city: text('city'),
    /** 英語表記の氏名 (パスポート等の Roman 表記)。原則必須 (manual/0042) */
    legalNameRoman: text('legal_name_roman'),
    /** 日本語 / 母語表記の氏名 (任意)。漢字・かな・現地語など */
    legalNameNative: text('legal_name_native'),
    /** 在住地の住所 (番地・通り名・市区町村まで) */
    addressLine: text('address_line'),
    /** 郵便番号 (国によりフォーマット異なる) */
    postalCode: text('postal_code'),
    /** 電話番号 (E.164 形式推奨、例: +33612345678) */
    phoneNumber: text('phone_number'),
    /** 提出者の補足メモ */
    userNote: text('user_note'),
    /** 編集者の内部メモ (ユーザーには見せない) */
    reviewerNote: text('reviewer_note'),
    /** 却下時にユーザーへ通知する理由 */
    rejectedReason: text('rejected_reason'),
    /** GDPR: 30 日後 cron で物理削除した時刻。NULL ならファイルは生きている */
    filesDeletedAt: timestamp('files_deleted_at', { withTimezone: true }),
    status: residencyVerificationStatusEnum('status').notNull().default('pending'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('residency_verifications_user_idx').on(table.userId),
    statusIdx: index('residency_verifications_status_idx').on(table.status),
  }),
);

export const residencyVerificationsRelations = relations(
  residencyVerifications,
  ({ one }) => ({
    user: one(users, {
      fields: [residencyVerifications.userId],
      references: [users.id],
      relationName: 'verification_user',
    }),
    reviewer: one(users, {
      fields: [residencyVerifications.reviewedBy],
      references: [users.id],
      relationName: 'verification_reviewer',
    }),
  }),
);

export type ResidencyVerification = typeof residencyVerifications.$inferSelect;
export type NewResidencyVerification = typeof residencyVerifications.$inferInsert;
