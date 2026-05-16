'use server';

import 'server-only';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireEditor } from '@/lib/auth/require-user';
import { sendEmail } from '@/lib/email/send';
import { tplApproved, tplRejected } from '@/lib/email/templates';

/**
 * 居住確認の承認 / 却下 Server Actions (editor 専用)。
 *
 * 承認時:
 *   - residency_verifications.status = 'approved' + reviewedAt/By
 *   - writer_profiles.residency_verified_at = now()
 *   - writer_profiles の residency_country/years は触らない (本人申告を尊重)
 *   - ユーザーに承認メール
 *
 * 却下時:
 *   - status = 'rejected' + rejectedReason + reviewedAt/By
 *   - ユーザーに却下理由メール + 再申請の導線
 */

const approveSchema = z.object({
  id: z.string().uuid(),
  reviewerNote: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

const rejectSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().min(10, '却下理由は 10 文字以上で記入してください').max(500),
  reviewerNote: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type ReviewActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function loadVerificationWithUser(id: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: schema.residencyVerifications.id,
      userId: schema.residencyVerifications.userId,
      status: schema.residencyVerifications.status,
      userDisplayName: schema.users.displayName,
      userEmail: schema.users.email,
    })
    .from(schema.residencyVerifications)
    .leftJoin(schema.users, eq(schema.users.id, schema.residencyVerifications.userId))
    .where(eq(schema.residencyVerifications.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// =============================================================================
// 承認
// =============================================================================

export async function approveVerification(
  input: unknown,
): Promise<ReviewActionResult> {
  const editor = await requireEditor();
  if (!editor) return { ok: false, error: '編集者ロールが必要です' };

  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: '不正な入力' };
  }

  const verif = await loadVerificationWithUser(parsed.data.id);
  if (!verif) return { ok: false, error: '申請が見つかりません' };
  if (verif.status !== 'pending') {
    return { ok: false, error: 'すでに処理済みです' };
  }

  const db = getDb();
  const now = new Date();

  await db
    .update(schema.residencyVerifications)
    .set({
      status: 'approved',
      reviewedAt: now,
      reviewedBy: editor.id,
      reviewerNote: parsed.data.reviewerNote ?? null,
    })
    .where(eq(schema.residencyVerifications.id, parsed.data.id));

  // writer_profiles 側を更新 (存在する場合のみ)
  await db
    .update(schema.writerProfiles)
    .set({
      residencyVerifiedAt: now,
      residencyStatus: 'current_resident',
      updatedAt: now,
    })
    .where(eq(schema.writerProfiles.userId, verif.userId));

  // ユーザーに承認メール
  if (verif.userEmail) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://locore.app';
    const { subject, html } = tplApproved({
      userDisplayName: verif.userDisplayName ?? '会員',
      profileUrl: `${base}/residents/${verif.userId}`,
    });
    await sendEmail({ to: verif.userEmail, subject, html });
  }

  revalidatePath('/admin/verifications');
  revalidatePath(`/admin/verifications/${parsed.data.id}`);
  revalidatePath('/settings/verification');
  revalidatePath(`/residents/${verif.userId}`);
  return { ok: true };
}

// =============================================================================
// 却下
// =============================================================================

export async function rejectVerification(
  input: unknown,
): Promise<ReviewActionResult> {
  const editor = await requireEditor();
  if (!editor) return { ok: false, error: '編集者ロールが必要です' };

  const parsed = rejectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.errors[0]?.message ?? '入力内容に不備があります',
    };
  }

  const verif = await loadVerificationWithUser(parsed.data.id);
  if (!verif) return { ok: false, error: '申請が見つかりません' };
  if (verif.status !== 'pending') {
    return { ok: false, error: 'すでに処理済みです' };
  }

  const db = getDb();
  const now = new Date();

  await db
    .update(schema.residencyVerifications)
    .set({
      status: 'rejected',
      reviewedAt: now,
      reviewedBy: editor.id,
      rejectedReason: parsed.data.reason,
      reviewerNote: parsed.data.reviewerNote ?? null,
    })
    .where(eq(schema.residencyVerifications.id, parsed.data.id));

  // ユーザーに却下メール
  if (verif.userEmail) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://locore.app';
    const { subject, html } = tplRejected({
      userDisplayName: verif.userDisplayName ?? '会員',
      reason: parsed.data.reason,
      resubmitUrl: `${base}/settings/verification`,
    });
    await sendEmail({ to: verif.userEmail, subject, html });
  }

  revalidatePath('/admin/verifications');
  revalidatePath(`/admin/verifications/${parsed.data.id}`);
  revalidatePath('/settings/verification');
  return { ok: true };
}
