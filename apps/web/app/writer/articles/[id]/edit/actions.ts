'use server';

import { z } from 'zod';
import { eq, and, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { runMockModeration } from '@/lib/moderation/mock';

// ---------- 共通 ----------

const PRICE_OPTIONS = [300, 500, 800, 1000, 1500, 2000, 3000, 5000] as const;
type PriceOption = (typeof PRICE_OPTIONS)[number];

const TIER_PRICE_CAPS: Record<'S' | 'A' | 'B', number> = {
  S: 5000, // 上限なし扱い（PRD §6.4.3）。ここでは select 上限と一致させる
  A: 3000,
  B: 1000,
};

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

async function assertOwnership(articleId: string) {
  const user = await requireUser();
  const db = getDb();
  const rows = await db
    .select({
      id: schema.articles.id,
      writerId: schema.articles.writerId,
      status: schema.articles.status,
    })
    .from(schema.articles)
    .where(eq(schema.articles.id, articleId))
    .limit(1);
  if (rows.length === 0) throw new Error('記事が見つかりません');
  const article = rows[0]!;
  if (article.writerId !== user.id && user.role !== 'editor') {
    throw new Error('権限がありません');
  }
  return { user, article, db };
}

async function getWriterTier(userId: string): Promise<'S' | 'A' | 'B'> {
  const db = getDb();
  const rows = await db
    .select({ tier: schema.writerProfiles.tier })
    .from(schema.writerProfiles)
    .where(eq(schema.writerProfiles.userId, userId))
    .limit(1);
  return (rows[0]?.tier ?? 'B') as 'S' | 'A' | 'B';
}

// ---------- 記事本体 ----------

const itineraryBlockSchema = z.object({
  id: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  spotId: z.string().uuid().nullable().optional(),
  freeName: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  transportToNext: z
    .enum(['walk', 'metro', 'bus', 'taxi', 'bike', 'train', 'other'])
    .nullable()
    .optional(),
  transportNote: z.string().max(200).nullable().optional(),
  travelMinutesAfter: z
    .number()
    .int()
    .min(0)
    .max(24 * 60)
    .nullable()
    .optional(),
});

const updateArticleSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  /** 無料プレビュー本文（Markdown） */
  body: z.string().max(20000).optional(),
  /** 有料部分本文（Markdown）。空文字 → null として扱う */
  bodyPaid: z.string().max(40000).optional().nullable(),
  /** 旅程プラン記事の構造化ブロック（articleType='itinerary' 用） */
  itineraryBlocks: z.array(itineraryBlockSchema).max(60).optional().nullable(),
  priceJpy: z
    .number()
    .int()
    .refine((v) => (PRICE_OPTIONS as readonly number[]).includes(v), {
      message: '無効な価格です',
    })
    .optional(),
  durationType: z.enum(['half_day', 'full_day', 'few_hours', 'other']).optional(),
  articleType: z.enum(['spot_guide', 'itinerary']).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  coverImageUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  cityId: z.string().uuid().optional(),
});

export async function updateArticle(input: unknown): Promise<ActionResult> {
  const parsed = updateArticleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const data = parsed.data;
  const { user, db } = await assertOwnership(data.id);

  // Tier 上限チェック
  if (data.priceJpy != null) {
    const tier = await getWriterTier(user.id);
    const cap = TIER_PRICE_CAPS[tier];
    if (data.priceJpy > cap) {
      return {
        ok: false,
        error: `あなたの Tier (${tier}) では ¥${cap.toLocaleString('ja-JP')} までの価格設定が可能です`,
        fieldErrors: { priceJpy: [`上限 ¥${cap.toLocaleString('ja-JP')}`] },
      };
    }
  }

  const patch: Partial<typeof schema.articles.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (data.title !== undefined) patch.title = data.title;
  if (data.body !== undefined) patch.body = data.body;
  if (data.bodyPaid !== undefined) {
    // 空文字は NULL にする（旧フォールバックを有効化したまま）
    patch.bodyPaid = data.bodyPaid && data.bodyPaid.trim() ? data.bodyPaid : null;
  }
  if (data.itineraryBlocks !== undefined) {
    patch.itineraryBlocks =
      data.itineraryBlocks && data.itineraryBlocks.length > 0
        ? data.itineraryBlocks
        : null;
  }
  if (data.priceJpy !== undefined) patch.priceJpy = data.priceJpy as PriceOption;
  if (data.durationType !== undefined) patch.durationType = data.durationType;
  if (data.articleType !== undefined) patch.articleType = data.articleType;
  if (data.tags !== undefined) patch.tags = data.tags;
  if (data.coverImageUrl !== undefined) patch.coverImageUrl = data.coverImageUrl ?? null;
  if (data.cityId !== undefined) patch.cityId = data.cityId;

  await db.update(schema.articles).set(patch).where(eq(schema.articles.id, data.id));

  revalidatePath(`/writer/articles/${data.id}/edit`);
  revalidatePath(`/writer/articles/${data.id}/preview`);
  revalidatePath('/writer/articles');
  return { ok: true };
}

