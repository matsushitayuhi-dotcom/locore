'use server';

import { z } from 'zod';
import { eq, and, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';

const SERVICE_CATEGORIES = [
  'tourism',
  'consulting',
  'study_abroad',
  'translation',
  'attend',
  'other',
] as const;
const CONTACT_METHODS = ['chat', 'external_url'] as const;
const AUDIENCES = ['traveler', 'resident', 'both'] as const;

const upsertSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(100),
    description: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    category: z.enum(SERVICE_CATEGORIES).optional(),
    priceJpy: z.number().int().min(0).max(10_000_000).optional().nullable(),
    priceUnit: z
      .string()
      .trim()
      .max(40)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    contactMethod: z.enum(CONTACT_METHODS).default('chat'),
    externalUrl: z
      .string()
      .trim()
      .url()
      .max(2048)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    isActive: z.boolean().default(true),
    position: z.number().int().min(0).default(0),
    /** cities.id (uuid)。null / undefined = 指定なし */
    cityId: z.string().uuid().optional().nullable(),
    /** 誰向けか。未指定 = NULL (= 旧データ扱い、両ホームに出る) */
    audience: z.enum(AUDIENCES).optional().nullable(),
    /** カバー画像 URL。null / undefined = 画像なし */
    coverImageUrl: z
      .string()
      .trim()
      .url()
      .max(2048)
      .optional()
      .nullable()
      .or(z.literal('').transform(() => null)),
    /** ===== 0058 体験詳細フィールド (すべて任意) ===== */
    galleryImages: z.array(z.string().url().max(2048)).max(20).optional(),
    durationLabel: z.string().trim().max(60).optional().nullable(),
    minParticipants: z.number().int().min(0).max(1000).optional().nullable(),
    maxParticipants: z.number().int().min(0).max(1000).optional().nullable(),
    languages: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    highlights: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
    inclusions: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
    meetingPointName: z.string().trim().max(120).optional().nullable(),
    meetingPointLat: z.number().min(-90).max(90).optional().nullable(),
    meetingPointLng: z.number().min(-180).max(180).optional().nullable(),
    cancellationPolicy: z.string().trim().max(1000).optional().nullable(),
  })
  .refine(
    (v) => v.contactMethod !== 'external_url' || !!v.externalUrl,
    {
      message: '外部 URL でやり取りする場合は URL を入力してください',
      path: ['externalUrl'],
    },
  );

export type ServiceActionResult =
  | { ok: true; data?: { id: string } }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function upsertUserService(
  input: unknown,
): Promise<ServiceActionResult> {
  const parsed = upsertSchema.safeParse(input);
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

  // 0058 体験詳細カラム。未適用環境では UPDATE/INSERT が落ちるため、
  // base カラムのみの再試行 (フォールバック) を後段で行う。
  const detailCols = {
    galleryImages: data.galleryImages ?? [],
    durationLabel: data.durationLabel ?? null,
    minParticipants: data.minParticipants ?? null,
    maxParticipants: data.maxParticipants ?? null,
    languages: data.languages ?? [],
    highlights: data.highlights ?? [],
    inclusions: data.inclusions ?? [],
    meetingPointName: data.meetingPointName ?? null,
    meetingPointLat: data.meetingPointLat ?? null,
    meetingPointLng: data.meetingPointLng ?? null,
    cancellationPolicy: data.cancellationPolicy ?? null,
  };
  const isMissingColumn = (err: unknown) =>
    /does not exist/i.test(err instanceof Error ? err.message : String(err));

  if (data.id) {
    // 既存更新（所有者一致）
    const existing = await db
      .select({ id: schema.userServices.id })
      .from(schema.userServices)
      .where(
        and(
          eq(schema.userServices.id, data.id),
          eq(schema.userServices.userId, user.id),
        ),
      )
      .limit(1);
    if (existing.length === 0) {
      return { ok: false, error: 'サービスが見つかりません' };
    }
    const baseSet = {
      title: data.title,
      description: data.description ?? null,
      category: data.category ?? null,
      priceJpy: data.priceJpy ?? null,
      priceUnit: data.priceUnit ?? null,
      contactMethod: data.contactMethod,
      externalUrl: data.externalUrl ?? null,
      cityId: data.cityId ?? null,
      audience: data.audience ?? null,
      coverImageUrl: data.coverImageUrl ?? null,
      isActive: data.isActive,
      position: data.position,
      updatedAt: new Date(),
    };
    try {
      await db
        .update(schema.userServices)
        .set({ ...baseSet, ...detailCols })
        .where(eq(schema.userServices.id, data.id));
    } catch (err) {
      if (!isMissingColumn(err)) throw err;
      // 0058 未適用環境: 体験詳細カラムを除いて再試行
      await db
        .update(schema.userServices)
        .set(baseSet)
        .where(eq(schema.userServices.id, data.id));
    }
    revalidatePath('/settings/services');
    revalidatePath(`/users/${user.id}`);
    revalidatePath(`/users/${user.id}`);
    revalidatePath('/services');
    revalidatePath('/france');
    return { ok: true, data: { id: data.id } };
  }

  // 新規。末尾に position 採番
  const existing = await db
    .select({ position: schema.userServices.position })
    .from(schema.userServices)
    .where(eq(schema.userServices.userId, user.id))
    .orderBy(asc(schema.userServices.position));
  const nextPos = (existing[existing.length - 1]?.position ?? -1) + 1;

  const baseValues = {
    userId: user.id,
    title: data.title,
    description: data.description ?? null,
    category: data.category ?? null,
    priceJpy: data.priceJpy ?? null,
    priceUnit: data.priceUnit ?? null,
    contactMethod: data.contactMethod,
    externalUrl: data.externalUrl ?? null,
    cityId: data.cityId ?? null,
    audience: data.audience ?? null,
    coverImageUrl: data.coverImageUrl ?? null,
    isActive: data.isActive,
    position: nextPos,
  };
  let inserted: { id: string }[];
  try {
    inserted = await db
      .insert(schema.userServices)
      .values({ ...baseValues, ...detailCols })
      .returning({ id: schema.userServices.id });
  } catch (err) {
    if (!isMissingColumn(err)) throw err;
    // 0058 未適用環境: 体験詳細カラムを除いて再試行
    inserted = await db
      .insert(schema.userServices)
      .values(baseValues)
      .returning({ id: schema.userServices.id });
  }

  revalidatePath('/settings/services');
  revalidatePath(`/users/${user.id}`);
  revalidatePath(`/users/${user.id}`);
  revalidatePath('/services');
  revalidatePath('/france');
  return { ok: true, data: { id: inserted[0]!.id } };
}

const deleteSchema = z.object({ id: z.string().uuid() });

export async function deleteUserService(
  input: unknown,
): Promise<ServiceActionResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const user = await requireUser();
  const db = getDb();

  await db
    .delete(schema.userServices)
    .where(
      and(
        eq(schema.userServices.id, parsed.data.id),
        eq(schema.userServices.userId, user.id),
      ),
    );

  revalidatePath('/settings/services');
  revalidatePath(`/users/${user.id}`);
  revalidatePath(`/users/${user.id}`);
  revalidatePath('/services');
  revalidatePath('/france');
  return { ok: true };
}
