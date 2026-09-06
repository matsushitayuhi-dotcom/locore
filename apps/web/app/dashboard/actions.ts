'use server';

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';

/** 「今月の目標」（相談件数）の保存。0 = 目標なし */
const goalSchema = z.object({ goal: z.number().int().min(0).max(200) });

export async function setMonthlyGoal(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '目標は 0〜200 の整数で入力してください' };
  const user = await requireUser();
  const db = getDb();
  try {
    await db
      .update(schema.users)
      .set({ monthlyGoalBookings: parsed.data.goal > 0 ? parsed.data.goal : null, updatedAt: new Date() })
      .where(eq(schema.users.id, user.id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist/i.test(msg)) return { ok: false, error: 'DB が未更新です（0090）。運営に連絡してください' };
    throw err;
  }
  revalidatePath('/dashboard');
  return { ok: true };
}
