'use server';

import 'server-only';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { and, desc, eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { sendEmail, SUPPORT_EMAIL } from '@/lib/email/send';
import { tplSubmittedNotification } from '@/lib/email/templates';

/**
 * 在籍確認（旧: 本人確認 / 居住確認）の申請 Server Actions。
 *
 * 留学特化（2026-09）: 確認したい事実は「その学校に在学している / 卒業した」こと。
 *   - 受け付ける書類: 入学証明書・在籍証明書 / 学生証 / 卒業証書・学位記（+ その他）
 *   - 必須: 書類タイプ + ファイル + 氏名（英語 or 日本語のどちらか）+ 学校名
 *   - kind='enrollment' で保存（旧来の身分証申請は kind='identity'。判定ロジックは共通）
 * 旧フィールド（国 / 都市 / 住所 / 電話）は受け取れば保存するが、フォームからは送らない。
 */

/** 在籍確認で受け付ける書類（residency_document_type enum のサブセット。manual/0085）。
 *  'use server' ファイルは async 関数しか export できないため非公開。UI 側の一覧は VerificationForm.ENROLLMENT_DOCS */
const ENROLLMENT_DOC_TYPES = [
  'enrollment_certificate',
  'student_id',
  'diploma',
  'other',
] as const;

/** 旧来の身分証（互換のため受理は続ける） */
const LEGACY_DOC_TYPES = [
  'visa',
  'residence_card',
  'utility_bill',
  'tax_certificate',
  'passport',
  'my_number_card',
  'driver_license',
] as const;

const DOC_TYPES = [...ENROLLMENT_DOC_TYPES, ...LEGACY_DOC_TYPES] as const;

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined));

const inputSchema = z
  .object({
    documentType: z.enum(DOC_TYPES),
    documentPaths: z.array(z.string().min(1)).min(1).max(3),
    /** 在籍確認の対象校（書類との照合用） */
    schoolName: optionalTrimmed(160),
    country: z
      .string()
      .trim()
      .max(2)
      .transform((v) => (v ? v.toUpperCase() : undefined))
      .optional()
      .or(z.literal('').transform(() => undefined)),
    city: optionalTrimmed(80),
    legalNameRoman: z
      .string()
      .trim()
      .max(140)
      .regex(/^[A-Za-z\s.\-']*$/, '英語表記は半角アルファベットで入力してください')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    legalNameNative: optionalTrimmed(140),
    addressLine: optionalTrimmed(300),
    postalCode: optionalTrimmed(20),
    phoneNumber: z
      .string()
      .trim()
      .max(30)
      .regex(/^[+0-9()\-.\s]*$/, '電話番号の形式が正しくありません')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    userNote: optionalTrimmed(500),
  })
  .refine(
    (data) => (data.legalNameRoman ?? '').length > 0 || (data.legalNameNative ?? '').length > 0,
    { message: '氏名 (英語または日本語) を入力してください', path: ['legalNameRoman'] },
  )
  .refine(
    (data) =>
      !(ENROLLMENT_DOC_TYPES as readonly string[]).includes(data.documentType) ||
      (data.schoolName ?? '').length > 0,
    { message: '学校名を入力してください', path: ['schoolName'] },
  );

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
      error: parsed.error.errors[0]?.message ?? '入力内容に不備があります',
    };
  }
  const data = parsed.data;
  const user = await requireUser();
  const db = getDb();

  const kind = (ENROLLMENT_DOC_TYPES as readonly string[]).includes(data.documentType)
    ? 'enrollment'
    : 'identity';

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
      kind,
      schoolName: data.schoolName ?? null,
      country: data.country ?? null,
      city: data.city ?? null,
      legalNameRoman: data.legalNameRoman ?? null,
      legalNameNative: data.legalNameNative ?? null,
      addressLine: data.addressLine ?? null,
      postalCode: data.postalCode ?? null,
      phoneNumber: data.phoneNumber ?? null,
      userNote: data.userNote ?? null,
      status: 'pending',
      submittedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .returning({ id: schema.residencyVerifications.id });

  const verifId = inserted[0]!.id;

  // 通知メール (best effort)
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://locore.app';
  const adminReviewUrl = `${base}/admin/verifications/${verifId}`;
  const { subject, html } = tplSubmittedNotification({
    userDisplayName: user.displayName ?? user.email ?? '匿名',
    userEmail: user.email ?? '',
    userId: user.id,
    country: data.country ?? null,
    city: data.city ?? null,
    legalNameRoman: data.legalNameRoman ?? null,
    legalNameNative: data.legalNameNative ?? null,
    addressLine: data.addressLine ?? null,
    postalCode: data.postalCode ?? null,
    phoneNumber: data.phoneNumber ?? null,
    documentType: data.documentType,
    fileCount: data.documentPaths.length,
    userNote: [data.schoolName ? `学校: ${data.schoolName}` : null, data.userNote]
      .filter(Boolean)
      .join('\n') || undefined,
    adminReviewUrl,
  });
  await sendEmail({ to: SUPPORT_EMAIL, subject, html, replyTo: user.email ?? undefined });

  revalidatePath('/settings/verification');
  revalidatePath('/settings');
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
      kind: string;
      schoolName: string | null;
      filesDeletedAt: Date | null;
    }
  | null
