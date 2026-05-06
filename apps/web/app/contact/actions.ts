'use server';

import { z } from 'zod';
import { and, eq, gte, sql } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/current-user';
import { NIL_UUID, toReceiptCode } from '@/lib/contact/utils';

const submitContactSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  email: z.string().email('有効なメールアドレスを入力してください'),
  category: z.enum(['bug', 'feature', 'terms', 'payment', 'other']),
  subject: z.string().min(1, '件名を入力してください').max(100),
  body: z
    .string()
    .min(10, '本文は 10 文字以上で入力してください')
    .max(2000, '本文は 2000 文字以内で入力してください'),
});

export type SubmitContactResult =
  | { ok: true; receiptCode: string }
  | { ok: false; error: string };

const RATE_LIMIT_PER_HOUR = 5;

/**
 * お問い合わせ送信。
 * - reports テーブルに `target_type='other'`、`target_id=NIL_UUID` で保存
 * - reason 列にカテゴリ（bug / feature / 等）
 * - body は `件名: ...\n\n<本文>` 形式
 * - audit_logs に `contact.submitted` を記録（連絡先 email を metadata に保存）
 * - notification_log に運営宛て通知を 1 件 INSERT（モック）
 * - 同一メールから 1 時間に 5 件を超えると拒否
 */
export async function submitContact(input: unknown): Promise<SubmitContactResult> {
  const parsed = submitContactSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? '入力内容に誤りがあります',
    };
  }
  const data = parsed.data;
  const db = getDb();

  // ログイン中なら reporter_id を紐付ける（任意）
  let reporterId: string | null = null;
  try {
    const user = await getCurrentUser();
    reporterId = user.id;
  } catch {
    reporterId = null;
  }

  // レート制限: 同一メールから直近 1 時間に 5 件を超えたら拒否
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [recent] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.auditLogs)
    .where(
      and(
        eq(schema.auditLogs.action, 'contact.submitted'),
        gte(schema.auditLogs.createdAt, oneHourAgo),
        sql`${schema.auditLogs.metadata}->>'email' = ${data.email}`,
      ),
    );

  if ((recent?.count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return {
      ok: false,
      error: '短時間に多数のお問い合わせが送信されています。しばらく時間を置いてから再度お試しください。',
    };
  }

  const composedBody = `件名: ${data.subject}\n\n${data.body}`;

  const [inserted] = await db
    .insert(schema.reports)
    .values({
      reporterId,
      targetType: 'other',
      targetId: NIL_UUID,
      reason: data.category,
      body: composedBody,
      status: 'open',
    })
    .returning({ id: schema.reports.id });

  if (!inserted) {
    return { ok: false, error: '送信に失敗しました。時間をおいて再度お試しください。' };
  }

  // 監査ログ（連絡先メール・名前・カテゴリを metadata に保存）
  await db.insert(schema.auditLogs).values({
    actorId: reporterId,
    action: 'contact.submitted',
    targetType: 'reports',
    targetId: inserted.id,
    metadata: {
      email: data.email,
      name: data.name ?? null,
      category: data.category,
      subject: data.subject,
    },
  });

  // 運営宛て通知（モック）：editor ユーザーに in_app 通知 1 件
  const editors = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, 'editor'))
    .limit(1);

  const notifyUserId = editors[0]?.id ?? reporterId;
  if (notifyUserId) {
    await db.insert(schema.notificationLog).values({
      userId: notifyUserId,
      type: 'contact_submitted',
      payload: {
        reportId: inserted.id,
        category: data.category,
        subject: data.subject,
        contactEmail: data.email,
      },
      channel: 'in_app',
      status: 'pending',
    });
  }
  // TODO: Resend 統合で運営宛てメール送信

  return { ok: true, receiptCode: toReceiptCode(inserted.id) };
}
