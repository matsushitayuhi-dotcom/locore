'use server';

import 'server-only';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireEditor } from '@/lib/auth/require-user';
import { sendEmail } from '@/lib/email/send';

/**
 * 資格・試験スコア（0086）の承認 / 却下 Server Actions（editor 専用）。
 * 承認すると公開プロフィール（/experts/[id]）に「確認済み」で表示される。
 */

const approveSchema = z.object({
  id: z.string().uuid(),
  reviewerNote: z.string().trim().max(500).optional().or(z.literal('').transform(() => undefined)),
});
const rejectSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().min(10, '却下理由は 10 文字以上で記入してください').max(500),
  reviewerNote: z.string().trim().max(500).optional().or(z.literal('').transform(() => undefined)),
});

export type QualReviewResult = { ok: true } | { ok: false; error: string };

async function load(id: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: schema.userQualifications.id,
      userId: schema.userQualifications.userId,
      status: schema.userQualifications.status,
      customName: schema.userQualifications.customName,
      nameJa: schema.qualifications.nameJa,
      code: schema.qualifications.code,
      userDisplayName: schema.users.displayName,
      userEmail: schema.users.email,
    })
    .from(schema.userQualifications)
    .innerJoin(schema.qualifications, eq(schema.qualifications.id, schema.userQualifications.qualificationId))
    .leftJoin(schema.users, eq(schema.users.id, schema.userQualifications.userId))
    .where(eq(schema.userQualifications.id, id))
    .limit(1);
  return rows[0] ?? null;
}

function nameOf(r: { code: string; nameJa: string; customName: string | null }) {
  return r.code === 'other' && r.customName ? r.customName : r.nameJa;
}

export async function approveQualification(input: unknown): Promise<QualReviewResult> {
  const editor = await requireEditor();
  if (!editor) return { ok: false, error: '編集者ロールが必要です' };
  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正な入力' };
  const row = await load(parsed.data.id);
  if (!row) return { ok: false, error: '申請が見つかりません' };
  if (row.status !== 'pending') return { ok: false, error: 'すでに処理済みです' };

  const db = getDb();
  const now = new Date();
  await db
    .update(schema.userQualifications)
    .set({ status: 'approved', reviewedAt: now, reviewedBy: editor.id, reviewerNote: parsed.data.reviewerNote ?? null, updatedAt: now })
    .where(eq(schema.userQualifications.id, row.id));

  if (row.userEmail) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://locore.app';
    await sendEmail({
      to: row.userEmail,
      subject: `[Locore] 資格「${nameOf(row)}」を確認しました`,
      html: `<p style="font-family:sans-serif;font-size:14px;line-height:1.8">${row.userDisplayName ?? '会員'} さん<br><br>ご提出いただいた「${nameOf(row)}」の合格証明を確認しました。公開プロフィールに「確認済み」として表示されます。<br><a href="${base}/experts/${row.userId}">プロフィールを見る</a></p>`,
    });
  }
  revalidatePath('/admin/qualifications');
  revalidatePath(`/admin/qualifications/${row.id}`);
  revalidatePath('/settings/verification');
  revalidatePath(`/experts/${row.userId}`);
  return { ok: true };
}

export async function rejectQualification(input: unknown): Promise<QualReviewResult> {
  const editor = await requireEditor();
  if (!editor) return { ok: false, error: '編集者ロールが必要です' };
  const parsed = rejectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? '入力内容に不備があります' };
  const row = await load(parsed.data.id);
  if (!row) return { ok: false, error: '申請が見つかりません' };
  if (row.status !== 'pending') return { ok: false, error: 'すでに処理済みです' };

  const db = getDb();
  const now = new Date();
  await db
    .update(schema.userQualifications)
    .set({ status: 'rejected', reviewedAt: now, reviewedBy: editor.id, rejectedReason: parsed.data.reason, reviewerNote: parsed.data.reviewerNote ?? null, updatedAt: now })
    .where(eq(schema.userQualifications.id, row.id));

  if (row.userEmail) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://locore.app';
    await sendEmail({
      to: row.userEmail,
      subject: `[Locore] 資格「${nameOf(row)}」の確認について`,
      html: `<p style="font-family:sans-serif;font-size:14px;line-height:1.8">${row.userDisplayName ?? '会員'} さん<br><br>ご提出いただいた「${nameOf(row)}」の合格証明は、次の理由で確認できませんでした。<br><br>${parsed.data.reason.replace(/\n/g, '<br>')}<br><br>書類を確認のうえ、<a href="${base}/settings/verification">こちら</a>から再申請してください。</p>`,
    });
  }
  revalidatePath('/admin/qualifications');
  revalidatePath(`/admin/qualifications/${row.id}`);
  revalidatePath('/settings/verification');
  return { ok: true };
}
