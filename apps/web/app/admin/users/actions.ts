'use server';

import 'server-only';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireEditor } from '@/lib/auth/require-user';

/**
 * editor 専用: 任意ユーザーの role を変更する。
 *
 * - 自分自身を「editor 以外」に降格しようとした場合は拒否（自爆防止）
 * - role は writer_role enum の値のみ
 */

const ROLES = ['reader', 'resident_writer', 'editor', 'light_diarist'] as const;
type Role = (typeof ROLES)[number];

const inputSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(ROLES),
});

export type UpdateRoleResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateUserRole(input: unknown): Promise<UpdateRoleResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: '不正なリクエスト' };
  }
  const editor = await requireEditor();
  if (!editor) {
    return { ok: false, error: '編集者ロールのみ実行できます' };
  }

  // 自分の role を editor から変えるのは禁止 (自爆防止)
  if (parsed.data.userId === editor.id && parsed.data.role !== 'editor') {
    return {
      ok: false,
      error: '自分自身の editor ロールは外せません (Supabase で直接変更してください)',
    };
  }

  const db = getDb();
  try {
    await db
      .update(schema.users)
      .set({ role: parsed.data.role as Role, updatedAt: new Date() })
      .where(eq(schema.users.id, parsed.data.userId));

    revalidatePath('/admin/users');
    revalidatePath('/admin');
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `更新失敗: ${msg}` };
  }
}