/**
 * 自動保存用の軽量 Server Action。
 * - Toast やリダイレクトはクライアント側で抑制（戻り値の savedAt のみ表示）
 * - 公開中の警告 confirm はスキップ（連続保存のため）
 * - 認可と検証は updateArticle と同じ
 */
const autoSaveSchema = updateArticleSchema.extend({});

export async function autoSaveArticle(input: unknown): Promise<
  ActionResult<{ savedAt: number }>
> {
  const parsed = autoSaveSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const data = parsed.data;
  const { user, db } = await assertOwnership(data.id);

  if (data.priceJpy != null) {
    const tier = await getWriterTier(user.id);
    const cap = TIER_PRICE_CAPS[tier];
    if (data.priceJpy > cap) {
      return {
        ok: false,
        error: `Tier (${tier}) の上限 ¥${cap.toLocaleString('ja-JP')} を超えています`,
      };
    }
  }

  const patch: Partial<typeof schema.articles.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (data.title !== undefined) patch.title = data.title;
  if (data.body !== undefined) patch.body = data.body;
  if (data.bodyPaid !== undefined) {
    patch.bodyPaid = data.bodyPaid && data.bodyPaid.trim() ? data.bodyPaid : null;
  }
  if (data.itineraryBlocks !== undefined) {
    // null or 空配列のときは NULL として保存（以後 spot_guide に戻したケース）
    patch.itineraryBlocks =
      data.itineraryBlocks && data.itineraryBlocks.length > 0
        ? data.itineraryBlocks
        : null;
  }
  if (data.priceJpy !== undefined) patch.priceJpy = data.priceJpy as PriceOption;
  if (data.durationType !== undefined) patch.durationType = data.durationType;
  if (data.articleType !== undefined) patch.articleType = data.articleType;
  if (data.tags !== undefined) patch.tags = data.tags;
  if (data.coverImageUrl !== undefined) patch.coverImageUrl = data.coverImageUrl ?? null;
  if (data.cityId !== undefined) patch.cityId = data.cityId;

  await db.update(schema.articles).set(patch).where(eq(schema.articles.id, data.id));
  // 自動保存では revalidatePath を呼ばない（プレビュー画面に副作用を出さない）
  return { ok: true, data: { savedAt: Date.now() } };
}

/**
 * 明示的「下書き保存」アクション。
 * 自動保存と中身は同じだが、UI 側で debounce を待たずに即時呼び出す用途。
 * revalidatePath は走らせる（明示保存後はプレビュー側も最新にしたい）。
 */
export async function saveDraftArticle(input: unknown): Promise<
  ActionResult<{ savedAt: number }>
> {
  const parsed = autoSaveSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const data = parsed.data;
  const { user, db } = await assertOwnership(data.id);

  if (data.priceJpy != null) {
    const tier = await getWriterTier(user.id);
    const cap = TIER_PRICE_CAPS[tier];
    if (data.priceJpy > cap) {
      return {
        ok: false,
        error: `Tier (${tier}) の上限 ¥${cap.toLocaleString('ja-JP')} を超えています`,
      };
    }
  }

  const patch: Partial<typeof schema.articles.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (data.title !== undefined) patch.title = data.title;
  if (data.body !== undefined) patch.body = data.body;
  if (data.bodyPaid !== undefined) {
    patch.bodyPaid = data.bodyPaid && data.bodyPaid.trim() ? data.bodyPaid : null;
  }
  if (data.itineraryBlocks !== undefined) {
    // null or 空配列のときは NULL として保存（以後 spot_guide に戻したケース）
    patch.itineraryBlocks =
      data.itineraryBlocks && data.itineraryBlocks.length > 0
        ? data.itineraryBlocks
        : null;
  }
  if (data.priceJpy !== undefined) patch.priceJpy = data.priceJpy as PriceOption;
  if (data.durationType !== undefined) patch.durationType = data.durationType;
  if (data.articleType !== undefined) patch.articleType = data.articleType;
  if (data.tags !== undefined) patch.tags = data.tags;
  if (data.coverImageUrl !== undefined) patch.coverImageUrl = data.coverImageUrl ?? null;
  if (data.cityId !== undefined) patch.cityId = data.cityId;

  await db.update(schema.articles).set(patch).where(eq(schema.articles.id, data.id));

  revalidatePath(`/writer/articles/${data.id}/edit`);
  revalidatePath(`/writer/articles/${data.id}/preview`);
  revalidatePath('/writer/articles');
  return { ok: true, data: { savedAt: Date.now() } };
}

