'use server';

import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';

const SNS_PLATFORMS = ['tiktok', 'instagram', 'youtube', 'x', 'blog'] as const;
type SnsPlatform = (typeof SNS_PLATFORMS)[number];

/** 空文字 → undefined にして optional URL を扱いやすくする */
const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .optional()
  .or(z.literal('').transform(() => undefined));

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1, '表示名を入力してください').max(50),
  bio: z.string().trim().max(500).optional().or(z.literal('').transform(() => undefined)),
  avatarUrl: optionalUrl,
  /** 書き手向け bio（writer_profiles.bio）。書き手以外の入力は無視する */
  writerBio: z.string().trim().max(500).optional().or(z.literal('').transform(() => undefined)),
});

export type UpdateProfileResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateProfile(input: unknown): Promise<UpdateProfileResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const data = parsed.data;
  const user = await requireUser();
  const db = getDb();

  await db
    .update(schema.users)
    .set({
      displayName: data.displayName,
      bio: data.bio ?? null,
      avatarUrl: data.avatarUrl ?? null,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, user.id));

  // 書き手の場合のみ writer_profiles.bio を更新（行が無ければスキップ）
  if (user.role === 'resident_writer' || user.role === 'editor') {
    await db
      .update(schema.writerProfiles)
      .set({ bio: data.writerBio ?? null, updatedAt: new Date() })
      .where(eq(schema.writerProfiles.userId, user.id));
  }

  revalidatePath('/settings/profile');
  return { ok: true };
}

const upsertSnsSchema = z.object({
  platform: z.enum(SNS_PLATFORMS),
  url: z.string().trim().min(1).max(2048).url(),
});

export type SnsActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function upsertSnsLink(input: unknown): Promise<SnsActionResult> {
  const parsed = upsertSnsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const { platform, url } = parsed.data;
  const user = await requireUser();
  const db = getDb();

  const existing = await db
    .select({ id: schema.snsLinks.id })
    .from(schema.snsLinks)
    .where(
      and(eq(schema.snsLinks.userId, user.id), eq(schema.snsLinks.platform, platform)),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(schema.snsLinks)
      .set({ url, updatedAt: new Date() })
      .where(eq(schema.snsLinks.id, existing[0]!.id));
  } else {
    await db.insert(schema.snsLinks).values({
      userId: user.id,
      platform: platform as SnsPlatform,
      url,
    });
  }

  revalidatePath('/settings/profile');
  return { ok: true };
}

const deleteSnsSchema = z.object({
  platform: z.enum(SNS_PLATFORMS),
});

export async function deleteSnsLink(input: unknown): Promise<SnsActionResult> {
  const parsed = deleteSnsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: '不正なリクエスト' };
  }
  const user = await requireUser();
  const db = getDb();

  await db
    .delete(schema.snsLinks)
    .where(
      and(
        eq(schema.snsLinks.userId, user.id),
        eq(schema.snsLinks.platform, parsed.data.platform),
      ),
    );

  revalidatePath('/settings/profile');
  return { ok: true };
}
