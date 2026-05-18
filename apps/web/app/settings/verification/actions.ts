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
 * 本人確認 (旧: 居住確認) の申請 Server Action。
 *
 * 流れ:
 *   1. requireUser
 *   2. (UI 側で) Storage に書類アップロード → パス配列を受け取る
 *   3. residency_verifications に status='pending' で 1 行 INSERT
 *      (テーブル名は歴史的経緯でそのまま。意味は本人確認に拡張)
 *   4. support@locore.app に通知メール (失敗しても DB は残る)
 *
 * 重複対策: 同一ユーザーで pending が既にある場合はそれを上書き
 *   (前回の申請がレビュー待ちなのに新規申請されたら、最新を尊重する)。
 *
 * 必須: 書類タイプ + ファイル + 氏名 (英語 or 日本語のどちらか)
 * 任意: 居住国 / 都市 / 住所 / 電話 (本人確認には不要だが、書類照合の補助 +
 *       プロフィール表示用に使う)
 */

const DOC_TYPES = [
  'visa',
  'residence_card',
  'utility_bill',
  'tax_certificate',
  'other',
  // manual/0043 で追加
  'passport',
  'my_number_card',
  'driver_license',
] as const;

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
    /** 居住国 (任意。ISO 2 文字、空も許容) */
    country: z
      .string()
      .trim()
      .max(2)
      .transform((v) => (v ? v.toUpperCase() : undefined))
      .optional()
      .or(z.literal('').transform(() => undefined)),
    /** 居住都市 (任意) */
    city: optionalTrimmed(80),
    /** 英語表記の氏名 (任意。英字・スペース・記号のみ) */
    legalNameRoman: z
      .string()
      .trim()
      .max(140)
      .regex(/^[A-Za-z\s.\-']*$/, '英語表記は半角アルファベットで入力してください')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    /** 日本語/母語表記の氏名 (任意) */
    legalNameNative: optionalTrimmed(140),
    /** 住所 (任意) */
    addressLine: optionalTrimmed(300),
    postalCode: optionalTrimmed(20),
    /** 電話番号 (任意。E.164 推奨だが緩めに許容) */
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
    country: data.country ?? null,
    city: data.city ?? null,
    legalNameRoman: data.legalNameRoman ?? null,
    legalNameNative: data.legalNameNative ?? null,
    addressLine: data.addressLine ?? null,
    postalCode: data.postalCode ?? null,
    phoneNumber: data.phoneNumber ?? null,
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
        filesDeletedAt: schema.residencyVerifications.filesDeletedAt,
      })
      .from(schema.residencyVerifications)
      .where(eq(schema.residencyVerifications.userId, user.id))
      .orderBy(desc(schema.residencyVerifications.submittedAt))
      .limit(1);
    return rows[0] ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // migration 0041 / 0042 が未適用だと "column does not exist" で落ちる
    if (/does not exist/i.test(msg)) {
      console.error(
        '[verification] DB スキーマが未マイグレート: ' +
          'packages/db/migrations/manual/0041 と 0042 を Supabase に流してください。',
      );
      return null;
    }
    console.error('[verification] getMyLatestVerification failed:', msg);
    return null;
  }
}
