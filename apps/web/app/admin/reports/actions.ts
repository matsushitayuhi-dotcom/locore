'use server';

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/current-user';

const updateSchema = z.object({
  reportId: z.string().uuid(),
  status: z.enum(['open', 'investigating', 'resolved', 'dismissed']),
  notes: z.string().max(2000).optional(),
});

export type UpdateReportStatusResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * 運営による通報ステータス更新。
 * - editor 権限のみ実行可
 * - resolved/dismissed の場合は resolved_by / resolved_at を更新
 * - audit_logs に `report.status_changed` を記録（メモは metadata.notes）
 */
export async function updateReportStatus(
  input: unknown,
): Promise<UpdateReportStatusResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: '入力内容に誤りがあります' };
  }
  const { reportId, status, notes } = parsed.data;

  const user = await getCurrentUser();
  if (user.role !== 'editor') {
    return { ok: false, error: '権限がありません（editor 権限が必要）' };
  }

  const db = getDb();
  const isClosing = status === 'resolved' || status === 'dismissed';

  await db
    .update(schema.reports)
    .set({
      status,
      resolvedBy: isClosing ? user.id : null,
      resolvedAt: isClosing ? new Date() : null,
    })
    .where(eq(schema.reports.id, reportId));

  await db.insert(schema.auditLogs).values({
    actorId: user.id,
    action: 'report.status_changed',
    targetType: 'reports',
    targetId: reportId,
    metadata: {
      status,
      notes: notes ?? null,
    },
  });

  revalidatePath('/admin/reports');
  revalidatePath(`/admin/reports/${reportId}`);

  return { ok: true };
}