export async function publishArticle(articleId: string): Promise<ActionResult<{
  finalScore: number;
  action: 'pass' | 'warned' | 'held';
}>> {
  const { article, db } = await assertOwnership(articleId);

  // 最新の article データを取得してモデレーション
  const rows = await db
    .select({
      title: schema.articles.title,
      body: schema.articles.body,
      tags: schema.articles.tags,
    })
    .from(schema.articles)
    .where(eq(schema.articles.id, article.id))
    .limit(1);
  if (rows.length === 0) return { ok: false, error: '記事が見つかりません' };
  const a = rows[0]!;

  if (!a.title.trim() || a.body.trim().length < 100) {
    return {
      ok: false,
      error: '本文は 100 文字以上必要です。タイトルと本文を確認してください。',
    };
  }

  const moderation = runMockModeration({
    title: a.title,
    body: a.body,
    tags: a.tags,
  });

  // モデレーション履歴を記録
  await db.insert(schema.articleModerationScores).values({
    articleId: article.id,
    touristScore: moderation.touristScore,
    visualScore: moderation.visualScore,
    textScore: moderation.textScore,
    finalScore: moderation.finalScore,
    action: moderation.action,
    textBreakdown: moderation.breakdown,
  });

  // 編集者ホールド機能は撤廃。モデレーションが warned/held でも常に published に。
  //  - warned: published + warned=true（注意マーカーは残す）
  //  - held: published + warned=true（強い警告として extends warned）
  //  - pass: published
  const isWarned =
    moderation.action === 'warned' || moderation.action === 'held';

  await db
    .update(schema.articles)
    .set({
      status: 'published',
      warned: isWarned,
      moderationScore: moderation.finalScore,
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.articles.id, article.id));

  revalidatePath(`/writer/articles/${article.id}/edit`);
  revalidatePath(`/writer/articles/${article.id}/preview`);
  revalidatePath('/writer/articles');
  return {
    ok: true,
    data: { finalScore: moderation.finalScore, action: moderation.action },
  };
}

export async function unpublishArticle(articleId: string): Promise<ActionResult> {
  const { db, article } = await assertOwnership(articleId);
  await db
    .update(schema.articles)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(schema.articles.id, article.id));

  revalidatePath(`/writer/articles/${article.id}/edit`);
  revalidatePath('/writer/articles');
  return { ok: true };
}

// ---------- スポット ----------

const PARIS_BOUNDS = { lat: [48.7, 48.95] as const, lng: [2.2, 2.5] as const };

const upsertSpotSchema = z.object({
  id: z.string().uuid().optional(),
  articleId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(300),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  category: z.enum(['food', 'sight', 'shopping', 'lodging', 'other']).optional(),
  priceEstimate: z.string().trim().max(100).optional(),
  openingHours: z.any().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  position: z.number().int().min(0).default(0),
  googlePlaceId: z.string().trim().min(1).max(255).optional().nullable(),
  // ----- Google Places 詳細（picker から流れてくる） -----
  phoneNumber: z.string().trim().max(50).optional().nullable(),
  website: z.string().trim().url().max(2048).optional().nullable(),
  googleRating: z.number().min(0).max(5).optional().nullable(),
  googleUserRatingsTotal: z.number().int().min(0).optional().nullable(),
  googlePriceLevel: z.number().int().min(0).max(4).optional().nullable(),
  googleTypes: z.array(z.string()).optional().nullable(),
});

