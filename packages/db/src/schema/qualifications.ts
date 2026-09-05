import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  jsonb,
  boolean,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { residencyVerificationStatusEnum } from './enums';

/**
 * qualifications — 資格・試験のマスタ（0086）。
 *
 * エキスパートが「持っている資格 / スコア」を選択式で登録するための統制リスト。
 * category:
 *   - language_test  … 語学試験（TOEFL / IELTS / 英検 …）。has_score=true でスコア欄を出す
 *   - admission_test … 出願用テスト（GMAT / GRE / SAT …）。has_score=true
 *   - professional   … 職業資格（公認会計士 / CFA / 弁護士 …）
 *   - other          … その他（custom_name で自由記述）
 * 初期データは manual/0086_qualifications.sql で INSERT … ON CONFLICT(code)。
 */
export const qualifications = pgTable(
  'qualifications',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    /** 安定キー（例 'toefl_ibt'）。UI・シードはこれで参照 */
    code: text('code').notNull().unique(),
    nameJa: text('name_ja').notNull(),
    nameEn: text('name_en'),
    category: text('category').notNull(),
    /** スコア / 級の入力欄を出すか（TOEFL 105、英検 1 級 など） */
    hasScore: boolean('has_score').notNull().default(false),
    /** スコア欄のプレースホルダ（例 '105' / '1級' / '720'） */
    scoreHint: text('score_hint'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    categoryIdx: index('qualifications_category_idx').on(table.category, table.sortOrder),
  }),
);

/**
 * user_qualifications — ユーザーが登録した資格と合格証明（0086）。
 *
 * 合格証明（proof_paths）は verification-docs バケット（private）に置き、
 * editor が /admin/qualifications で目視レビューして approved / rejected にする。
 * 公開プロフィール（/experts/[id]）には approved のものだけを「確認済み」で出す。
 * 書類は在籍確認と同じく 30 日で物理削除（files_deleted_at）。
 */
export const userQualifications = pgTable(
  'user_qualifications',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    qualificationId: uuid('qualification_id')
      .notNull()
      .references(() => qualifications.id, { onDelete: 'restrict' }),
    /** マスタが 'other' のときの資格名（自由記述） */
    customName: text('custom_name'),
    /** スコア / 級 / 等級（例 '105' / '7.5' / '720' / '1級'） */
    score: text('score'),
    /** 取得（合格）年 */
    acquiredYear: integer('acquired_year'),
    /** 合格証明のファイルパス（verification-docs バケット、1〜3 件） */
    proofPaths: jsonb('proof_paths').$type<string[]>().notNull().default([]),
    userNote: text('user_note'),
    status: residencyVerificationStatusEnum('status').notNull().default('pending'),
    reviewerNote: text('reviewer_note'),
    rejectedReason: text('rejected_reason'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    filesDeletedAt: timestamp('files_deleted_at', { withTimezone: true }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('user_qualifications_user_idx').on(table.userId),
    statusIdx: index('user_qualifications_status_idx').on(table.status),
    /** 同じ資格は 1 人 1 件（再申請は上書き） */
    userQualUnique: uniqueIndex('user_qualifications_user_qual_uidx').on(
      table.userId,
      table.qualificationId,
      table.customName,
    ),
  }),
);

export const userQualificationsRelations = relations(userQualifications, ({ one }) => ({
  user: one(users, {
    fields: [userQualifications.userId],
    references: [users.id],
    relationName: 'user_qualification_user',
  }),
  qualification: one(qualifications, {
    fields: [userQualifications.qualificationId],
    references: [qualifications.id],
  }),
}));

export type Qualification = typeof qualifications.$inferSelect;
export type UserQualification = typeof userQualifications.$inferSelect;
export type NewUserQualification = typeof userQualifications.$inferInsert;
