'use server';

import { z } from 'zod';
import { eq, and, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { runMockModeration } from '@/lib/moderation/mock';
import {
  hasPaywallMarker,
  splitBodyByPaywall,
} from '@/lib/editor/paywallMarker';

/**
 * Phase C: 入力の body にペイウォール境界（<hr data-paywall>）が含まれる場合、
 * サーバ側でも保険として body / bodyPaid に分割する。
 *
 * - 通常はクライアント (WizardShell) が既に分割して送るのでここは no-op。
 * - 万一 combined HTML がそのまま届いても、境界より前を body、後を bodyPaid にする。
 * - 境界が無ければ data をそのまま返す（従来どおり全文 body）。
 *
 * data.body は in-place で書き換えず、新しいオブジェクトを返す（zod parsed の不変性維持）。
 */
function normalizePaywallSplit<
  T extends { body?: string; bodyPaid?: string | null },
>(data: T): T {
  if (data.body === undefined || !hasPaywallMarker(data.body)) return data;
  const { free, paid } = splitBodyByPaywall(data.body);
  return { ...data, body: free, bodyPaid: paid || null };
}

// ---------- 共通 ----------

// 0 = 無料記事 (アンロックフローを通すが課金しない)。
// 「記事は無料で出して、サービスで稼ぐ」パターンを許容するため 0 を含める。
const PRICE_OPTIONS = [0, 300, 500, 800, 1000, 1500, 2000, 3000, 5000] as const;
type PriceOption = (typeof PRICE_OPTIONS)[number];

// クリエイターランクによる価格上限は 2026-05 に撤廃。
// 現在は手数料率の差として扱う（writer_profiles.commission_rate_pct）。

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

const photoEntrySchema = z.object({
  imageUrl: z.string().url(),
  caption: z.string().max(500).default(''),
  locationName: z.string().max(200).nullable().optional(),
  spotId: z.string().uuid().nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  position: z.number().int().min(0).max(20),
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
  /** 写真ジャーナル記事のエントリ（articleType='photo_journal' 用） */
  photoEntries: z.array(photoEntrySchema).max(10).optional(),
  priceJpy: z
    .number()
    .int()
    .refine((v) => (PRICE_OPTIONS as readonly number[]).includes(v), {
      message: '無効な価格です',
    })
    .optional(),
  durationType: z.enum(['half_day', 'full_day', 'few_hours', 'other']).optional(),
  articleType: z
    .enum(['spot_guide', 'itinerary', 'expat_info'])
    .optional(),
  /** 本文スタイル。'photo_journal' (default) or 'classic' */
  bodyStyle: z.enum(['photo_journal', 'classic']).optional(),
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
  const data = normalizePaywallSplit(parsed.data);
  const { user, db } = await assertOwnership(data.id);

  // 価格上限は 2026-05 に撤廃済み。Tier の差は手数料率で扱う。
  void user;

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
  if (data.photoEntries !== undefined) {
    patch.photoEntries = data.photoEntries ?? [];
  }
  if (data.priceJpy !== undefined) patch.priceJpy = data.priceJpy as PriceOption;
  if (data.durationType !== undefined) patch.durationType = data.durationType;
  if (data.articleType !== undefined) patch.articleType = data.articleType;
  if (data.bodyStyle !== undefined) patch.bodyStyle = data.bodyStyle;
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
  const data = normalizePaywallSplit(parsed.data);
  const { user, db } = await assertOwnership(data.id);

  if (data.priceJpy != null) {
    // 価格上限は 2026-05 に撤廃済み。全 Tier で PRICE_OPTIONS 全部選択可。
    void user;
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
  if (data.photoEntries !== undefined) {
    patch.photoEntries = data.photoEntries ?? [];
  }
  if (data.priceJpy !== undefined) patch.priceJpy = data.priceJpy as PriceOption;
  if (data.durationType !== undefined) patch.durationType = data.durationType;
  if (data.articleType !== undefined) patch.articleType = data.articleType;
  if (data.bodyStyle !== undefined) patch.bodyStyle = data.bodyStyle;
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
  const data = normalizePaywallSplit(parsed.data);
  const { user, db } = await assertOwnership(data.id);

  if (data.priceJpy != null) {
    // 価格上限は 2026-05 に撤廃済み。全 Tier で PRICE_OPTIONS 全部選択可。
    void user;
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
  if (data.photoEntries !== undefined) {
    patch.photoEntries = data.photoEntries ?? [];
  }
  if (data.priceJpy !== undefined) patch.priceJpy = data.priceJpy as PriceOption;
  if (data.durationType !== undefined) patch.durationType = data.durationType;
  if (data.articleType !== undefined) patch.articleType = data.articleType;
  if (data.bodyStyle !== undefined) patch.bodyStyle = data.bodyStyle;
  if (data.tags !== undefined) patch.tags = data.tags;
  if (data.coverImageUrl !== undefined) patch.coverImageUrl = data.coverImageUrl ?? null;
  if (data.cityId !== undefined) patch.cityId = data.cityId;

  await db.update(schema.articles).set(patch).where(eq(schema.articles.id, data.id));

  revalidatePath(`/writer/articles/${data.id}/edit`);
  revalidatePath(`/writer/articles/${data.id}/preview`);
  revalidatePath('/writer/articles');
  return { ok: true, data: { savedAt: Date.now() } };
}

/**
 * 公開アクション。
 *
 * 2026-05 改修 (#16): 予約公開に対応。`scheduledAt` を渡すと、即時公開ではなく
 * `publishedAt = scheduledAt` の future date で **status='draft'** のまま保存する。
 *
 *  - lib/articles/published.ts は `status='published'` でフィルタしているため、
 *    予約公開中の記事は読み手側のフィードに出ない。
 *  - 予約日時に達したあとの「自動公開」cron は MVP では未実装。実運用では
 *    予約日時を過ぎたら手動で改めて publishArticle({ articleId }) を叩く想定。
 *    （別案: scheduledAt 専用カラム+status='scheduled' でも良いが、MVP は publishedAt+future の hack で対応）
 *
 * 後方互換のため、文字列の articleId をそのまま渡しても従来通り「即時公開」する。
 */
export async function publishArticle(
  input: string | { articleId: string; scheduledAt?: string | null },
): Promise<
  ActionResult<{
    finalScore: number;
    action: 'pass' | 'warned' | 'held';
    /** 予約公開扱いなら true */
    scheduled: boolean;
  }>
> {
  const articleId = typeof input === 'string' ? input : input.articleId;
  const scheduledAtRaw =
    typeof input === 'string' ? null : input.scheduledAt ?? null;

  // scheduledAt のバリデーション: future date のみ受け付ける
  let scheduledAt: Date | null = null;
  if (scheduledAtRaw) {
    const t = new Date(scheduledAtRaw);
    if (Number.isNaN(t.getTime())) {
      return { ok: false, error: '予約日時の形式が正しくありません' };
    }
    // 多少のズレを許容（現在時刻 - 1 分以前は不可）
    if (t.getTime() < Date.now() - 60_000) {
      return {
        ok: false,
        error: '予約日時は未来の日時を指定してください',
      };
    }
    scheduledAt = t;
  }

  const { article, db } = await assertOwnership(articleId);

  // 最新の article データを取得してモデレーション
  const rows = await db
    .select({
      title: schema.articles.title,
      body: schema.articles.body,
      bodyStyle: schema.articles.bodyStyle,
      photoEntries: schema.articles.photoEntries,
      tags: schema.articles.tags,
    })
    .from(schema.articles)
    .where(eq(schema.articles.id, article.id))
    .limit(1);
  if (rows.length === 0) return { ok: false, error: '記事が見つかりません' };
  const a = rows[0]!;

  if (!a.title.trim()) {
    return { ok: false, error: 'タイトル: 1 文字以上で入力してください' };
  }

  // 本文要件: クラシックは 30 字以上、フォト日記は写真 1 枚以上。
  // MOC 期間中は短い投稿でも公開できる方が「すぐ試せる」体験になるため、
  // 旧 100 字制限を 30 字に緩和。十分短ければそもそも fail させない選択もある。
  if (a.bodyStyle === 'photo_journal') {
    const photos = Array.isArray(a.photoEntries) ? a.photoEntries : [];
    if (photos.length < 1) {
      return {
        ok: false,
        error: '写真ギャラリー: 1 枚以上アップロードしてください',
      };
    }
  } else {
    // 2026-05 改修: 本文は HTML 保存になったので、タグを除いた純粋テキストで判定。
    const plain = a.body.replace(/<[^>]*>/g, '').trim();
    if (plain.length < 30) {
      return {
        ok: false,
        error: `本文: 30 文字以上で入力してください (現在 ${plain.length} 文字)`,
      };
    }
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

  const isScheduled = scheduledAt != null;

  await db
    .update(schema.articles)
    .set({
      // 予約公開のときは status='draft' のまま publishedAt のみ未来日時に。
      // 即時公開のときは従来通り status='published'。
      status: isScheduled ? 'draft' : 'published',
      warned: isWarned,
      moderationScore: moderation.finalScore,
      publishedAt: isScheduled ? scheduledAt! : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.articles.id, article.id));

  revalidatePath(`/writer/articles/${article.id}/edit`);
  revalidatePath(`/writer/articles/${article.id}/preview`);
  revalidatePath('/writer/articles');
  return {
    ok: true,
    data: {
      finalScore: moderation.finalScore,
      action: moderation.action,
      scheduled: isScheduled,
    },
  };
}

/**
 * 公開済み記事の価格だけを更新する軽量アクション (#17)。
 *
 * - status='published' でも変更可（saveDraftArticle の経路では公開済みの場合の確認モーダルを
 *   個別に出したくなかったため分離）
 * - 購入済み読者の閲覧には影響しない（purchases.price_jpy は購入時点の値を保持）
 *
 * @param input.articleId
 * @param input.priceJpy 新しい価格（整数）。クリエイターは自由に設定可
 */
const updatePriceSchema = z.object({
  articleId: z.string().uuid(),
  priceJpy: z.number().int().min(0).max(99999),
});

export async function updateArticlePrice(input: unknown): Promise<ActionResult> {
  const parsed = updatePriceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const data = parsed.data;
  const { db } = await assertOwnership(data.articleId);

  await db
    .update(schema.articles)
    .set({ priceJpy: data.priceJpy, updatedAt: new Date() })
    .where(eq(schema.articles.id, data.articleId));

  revalidatePath(`/writer/articles/${data.articleId}/edit`);
  revalidatePath(`/writer/articles/${data.articleId}/preview`);
  revalidatePath(`/articles/${data.articleId}`);
  revalidatePath('/writer/articles');
  return { ok: true };
}

// ---------- 共有プレビュートークン ----------

/**
 * プレビュー共有用 magic-link トークンを発行する。
 *
 * - UUID v4 を `crypto.randomUUID()` で生成
 * - 有効期限は 14 日後
 * - 既に token が発行済みでも上書きする（「再発行」相当）
 *
 * 認可: assertOwnership と同じく writer 本人 or editor のみ。
 *
 * @returns 成功時は token と expiresAt を返す。クライアントはこれをもとに
 *   `${origin}/preview/${token}` の URL を組み立てる。
 */
export async function generatePreviewToken(
  articleId: string,
): Promise<ActionResult<{ token: string; expiresAt: string }>> {
  const { article, db } = await assertOwnership(articleId);
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await db
    .update(schema.articles)
    .set({
      previewToken: token,
      previewTokenExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.articles.id, article.id));

  revalidatePath(`/writer/articles/${article.id}/edit`);
  return { ok: true, data: { token, expiresAt: expiresAt.toISOString() } };
}

/**
 * 共有プレビュートークンを無効化する（リンクを失効させる）。
 * 単に preview_token / expires_at を NULL に戻すだけ。
 */
export async function revokePreviewToken(
  articleId: string,
): Promise<ActionResult> {
  const { article, db } = await assertOwnership(articleId);
  await db
    .update(schema.articles)
    .set({
      previewToken: null,
      previewTokenExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.articles.id, article.id));

  revalidatePath(`/writer/articles/${article.id}/edit`);
  return { ok: true };
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

/**
 * 想定居住エリアの座標バウンド (フランス本土)。
 *
 * 現状フラグ算出のみで rejection には使っていない (`void inFrance` 参照)。
 * クライアント側 SpotEditor のバウンドと一致させること
 * (`apps/web/components/writer/SpotEditor.tsx`)。
 */
const FRANCE_BOUNDS = { lat: [41, 51] as const, lng: [-5, 10] as const };

/**
 * 0057_spot_description_tip 未適用環境で description / tip 列が無いことに起因する
 * 「column ... does not exist」エラーかどうかを判定する。
 * これに該当する場合のみ、その 2 列を外して書き込みをリトライする。
 */
function isMissingDescTipColumn(e: unknown): boolean {
  const msg =
    typeof e === 'object' && e !== null && 'message' in e
      ? String((e as { message: unknown }).message)
      : String(e);
  return (
    /does not exist/i.test(msg) &&
    /\b(description|tip)\b/i.test(msg)
  );
}

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
  /** スポット単位の説明文（複数行・任意） */
  description: z.string().trim().max(2000).optional().nullable(),
  /** スポット単位の「コツ」（1〜数行・任意） */
  tip: z.string().trim().max(600).optional().nullable(),
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
  googlePhotoUrls: z
    .array(z.string().url().max(2048))
    .max(10)
    .optional()
    .nullable(),
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
  const inFrance =
    data.location.lat >= FRANCE_BOUNDS.lat[0] &&
    data.location.lat <= FRANCE_BOUNDS.lat[1] &&
    data.location.lng >= FRANCE_BOUNDS.lng[0] &&
    data.location.lng <= FRANCE_BOUNDS.lng[1];
  // inFrance フラグは UI で使う想定（現状ログのみ）
  void inFrance;

  // スポット単位の説明文・コツ（0057 未適用環境では列が無いので別扱い）。
  // 空文字は NULL に正規化する。
  const descTip = {
    description: data.description?.trim() ? data.description.trim() : null,
    tip: data.tip?.trim() ? data.tip.trim() : null,
  };

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
    googlePhotoUrls: data.googlePhotoUrls ?? null,
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
    const baseSet = {
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
    };
    try {
      await db
        .update(schema.spots)
        .set({ ...baseSet, ...descTip })
        .where(eq(schema.spots.id, data.id));
    } catch (e) {
      // 0057 未適用（description / tip 列なし）→ それらを外して再実行
      if (isMissingDescTipColumn(e)) {
        await db
          .update(schema.spots)
          .set(baseSet)
          .where(eq(schema.spots.id, data.id));
      } else {
        throw e;
      }
    }
    revalidatePath(`/writer/articles/${data.articleId}/edit`);
    return { ok: true, data: { id: data.id } };
  }

  const baseValues = {
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
  };
  let inserted: { id: string }[];
  try {
    inserted = await db
      .insert(schema.spots)
      .values({ ...baseValues, ...descTip })
      .returning({ id: schema.spots.id });
  } catch (e) {
    // 0057 未適用（description / tip 列なし）→ それらを外して再実行
    if (isMissingDescTipColumn(e)) {
      inserted = await db
        .insert(schema.spots)
        .values(baseValues)
        .returning({ id: schema.spots.id });
    } else {
      throw e;
    }
  }

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