export async function upsertSpot(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = upsertSpotSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const data = parsed.data;
  const { db } = await assertOwnership(data.articleId);

  // パリ範囲外は警告だがブロックしない（範囲チェックはラフ運用）
  const inParis =
    data.location.lat >= PARIS_BOUNDS.lat[0] &&
    data.location.lat <= PARIS_BOUNDS.lat[1] &&
    data.location.lng >= PARIS_BOUNDS.lng[0] &&
    data.location.lng <= PARIS_BOUNDS.lng[1];
  // inParis フラグは UI で使う想定（現状ログのみ）
  void inParis;

  // 共通の Place 詳細フィールド
  const placeDetails = {
    phoneNumber: data.phoneNumber ?? null,
    website: data.website ?? null,
    googleRating:
      typeof data.googleRating === 'number'
        ? data.googleRating.toFixed(1)
        : null,
    googleUserRatingsTotal: data.googleUserRatingsTotal ?? null,
    googlePriceLevel: data.googlePriceLevel ?? null,
    googleTypes: data.googleTypes ?? null,
  };

  if (data.id) {
    // 既存 spot 更新（記事 ID 一致確認）
    const existing = await db
      .select({ id: schema.spots.id, articleId: schema.spots.articleId })
      .from(schema.spots)
      .where(eq(schema.spots.id, data.id))
      .limit(1);
    if (existing.length === 0 || existing[0]!.articleId !== data.articleId) {
      return { ok: false, error: 'スポットが見つかりません' };
    }
    await db
      .update(schema.spots)
      .set({
        name: data.name,
        address: data.address,
        location: data.location,
        category: data.category,
        priceEstimate: data.priceEstimate,
        openingHours: data.openingHours ?? null,
        tags: data.tags,
        position: data.position,
        googlePlaceId: data.googlePlaceId ?? null,
        ...placeDetails,
        updatedAt: new Date(),
      })
      .where(eq(schema.spots.id, data.id));
    revalidatePath(`/writer/articles/${data.articleId}/edit`);
    return { ok: true, data: { id: data.id } };
  }

  const inserted = await db
    .insert(schema.spots)
    .values({
      articleId: data.articleId,
      name: data.name,
      address: data.address,
      location: data.location,
      category: data.category,
      priceEstimate: data.priceEstimate,
      openingHours: data.openingHours ?? null,
      tags: data.tags,
      position: data.position,
      googlePlaceId: data.googlePlaceId ?? null,
      ...placeDetails,
    })
    .returning({ id: schema.spots.id });

  revalidatePath(`/writer/articles/${data.articleId}/edit`);
  return { ok: true, data: { id: inserted[0]!.id } };
}

export async function deleteSpot(input: {
  articleId: string;
  spotId: string;
}): Promise<ActionResult> {
  const { db } = await assertOwnership(input.articleId);
  await db
    .delete(schema.spots)
    .where(and(eq(schema.spots.id, input.spotId), eq(schema.spots.articleId, input.articleId)));
  revalidatePath(`/writer/articles/${input.articleId}/edit`);
  return { ok: true };
}

const reorderSchema = z.object({
  articleId: z.string().uuid(),
  ordered: z.array(z.object({ id: z.string().uuid(), position: z.number().int().min(0) })),
});

export async function reorderSpots(input: unknown): Promise<ActionResult> {
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: '不正なリクエスト' };
  }
  const { db } = await assertOwnership(parsed.data.articleId);
  // シンプルに 1 件ずつ UPDATE（並び替え件数は 1 桁想定）
  for (const row of parsed.data.ordered) {
    await db
      .update(schema.spots)
      .set({ position: row.position, updatedAt: new Date() })
      .where(
        and(eq(schema.spots.id, row.id), eq(schema.spots.articleId, parsed.data.articleId)),
      );
  }
  revalidatePath(`/writer/articles/${parsed.data.articleId}/edit`);
  return { ok: true };
}

// ---------- 動画埋め込み ----------

const addVideoSchema = z.object({
  articleId: z.string().uuid(),
  platform: z.enum(['tiktok', 'instagram', 'youtube', 'x', 'other']),
  embedUrl: z.string().trim().url().max(2048),
});

export async function addVideo(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = addVideoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const data = parsed.data;
  const { db } = await assertOwnership(data.articleId);

  // 末尾に追加するための position 計算
  const existing = await db
    .select({ position: schema.articleVideos.position })
    .from(schema.articleVideos)
    .where(eq(schema.articleVideos.articleId, data.articleId))
    .orderBy(asc(schema.articleVideos.position));
  const nextPos = (existing[existing.length - 1]?.position ?? -1) + 1;

  const inserted = await db
    .insert(schema.articleVideos)
    .values({
      articleId: data.articleId,
      platform: data.platform,
      embedUrl: data.embedUrl,
      position: nextPos,
    })
    .returning({ id: schema.articleVideos.id });

  revalidatePath(`/writer/articles/${data.articleId}/edit`);
  return { ok: true, data: { id: inserted[0]!.id } };
}

export async function removeVideo(input: {
  articleId: string;
  videoId: string;
}): Promise<ActionResult> {
  const { db } = await assertOwnership(input.articleId);
  await db
    .delete(schema.articleVideos)
    .where(
      and(
        eq(schema.articleVideos.id, input.videoId),
        eq(schema.articleVideos.articleId, input.articleId),
      ),
    );
  revalidatePath(`/writer/articles/${input.articleId}/edit`);
  return { ok: true };
}
