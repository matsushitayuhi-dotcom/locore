'use server';

import 'server-only';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { eq, and, desc } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { sendEmail, SUPPORT_EMAIL } from '@/lib/email/send';
import { tplSubmittedNotification } from '@/lib/email/templates';

/**
 * 居住確認の申請 Server Action。
 *
 * 流れ:
 *   1. requireUser
 *   2. (UI 側で) Storage に書類アップロード → パス配列を受け取る
 *   3. residency_verifications に status='pending' で 1 行 INSERT
 *   4. support@locore.app に通知メール (失敗しても DB は残る)
 *
 * 重複対策: 同一ユーザーで pending が既にある場合はそれを上書き
 *   (前回の申請がレビュー待ちなのに新規申請されたら、最新を尊重する)。
 */

const DOC_TYPES = [
  'visa',
  'residence_card',
  'utility_bill',
  'tax_certificate',
  'other',
] as const;

const inputSchema = z.object({
  documentType: z.enum(DOC_TYPES),
  documentPaths: z.array(z.string().min(1)).min(1).max(3),
  country: z
    .string()
    .trim()
    .max(2)
    .transform((v) => v.toUpperCase()),
  city: z.string().trim().min(1).max(80),
  userNote: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type CreateResidencyVerificationResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createResidencyVerification(
  input: unknown,
): Promise<CreateResidencyVerificationResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.errors[0]?.message ?? '入力内容に不備があります',
    };
  }
  const data = parsed.data;
  const user = await requireUser();
  const db = getDb();

  // 既存 pending があれば削除 (最新で上書き)
  await db
    .delete(schema.residencyVerifications)
    .where(
      and(
        eq(schema.residencyVerifications.userId, user.id),
        eq(schema.residencyVerifications.status, 'pending'),
      ),
    );

  const inserted = await db
    .insert(schema.residencyVerifications)
    .values({
      userId: user.id,
      documentType: data.documentType,
      documentPaths: data.documentPaths,
      country: data.country,
      city: data.city,
      userNote: data.userNote ?? null,
      status: 'pending',
      submittedAt: new Date(),
      // 提出から 30 日経過したら自動 expire の目印
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .returning({ id: schema.residencyVerifications.id });

  const verifId = inserted[0]!.id;

  // 通知メール (best effort — 失敗してもユーザーへのレスポンスは ok)
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://locore.app';
  const adminReviewUrl = `${base}/admin/verifications/${verifId}`;
  const { subject, html } = tplSubmittedNotification({
    userDisplayName: user.displayName ?? user.email ?? '匿名',
    userEmail: user.email ?? '',
    userId: user.id,
    country: data.country,
    city: data.city,
    documentType: data.documentType,
    fileCount: data.documentPaths.length,
    userNote: data.userNote,
    adminReviewUrl,
  });
  await sendEmail({
    to: SUPPORT_EMAIL,
    subject,
    html,
    replyTo: user.email ?? undefined,
  });

  revalidatePath('/settings/verification');
  revalidatePath('/admin/verifications');
  return { ok: true, id: verifId };
}

/**
 * 自分の最新申請を 1 件取得 (表示用)
 */
export async function getMyLatestVerification(): Promise<
  | {
      id: string;
      status: 'pending' | 'approved' | 'rejected';
      submittedAt: Date;
      reviewedAt: Date | null;
      rejectedReason: string | null;
      country: string | null;
      city: string | null;
      documentType: string;
      filesDeletedAt: Date | null;
    }
  | null
> {
  const user = await requireUser();
  const db = getDb();
  const rows = await db
    .select({
      id: schema.residencyVerifications.id,
      status: schema.residencyVerifications.status,
      submittedAt: schema.residencyVerifications.submittedAt,
      reviewedAt: schema.residencyVerifications.reviewedAt,
      rejectedReason: schema.residencyVerifications.rejectedReason,
      country: schema.residencyVerifications.country,
      city: schema.residencyVerifications.city,
      documentType: schema.residencyVerifications.documentType,
      filesDeletedAt: schema.residencyVerifications.filesDeletedAt,
    })
    .from(schema.residencyVerifications)
    .where(eq(schema.residencyVerifications.userId, user.id))
    .orderBy(desc(schema.residencyVerifications.submittedAt))
    .limit(1);
  return rows[0] ?? null;
}
