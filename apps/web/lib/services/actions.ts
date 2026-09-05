'use server';

import { z } from 'zod';
import { eq, and, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { CONSULTATION_TAG, TOPIC_TAG_VALUES } from '@/lib/experts/constants';

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
    /** 所要時間（分）。相談メニューの空き枠予約に使う（0061 追加） */
    durationMinutes: z.number().int().min(15).max(480).optional().nullable(),
    minParticipants: z.number().int().min(0).max(1000).optional().nullable(),
    maxParticipants: z.number().int().min(0).max(1000).optional().nullable(),
    languages: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    highlights: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
    inclusions: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
    meetingPointName: z.string().trim().max(120).optional().nullable(),
    meetingPointLat: z.number().min(-90).max(90).optional().nullable(),
    meetingPointLng: z.number().min(-180).max(180).optional().nullable(),
    cancellationPolicy: z.string().trim().max(1000).optional().nullable(),
    /** ===== v2 相談メニュー =====
     *  true なら tags に 'consultation' を付与して /experts に掲載する。 */
    consultation: z.boolean().default(false),
    /** 相談テーマ（TOPIC_TAGS の value）。consultation=true のときだけ保存 */
    consultationTopics: z
      .array(z.string().trim().min(1).max(40))
      .max(8)
      .default([]),
    /** ===== 伴走スライス（0083） =====
     *  'monthly' = 継続プラン（priceJpy は月額、sessionsPerMonth は月回数） */
    planKind: z.enum(['single', 'monthly']).default('single'),
    sessionsPerMonth: z.number().int().min(1).max(8).optional().nullable(),
  })
  .refine(
    (v) => v.contactMethod !== 'external_url' || !!v.externalUrl,
    {
      message: '外部 URL でやり取りする場合は URL を入力してください',
      path: ['externalUrl'],
    },
  )
  .refine(
    (v) =>
      v.planKind !== 'monthly' ||
      (v.sessionsPerMonth != null &&
        v.durationMinutes != null &&
        v.priceJpy != null),
    {
      message:
        '継続プランは月回数・1回の長さ・月額の3つが必要です',
      path: ['sessionsPerMonth'],
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
    durationMinutes: data.durationMinutes ?? null,
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

  // 0083 伴走スライス。未適用環境ではこの 2 列だけ落として再試行する
  const planCols = {
    planKind: data.planKind,
    sessionsPerMonth:
      data.planKind === 'monthly' ? (data.sessionsPerMonth ?? null) : null,
  };

  /**
   * v2 相談メニュー: 'consultation' + テーマタグはこのアクションが管理し、
   * それ以外の既存タグ（フリーキーワード等）は温存する。
   * tags 列は 0055 追加なので、未適用環境では tags 抜きで再試行する。
   */
  const MANAGED_TAGS = new Set<string>([CONSULTATION_TAG, ...TOPIC_TAG_VALUES]);
  const buildTags = (existingTags: string[]): string[] => {
    const kept = existingTags.filter((t) => !MANAGED_TAGS.has(t));
    if (!data.consultation) return kept;
    const topics = data.consultationTopics.filter((t) =>
      TOPIC_TAG_VALUES.includes(t),
    );
    return [CONSULTATION_TAG, ...topics, ...kept];
  };

  if (data.id) {
    // 既存更新（所有者一致）。既存 tags も読んで管理外タグを温存する
    // （tags 列 = 0055 が未適用の環境では id のみで再試行）。
    let existing: Array<{ id: string; tags?: string[] | null }>;
    try {
      existing = await db
        .select({
          id: schema.userServices.id,
          tags: schema.userServices.tags,
        })
        .from(schema.userServices)
        .where(
          and(
            eq(schema.userServices.id, data.id),
            eq(schema.userServices.userId, user.id),
          ),
        )
        .limit(1);
    } catch (err) {
      if (!isMissingColumn(err)) throw err;
      existing = await db
        .select({ id: schema.userServices.id })
        .from(schema.userServices)
        .where(
          and(
            eq(schema.userServices.id, data.id),
            eq(schema.userServices.userId, user.id),
          ),
        )
        .limit(1);
    }
    if (existing.length === 0) {
      return { ok: false, error: 'サービスが見つかりません' };
    }
    const tags = buildTags(
      Array.isArray(existing[0]?.tags) ? existing[0]!.tags! : [],
    );
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
        .set({ ...baseSet, ...detailCols, ...planCols, tags })
        .where(eq(schema.userServices.id, data.id));
    } catch (errPlan) {
      if (!isMissingColumn(errPlan)) throw errPlan;
      try {
        // 0083 未適用環境: plan カラムを除いて再試行
        await db
          .update(schema.userServices)
          .set({ ...baseSet, ...detailCols, tags })
          .where(eq(schema.userServices.id, data.id));
      } catch (err) {
        if (!isMissingColumn(err)) throw err;
        // 0058 未適用環境: 体験詳細カラムを除いて再試行
        try {
          await db
            .update(schema.userServices)
            .set({ ...baseSet, tags })
            .where(eq(schema.userServices.id, data.id));
        } catch (err2) {
          if (!isMissingColumn(err2)) throw err2;
          // 0055 (tags) ごと未適用な最古環境
          await db
            .update(schema.userServices)
            .set(baseSet)
            .where(eq(schema.userServices.id, data.id));
        }
      }
    }
    revalidateServicePaths(user.id);
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
  const tags = buildTags([]);
  let inserted: { id: string }[];
  try {
    inserted = await db
      .insert(schema.userServices)
      .values({ ...baseValues, ...detailCols, ...planCols, tags })
      .returning({ id: schema.userServices.id });
  } catch (errPlan) {
    if (!isMissingColumn(errPlan)) throw errPlan;
    try {
      // 0083 未適用環境: plan カラムを除いて再試行
      inserted = await db
        .insert(schema.userServices)
        .values({ ...baseValues, ...detailCols, tags })
        .returning({ id: schema.userServices.id });
    } catch (err) {
      if (!isMissingColumn(err)) throw err;
      // 0058 未適用環境: 体験詳細カラムを除いて再試行
      try {
        inserted = await db
          .insert(schema.userServices)
          .values({ ...baseValues, tags })
          .returning({ id: schema.userServices.id });
      } catch (err2) {
        if (!isMissingColumn(err2)) throw err2;
        // 0055 (tags) ごと未適用な最古環境
        inserted = await db
          .insert(schema.userServices)
          .values(baseValues)
          .returning({ id: schema.userServices.id });
      }
    }
  }

  revalidateServicePaths(user.id);
  return { ok: true, data: { id: inserted[0]!.id } };
}

/** サービス変更で影響するページの再検証。v2 の /experts・トップ (ISR) も含む。 */
function revalidateServicePaths(userId: string): void {
  revalidatePath('/settings/services');
  revalidatePath(`/users/${userId}`);
  revalidatePath('/services');
  revalidatePath('/france');
  revalidatePath('/experts');
  revalidatePath(`/experts/${userId}`);
  revalidatePath('/');
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

  revalidateServicePaths(user.id);
  return { ok: true };
}
