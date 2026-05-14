'use server';

import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import {
  COMMUNITY_KINDS,
  PRICE_UNITS,
  DEFAULT_EXPIRY_DAYS,
  metadataSchemaForKind,
  KIND_BASE_PATH,
  type CommunityKind,
} from './constants';

/**
 * コミュニティ投稿 (求人 / アパート / 売買 / 募集 / レッスン / 助け合い) の Server Actions。
 *
 * 設計上の注意:
 *   - 個人情報（電話番号、私用メール、SNS ID 等）の本文埋め込みを検知して警告
 *   - 連絡は Locore メッセージ機能を推奨。直接連絡を強制しない
 *   - 投稿者だけが close / 編集できる（RLS が DB 側でも保証）
 */

export type CommunityActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; reason?: string };

// =============================================================================
// 個人情報の埋め込みチェック（仲介プラットフォーム性質を保つガード）
// =============================================================================
const PHONE_RE = /(?:\+?\d[\s\-()]?){9,}/; // 9 桁以上連続する数字
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const WHATSAPP_RE = /(whatsapp|line[\s:\-]+id|telegram)/i;

function detectContactLeak(text: string): string | null {
  if (EMAIL_RE.test(text)) return 'メールアドレスを本文に含めないでください';
  if (PHONE_RE.test(text)) return '電話番号を本文に含めないでください';
  if (WHATSAPP_RE.test(text)) {
    return 'LINE / WhatsApp / Telegram の ID を本文に書かないでください';
  }
  return null;
}

// =============================================================================
// 共通 create
// =============================================================================

const createBaseSchema = z.object({
  kind: z.enum(COMMUNITY_KINDS),
  title: z.string().trim().min(4).max(140),
  body: z.string().trim().min(20).max(8000),
  cityId: z.string().uuid().optional().nullable(),
  locationText: z.string().trim().max(140).optional().nullable(),
  priceAmount: z.number().int().min(0).max(99_999_999).optional().nullable(),
  priceCurrency: z.string().trim().max(8).optional().nullable(),
  priceUnit: z.enum(PRICE_UNITS).optional().nullable(),
  photos: z.array(z.string().url()).max(12).optional(),
  contactMethod: z.enum(['locore_message']).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export async function createCommunityPost(
  input: unknown,
): Promise<CommunityActionResult<{ id: string; path: string }>> {
  const parsed = createBaseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? '入力内容に不備があります',
    };
  }
  const { kind, title, body } = parsed.data;

  // 個人情報埋め込みチェック
  const leak =
    detectContactLeak(title) || detectContactLeak(body);
  if (leak) {
    return {
      ok: false,
      reason: 'contact_leak',
      error: `${leak}（個人情報の保護のため、連絡は Locore メッセージ機能を通してやり取りしてください）`,
    };
  }

  // kind 固有メタの検証
  const metaSchema = metadataSchemaForKind(kind);
  const metaParsed = metaSchema.safeParse(parsed.data.metadata);
  if (!metaParsed.success) {
    return {
      ok: false,
      error: `${kind} の必須情報が不足しています: ${
        metaParsed.error.errors[0]?.message ?? ''
      }`,
    };
  }

  const me = await requireUser();
  const db = getDb();

  // 期限を kind 別デフォルトで自動設定
  const expiresAt = new Date(
    Date.now() + DEFAULT_EXPIRY_DAYS[kind] * 24 * 60 * 60 * 1000,
  );

  const inserted = await db
    .insert(schema.communityPosts)
    .values({
      kind,
      authorId: me.id,
      title,
      body,
      cityId: parsed.data.cityId ?? null,
      locationText: parsed.data.locationText ?? null,
      priceAmount: parsed.data.priceAmount ?? null,
      priceCurrency: parsed.data.priceCurrency ?? 'EUR',
      priceUnit: parsed.data.priceUnit ?? null,
      photos: parsed.data.photos ?? [],
      contactMethod: parsed.data.contactMethod ?? 'locore_message',
      metadata: metaParsed.data,
      status: 'active',
      expiresAt,
    })
    .returning({ id: schema.communityPosts.id });

  const id = inserted[0]!.id;
  const path = `${KIND_BASE_PATH[kind]}/${id}`;
  revalidatePath(KIND_BASE_PATH[kind]);
  revalidatePath(path);
  return { ok: true, data: { id, path } };
}

// =============================================================================
// 締切 / 取り下げ
// =============================================================================

const closeSchema = z.object({
  id: z.string().uuid(),
});

export async function closeCommunityPost(
  input: unknown,
): Promise<CommunityActionResult> {
  const parsed = closeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const me = await requireUser();
  const db = getDb();

  // 自分の投稿のみ閉じられる（RLS でも担保されているが二重ガード）
  const rows = await db
    .update(schema.communityPosts)
    .set({ status: 'closed', closedAt: new Date() })
    .where(
      and(
        eq(schema.communityPosts.id, parsed.data.id),
        eq(schema.communityPosts.authorId, me.id),
      ),
    )
    .returning({ id: schema.communityPosts.id, kind: schema.communityPosts.kind });

  const row = rows[0];
  if (!row) return { ok: false, error: '対象の投稿が見つかりませんでした' };

  const basePath = KIND_BASE_PATH[row.kind as CommunityKind];
  revalidatePath(basePath);
  revalidatePath(`${basePath}/${parsed.data.id}`);
  return { ok: true };
}

