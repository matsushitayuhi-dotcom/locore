import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { residencyVerificationStatusEnum, residencyDocumentTypeEnum } from './enums';

/**
 * residency_verifications — 居住認証の申請・結果。
 *
 * 書類 URL は暗号化済みストレージ参照（document_url_enc）を保持。
 * 30 日後 expire（再申請を促す）。
 */
export const residencyVerifications = pgTable(
  'residency_verifications',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    documentType: residencyDocumentTypeEnum('document_type').notNull(),
    documentUrlEnc: text('document_url_enc').notNull(),
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
