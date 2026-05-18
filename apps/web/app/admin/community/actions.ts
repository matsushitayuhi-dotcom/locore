'use server';

import 'server-only';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireEditor } from '@/lib/auth/require-user';
import {
  KIND_BASE_PATH,
  type CommunityKind,
  type CommunityStatus,
} from '@/lib/community/constants';

/**
 * editor 専用: コミュニティ投稿の公開状態を操作する。
 *
 * community_posts には deletedAt カラムが無いので、status enum で論理状態を表現:
 *   - 公開 (publish):   status='active'   (closed / expired から戻す場合に使う)
 *   - 非公開 (unpublish): status='closed'  (投稿者の意思で締め切った扱い)
 *   - 削除 (delete):    status='expired' + closedAt=now()
 *     ※ purchases などの FK 候補がないテーブルだが、応募メッセージ等の
 *       履歴を壊さないため物理削除はしない。
 *
 * status enum の値だけでは「投稿者が締め切った」「editor が削除した」が
 * 区別できないが、editor 操作は監査ログでフォローする方針 (本タスクの範囲外)。
 */

const idSchema = z.object({ id: z.string().uuid() });

export type CommunityActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/** 該当 kind のリスト & 詳細、admin、region 系を一括 revalidate */
function revalidateCommunitySurfaces(postId: string, kind: CommunityKind) {
  revalidatePath('/admin/community');
  revalidatePath('/admin');
  const base = KIND_BASE_PATH[kind];
  if (base) {
    revalidatePath(base);
    revalidatePath(`${base}/${postId}`);
  }
  revalidatePath('/explore');
  revalidatePath('/expat');
}

async function loadCommunityPost(id: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: schema.communityPosts.id,
      kind: schema.communityPosts.kind,
      status: schema.communityPosts.status,
      authorId: schema.communityPosts.authorId,
    })
    .from(schema.communityPosts)
    .where(eq(schema.communityPosts.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// =============================================================================
// 公開
// =============================================================================

/**
 * 投稿を募集中 (active) に戻す。
 * - closed / expired のいずれからでも遷移可
 * - すでに active なら no-op
 */
export async function publishCommunityPost(
  input: unknown,
): Promise<CommunityActionResult> {
  const editor = await requireEditor();
  if (!editor) return { ok: false, error: '編集者ロールが必要です' };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正な投稿 ID です' };

  const post = await loadCommunityPost(parsed.data.id);
  if (!post) return { ok: false, error: '投稿が見つかりません' };
  if ((post.status as CommunityStatus) === 'active') {
    return { ok: true, message: 'すでに公開中です' };
  }

  const db = getDb();
  try {
    await db
      .update(schema.communityPosts)
      .set({
        status: 'active',
        // 復活時は closedAt をクリアして「再オープン」を示す
        closedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.communityPosts.id, parsed.data.id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `公開失敗: ${msg}` };
  }

  revalidateCommunitySurfaces(parsed.data.id, post.kind as CommunityKind);
  return { ok: true, message: '投稿を公開しました' };
}

// =============================================================================
// 非公開
// =============================================================================

/**
 * 投稿を非公開 (closed) にする。
 * - 一覧からは消えるが、URL 直叩きやプロフィール経由の閲覧は別途検討
 * - closedAt にタイムスタンプを記録
 */
export async function unpublishCommunityPost(
  input: unknown,
): Promise<CommunityActionResult> {
  const editor = await requireEditor();
  if (!editor) return { ok: false, error: '編集者ロールが必要です' };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正な投稿 ID です' };

  const post = await loadCommunityPost(parsed.data.id);
  if (!post) return { ok: false, error: '投稿が見つかりません' };
  if ((post.status as CommunityStatus) === 'closed') {
    return { ok: true, message: 'すでに非公開です' };
  }
  if ((post.status as CommunityStatus) === 'expired') {
    return { ok: false, error: '削除済みの投稿です' };
  }

  const db = getDb();
  const now = new Date();
  try {
    await db
      .update(schema.communityPosts)
      .set({ status: 'closed', closedAt: now, updatedAt: now })
      .where(eq(schema.communityPosts.id, parsed.data.id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `非公開化失敗: ${msg}` };
  }

  revalidateCommunitySurfaces(parsed.data.id, post.kind as CommunityKind);
  return { ok: true, message: '投稿を非公開にしました' };
}

// =============================================================================
// 削除 (soft delete)
// =============================================================================

/**
 * 投稿を論理削除する。
 * - status='expired' + closedAt=now() で「期限切れ」扱いにする
 * - 物理削除は禁止 (deletedAt カラム無し / 関連メッセージ等の保全)
 * - 復活は Supabase Studio で status を 'active' に戻す
 */
export async function softDeleteCommunityPost(
  input: unknown,
): Promise<CommunityActionResult> {
  const editor = await requireEditor();
  if (!editor) return { ok: false, error: '編集者ロールが必要です' };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '不正な投稿 ID です' };

  const post = await loadCommunityPost(parsed.data.id);
  if (!post) return { ok: false, error: '投稿が見つかりません' };
  if ((post.status as CommunityStatus) === 'expired') {
    return { ok: true, message: 'すでに削除済みです' };
  }

  const db = getDb();
  const now = new Date();
  try {
    await db
      .update(schema.communityPosts)
      .set({ status: 'expired', closedAt: now, updatedAt: now })
      .where(eq(schema.communityPosts.id, parsed.data.id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `削除失敗: ${msg}` };
  }

  revalidateCommunitySurfaces(parsed.data.id, post.kind as CommunityKind);
  return { ok: true, message: '投稿を削除しました' };
}