// =============================================================================
// 再公開（closed → active に戻す）
// =============================================================================

export async function reopenCommunityPost(
  input: unknown,
): Promise<CommunityActionResult> {
  const parsed = closeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const me = await requireUser();
  const db = getDb();

  const rows = await db
    .update(schema.communityPosts)
    .set({
      status: 'active',
      closedAt: null,
      // 再公開時は期限を 14 日延長
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    })
    .where(
      and(
        eq(schema.communityPosts.id, parsed.data.id),
        eq(schema.communityPosts.authorId, me.id),
      ),
    )
    .returning({ id: schema.communityPosts.id, kind: schema.communityPosts.kind });

  const row = rows[0];
  if (!row) return { ok: false, error: '対象の投稿が見つかりませんでした' };
  const basePath = KIND_BASE_PATH[row.kind as CommunityKind];
  revalidatePath(basePath);
  revalidatePath(`${basePath}/${parsed.data.id}`);
  return { ok: true };
}

// =============================================================================
// 削除
// =============================================================================

export async function deleteCommunityPost(
  input: unknown,
): Promise<CommunityActionResult> {
  const parsed = closeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正なリクエスト' };
  const me = await requireUser();
  const db = getDb();

  const rows = await db
    .delete(schema.communityPosts)
    .where(
      and(
        eq(schema.communityPosts.id, parsed.data.id),
        eq(schema.communityPosts.authorId, me.id),
      ),
    )
    .returning({ kind: schema.communityPosts.kind });

  const row = rows[0];
  if (!row) return { ok: false, error: '対象の投稿が見つかりませんでした' };
  const basePath = KIND_BASE_PATH[row.kind as CommunityKind];
  revalidatePath(basePath);
  return { ok: true };
}

// =============================================================================
// 応募メッセージ送信（chat_threads に接続）
// =============================================================================

const applySchema = z.object({
  postId: z.string().uuid(),
  message: z.string().trim().min(10).max(2000),
});

/**
 * 応募 / 連絡を Locore メッセージで送る。
 * 投稿者と現在のユーザーで chat thread を見つける / 作成 → 初回メッセージ。
 *
 * lib/chat/actions.ts の startDirectThread に委譲する形にしてもよいが、
 * ここでは MVP として直接書き起こす（重複してもよい）。
 */
export async function applyToCommunityPost(
  input: unknown,
): Promise<CommunityActionResult<{ threadId: string }>> {
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: '応募メッセージは 10 文字以上にしてください' };
  }
  const leak = detectContactLeak(parsed.data.message);
  if (leak) {
    return {
      ok: false,
      reason: 'contact_leak',
      error: `${leak}（最初のやり取りでは連絡先を出さないことを推奨します）`,
    };
  }
  const me = await requireUser();
  const db = getDb();

  // 投稿の作者を確認
  const postRows = await db
    .select({
      id: schema.communityPosts.id,
      kind: schema.communityPosts.kind,
      authorId: schema.communityPosts.authorId,
      title: schema.communityPosts.title,
      status: schema.communityPosts.status,
    })
    .from(schema.communityPosts)
    .where(eq(schema.communityPosts.id, parsed.data.postId))
    .limit(1);
  const post = postRows[0];
  if (!post) return { ok: false, error: '対象の投稿が見つかりませんでした' };
  if (post.status !== 'active') {
    return { ok: false, error: 'この投稿は締切られているため応募できません' };
  }
  if (post.authorId === me.id) {
    return { ok: false, error: '自分の投稿には応募できません' };
  }

  // 1:1 スレッドを見つける or 作る
  const pairKey = [me.id, post.authorId].sort().join(':');
  let threadId: string;
  const existing = await db
    .select({ id: schema.chatThreads.id })
    .from(schema.chatThreads)
    .where(eq(schema.chatThreads.directPairKey, pairKey))
    .limit(1);
  if (existing[0]) {
    threadId = existing[0].id;
  } else {
    const created = await db
      .insert(schema.chatThreads)
      .values({ directPairKey: pairKey })
      .returning({ id: schema.chatThreads.id });
    threadId = created[0]!.id;
    // メンバー追加
    await db.insert(schema.chatThreadMembers).values([
      { threadId, userId: me.id },
      { threadId, userId: post.authorId },
    ]);
  }

  // 「【{投稿名}】への応募」を冒頭に付ける
  const body = `【${post.title} への応募】\n\n${parsed.data.message}`;
  await db.insert(schema.chatMessages).values({
    threadId,
    senderId: me.id,
    body,
  });
  await db
    .update(schema.chatThreads)
    .set({ lastMessageAt: new Date() })
    .where(eq(schema.chatThreads.id, threadId));

  revalidatePath(`/chat/${threadId}`);
  return { ok: true, data: { threadId } };
}
