'use server';

import { z } from 'zod';
import { and, eq, gte, isNotNull } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/current-user';
import { toReceiptCode } from '@/lib/contact/utils';

const submitReportSchema = z.object({
  targetType: z.enum(['article', 'user', 'review', 'light_diary']),
  targetId: z.string().uuid('不正な対象 ID です'),
  reason: z.enum(['spam', 'inappropriate', 'misinformation', 'copyright', 'other']),
  body: z.string().max(2000).optional(),
});

export type SubmitReportResult =
  | { ok: true; receiptCode: string; duplicateWarning: boolean }
  | { ok: false; error: string };

/**
 * 通報送信。
 * - reports に INSERT（匿名通報も許可: reporter_id NULL OK）
 * - 同一 reporter / 同一 target で 24h 以内の通報が既にあれば `duplicateWarning: true` を返す
 *   （登録は許可）
 * - notification_log に運営宛て通知をモック投入
 */
export async function submitReport(input: unknown): Promise<SubmitReportResult> {
  const parsed = submitReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? '入力内容に誤りがあります',
    };
  }
  const data = parsed.data;
  const db = getDb();

  const currentUser = await getCurrentUser();
  const reporterId: string | null = currentUser?.id ?? null;

  // 24h 以内の重複検知（同一 reporter / 同一 target）
  let duplicateWarning = false;
  if (reporterId) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dup = await db
      .select({ id: schema.reports.id })
      .from(schema.reports)
      .where(
        and(
          isNotNull(schema.reports.reporterId),
          eq(schema.reports.reporterId, reporterId),
          eq(schema.reports.targetType, data.targetType),
          eq(schema.reports.targetId, data.targetId),
          gte(schema.reports.createdAt, since),
        ),
      )
      .limit(1);
    duplicateWarning = dup.length > 0;
  }

  const [inserted] = await db
    .insert(schema.reports)
    .values({
      reporterId,
      targetType: data.targetType,
      targetId: data.targetId,
      reason: data.reason,
      body: data.body ?? null,
      status: 'open',
    })
    .returning({ id: schema.reports.id });

  if (!inserted) {
    return { ok: false, error: '送信に失敗しました。時間をおいて再度お試しください。' };
  }

  await db.insert(schema.auditLogs).values({
    actorId: reporterId,
    action: 'report.submitted',
    targetType: data.targetType,
    targetId: data.targetId,
    metadata: {
      reportId: inserted.id,
      reason: data.reason,
      duplicateWarning,
    },
  });

  // 運営宛て通知（モック）
  const editors = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, 'editor'))
    .limit(1);

  const notifyUserId = editors[0]?.id ?? reporterId;
  if (notifyUserId) {
    await db.insert(schema.notificationLog).values({
      userId: notifyUserId,
      type: 'report_submitted',
      payload: {
        reportId: inserted.id,
        targetType: data.targetType,
        targetId: data.targetId,
        reason: data.reason,
      },
      channel: 'in_app',
      status: 'pending',
    });
  }

  return {
    ok: true,
    receiptCode: toReceiptCode(inserted.id),
    duplicateWarning,
  };
}
