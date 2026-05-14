'use server';

import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';

/**
 * プロフィール / SNS リンク 編集 Server Actions。
 *
 * 設計:
 *   - SNS リンクは「同じプラットフォームを複数登録可能」に変更（id 単位の CRUD）
 *   - writer 用 bio 編集は廃止（クリエイター / 読者でフォームを分けない方針）
 */

const SNS_PLATFORMS = [
  'tiktok',
  'instagram',
  'youtube',
  'x',
  'threads',
  'blog',
] as const;
type SnsPlatform = (typeof SNS_PLATFORMS)[number];

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

  // writer_profiles.bio は users.bio と一本化したので個別更新は廃止。
  // 既存の writer_profiles.bio は users.bio で上書き反映する。
  if (user.role === 'resident_writer' || user.role === 'editor') {
    await db
      .update(schema.writerProfiles)
      .set({ bio: data.bio ?? null, updatedAt: new Date() })
      .where(eq(schema.writerProfiles.userId, user.id));
  }

  revalidatePath('/settings/profile');
  // 公開プロフィールも再生成（自分のアバター / 表示名変更が反映される）
  revalidatePath(`/writers/${user.id}`);
  return { ok: true };
}

// =============================================================================
// 駐在員プロフィール（出身地・在住・興味・探していること etc.）
// manual/0038_resident_profile_fields.sql で追加されたカラムを更新する。
// =============================================================================

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined));

const RESIDENT_FAMILY_STAGES = [
  'single',
  'couple',
  'family_kids',
  'empty_nest',
] as const;
const RESIDENT_LANGUAGE_LEVELS = [
  'native',
  'business',
  'conversation',
  'basic',
] as const;

const languageSchema = z.object({
  code: z.string().trim().min(2).max(8),
  level: z.enum(RESIDENT_LANGUAGE_LEVELS),
});

const updateResidentProfileSchema = z.object({
  homeCountry: optionalText(2),
  homeRegion: optionalText(80),
  residencyCountry: optionalText(2),
  residencyCity: optionalText(80),
  arrivalYear: z
    .number()
    .int()
    .min(1950)
    .max(new Date().getFullYear() + 1)
    .optional()
    .or(z.literal(0).transform(() => undefined))
    .or(z.null().transform(() => undefined)),
  familyStage: z
    .enum(RESIDENT_FAMILY_STAGES)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  occupation: optionalText(80),
  languages: z.array(languageSchema).max(8).default([]),
  interests: z.array(z.string().trim().min(1).max(30)).max(20).default([]),
  lookingFor: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  openToMeetups: z.boolean().default(false),
});

export async function updateResidentProfile(
  input: unknown,
): Promise<UpdateProfileResult> {
  const parsed = updateResidentProfileSchema.safeParse(input);
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
      homeCountry: data.homeCountry ?? null,
      homeRegion: data.homeRegion ?? null,
      residencyCountry: data.residencyCountry ?? null,
      residencyCity: data.residencyCity ?? null,
      arrivalYear: data.arrivalYear ?? null,
      familyStage: data.familyStage ?? null,
      occupation: data.occupation ?? null,
      languages: data.languages,
      interests: data.interests,
      lookingFor: data.lookingFor,
      openToMeetups: data.openToMeetups,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, user.id));

  revalidatePath('/settings/profile');
  revalidatePath(`/writers/${user.id}`);
  revalidatePath('/residents');
  return { ok: true };
}

// =============================================================================
// SNS リンク（同プラットフォーム複数 OK / id 単位 CRUD）
// =============================================================================

const addSnsSchema = z.object({
  platform: z.enum(SNS_PLATFORMS),
  url: z.string().trim().min(1).max(2048).url(),
});

export type SnsActionResult =
  | { ok: true; data?: { id: string } }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** 新規追加（複数登録 OK） */
export async function addSnsLink(input: unknown): Promise<SnsActionResult> {
  const parsed = addSnsSchema.safeParse(input);
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

  const inserted = await db
    .insert(schema.snsLinks)
    .values({
      userId: user.id,
      platform: platform as SnsPlatform,
      url,
    })
    .returning({ id: schema.snsLinks.id });

  revalidatePath('/settings/profile');
  revalidatePath(`/writers/${user.id}`);
  return { ok: true, data: { id: inserted[0]!.id } };
}

const deleteByIdSchema = z.object({
  id: z.string().uuid(),
});

/** id 指定で削除 */
export async function deleteSnsLink(input: unknown): Promise<SnsActionResult> {
  const parsed = deleteByIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: '不正なリクエスト' };
  }
  const user = await requireUser();
  const db = getDb();

  await db
    .delete(schema.snsLinks)
    .where(
      and(
        eq(schema.snsLinks.id, parsed.data.id),
        eq(schema.snsLinks.userId, user.id),
      ),
    );

  revalidatePath('/settings/profile');
  revalidatePath(`/writers/${user.id}`);
  return { ok: true };
}