> {
  const user = await requireUser();
  const db = getDb();
  try {
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
        kind: schema.residencyVerifications.kind,
        schoolName: schema.residencyVerifications.schoolName,
        filesDeletedAt: schema.residencyVerifications.filesDeletedAt,
      })
      .from(schema.residencyVerifications)
      .where(eq(schema.residencyVerifications.userId, user.id))
      .orderBy(desc(schema.residencyVerifications.submittedAt))
      .limit(1);
    return rows[0] ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist/i.test(msg)) {
      console.error(
        '[verification] DB スキーマが未マイグレート: ' +
          'packages/db/migrations/manual/0041 / 0042 / 0085 を Supabase に流してください。',
      );
      return null;
    }
    console.error('[verification] getMyLatestVerification failed:', msg);
    return null;
  }
}

// =============================================================================
// 資格・試験スコア（0086）: 本人による登録 / 取り下げ
// =============================================================================

const createQualificationSchema = z
  .object({
    qualificationId: z.string().uuid(),
    /** マスタが other のときの名称 */
    customName: optionalTrimmed(80),
    score: optionalTrimmed(40),
    acquiredYear: z
      .number()
      .int()
      .min(1970)
      .max(new Date().getFullYear() + 1)
      .optional()
      .or(z.null().transform(() => undefined)),
    /** 合格証明（1〜3 件、verification-docs のパス） */
    proofPaths: z.array(z.string().min(1)).min(1).max(3),
    userNote: optionalTrimmed(300),
  });

export type QualificationActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createUserQualification(input: unknown): Promise<QualificationActionResult> {
  const parsed = createQualificationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? '入力内容に不備があります' };
  }
  const data = parsed.data;
  const user = await requireUser();
  const db = getDb();

  const master = await db
    .select({
      id: schema.qualifications.id,
      code: schema.qualifications.code,
      nameJa: schema.qualifications.nameJa,
      hasScore: schema.qualifications.hasScore,
    })
    .from(schema.qualifications)
    .where(
      and(eq(schema.qualifications.id, data.qualificationId), eq(schema.qualifications.isActive, true)),
    )
    .limit(1);
  const q = master[0];
  if (!q) return { ok: false, error: '資格の種類が見つかりません' };
  if (q.code === 'other' && !data.customName) {
    return { ok: false, error: '「その他」を選んだ場合は資格名を入力してください' };
  }

  // 同じ資格の既存行（pending / rejected / approved）は最新申請で置き換える
  const customName = q.code === 'other' ? (data.customName ?? null) : null;
  const existing = await db
    .select({ id: schema.userQualifications.id })
    .from(schema.userQualifications)
    .where(
      and(
        eq(schema.userQualifications.userId, user.id),
        eq(schema.userQualifications.qualificationId, q.id),
      ),
    );
  const dupe = existing.length > 0 && customName == null;
  if (dupe) {
    await db
      .delete(schema.userQualifications)
      .where(
        and(
          eq(schema.userQualifications.userId, user.id),
          eq(schema.userQualifications.qualificationId, q.id),
        ),
      );
  }

  const inserted = await db
    .insert(schema.userQualifications)
    .values({
      userId: user.id,
      qualificationId: q.id,
      customName,
      score: q.hasScore || q.code === 'other' ? (data.score ?? null) : null,
      acquiredYear: data.acquiredYear ?? null,
      proofPaths: data.proofPaths,
      userNote: data.userNote ?? null,
      status: 'pending',
      submittedAt: new Date(),
    })
    .returning({ id: schema.userQualifications.id });
  const id = inserted[0]!.id;

  // 運営へ通知（best effort・簡易 HTML）
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://locore.app';
  const name = customName ?? q.nameJa;
  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `[Locore] 資格の確認申請 — ${user.displayName ?? user.email ?? '匿名'} さん（${name}）`,
    html: `<p style="font-family:sans-serif;font-size:14px;line-height:1.8">資格の確認申請が届きました。<br>申請者: ${escapeHtml(
      user.displayName ?? user.email ?? '匿名',
    )}<br>資格: ${escapeHtml(name)}${data.score ? ` / スコア: ${escapeHtml(data.score)}` : ''}${
      data.acquiredYear ? ` / 取得年: ${data.acquiredYear}` : ''
    }<br>証明書: ${data.proofPaths.length} 件<br><a href="${base}/admin/qualifications/${id}">レビューする</a></p>`,
    replyTo: user.email ?? undefined,
  });

  revalidatePath('/settings/verification');
  revalidatePath('/admin/qualifications');
  revalidatePath(`/experts/${user.id}`);
  return { ok: true, id };
}

/** 本人による取り下げ（pending / rejected のみ。approved は運営に連絡） */
export async function deleteUserQualification(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正な入力' };
  const user = await requireUser();
  const db = getDb();
  const rows = await db
    .select({ id: schema.userQualifications.id, status: schema.userQualifications.status })
    .from(schema.userQualifications)
    .where(
      and(
        eq(schema.userQualifications.id, parsed.data.id),
        eq(schema.userQualifications.userId, user.id),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return { ok: false, error: '見つかりません' };
  if (row.status === 'approved') {
    return { ok: false, error: '確認済みの資格は削除できません。運営にご連絡ください' };
  }
  await db.delete(schema.userQualifications).where(eq(schema.userQualifications.id, row.id));
  revalidatePath('/settings/verification');
  revalidatePath('/admin/qualifications');
  return { ok: true };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}
